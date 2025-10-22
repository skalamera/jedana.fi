'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePortfolioStore } from '@/stores/portfolio-store'
import { PortfolioSummary } from '@/components/portfolio/portfolio-summary'
import { AssetList } from '@/components/portfolio/asset-list'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { PortfolioAsset } from '@/types'

export function PortfolioDashboard() {
    const { portfolio, isLoading, error, refreshPortfolio, selectedPortfolioId } = usePortfolioStore()

    // State for tracking expanded groups
    const [expandedGroups, setExpandedGroups] = useState({
        cash: false,
        crypto: false,
        etf: false,
        stock: false,
        manual: false
    })

    const toggleGroup = (group: 'cash' | 'crypto' | 'etf' | 'stock' | 'manual') => {
        setExpandedGroups(prev => ({
            ...prev,
            [group]: !prev[group]
        }))
    }

    useEffect(() => {
        refreshPortfolio()
    }, [refreshPortfolio])

    // Group assets by type and calculate totals

    // Helper function to check if asset is cash/stablecoin
    const isCash = (asset: PortfolioAsset) => {
        const cashAssets = new Set(['ZUSD', 'USD', 'USDT', 'USDC', 'DAI', 'BUSD'])
        return cashAssets.has(asset.symbol.replace('.EQ', ''))
    }

    // Helper function to check if asset is an ETF
    const isETF = (asset: PortfolioAsset) => {
        const knownETFs = new Set([
            'VOO', 'IVV', 'SPY', 'VTI', 'QQQ', 'VUG', 'VEA', 'IEFA', 'VTV', 'BND', 'AGG', 'GLD', 'IWF', 'VGT', 'IEMG', 'VXUS', 'VWO', 'IJH', 'VIG', 'IBIT', 'XLK', 'SPLG', 'VO', 'IJR', 'ITOT', 'RSP', 'BNDX', 'SCHD', 'IWM', 'VB', 'EFA', 'IVW', 'VYM', 'QQQM', 'IWD', 'IAU', 'SCHX', 'SGOV', 'VCIT', 'VT', 'XLF', 'QUAL', 'SCHF', 'SCHG', 'VEU', 'IXUS', 'TLT', 'VV', 'IWR', 'SPYG', 'IWB', 'MBB', 'BIL', 'IVE', 'JEPI', 'DIA', 'VTEB', 'MUB', 'VCSH', 'BSV', 'DFAC', 'IEF', 'SCHB', 'XLV', 'DGRO', 'SMH', 'JPST', 'VGIT', 'VNQ', 'ARKK', 'BOTZ', 'CLOU', 'HERO', 'BUG', 'CIBR', 'LIT', 'ICLN', 'HACK', 'XYLD', 'PFF', 'TLH', 'OEF', 'IOO', 'FTEC', 'RYSPX', 'XSD', 'XBI', 'IHI', 'PSP', 'CQQQ', 'GXC', 'TIP', 'VCLT', 'EDV', 'BKLN', 'SHV', 'USFR', 'KRE', 'PEJ', 'SIL', 'PALL', 'SQQQ', 'TQQQ', 'VHT', 'VIS', 'VDE', 'XLY', 'XLP', 'XLI', 'XLB', 'XLU', 'ETHU', 'ETHA'
        ])
        return knownETFs.has(asset.symbol.replace('.EQ', ''))
    }

    // Cash: ZUSD and other stablecoins/cash
    const cashAssets = portfolio?.assets.filter(asset => isCash(asset)) || []

    // Cryptocurrencies: Kraken crypto assets OR manual assets with crypto type (excluding cash)
    const cryptoAssets = portfolio?.assets.filter(asset =>
        ((asset.source === 'kraken' && !asset.symbol.endsWith('.EQ')) ||
            (asset.source === 'manual' && asset.asset_type === 'crypto')) &&
        !isCash(asset)
    ) || []

    // ETFs: ETF assets (both .EQ and manual)
    const etfAssets = portfolio?.assets.filter(asset =>
        (asset.symbol.endsWith('.EQ') && isETF(asset)) ||
        (asset.source === 'manual' && asset.asset_type === 'equity' && isETF(asset))
    ) || []

    // Regular Stocks: Non-ETF .EQ assets OR manual equity assets that aren't ETFs
    const stockAssets = portfolio?.assets.filter(asset =>
        (asset.symbol.endsWith('.EQ') && !isETF(asset)) ||
        (asset.source === 'manual' && asset.asset_type === 'equity' && !isETF(asset))
    ) || []

    // Manual Assets: Only manual assets with manual type (and only show section if any exist)
    const manualAssets = portfolio?.assets.filter(asset =>
        asset.source === 'manual' && asset.asset_type === 'manual'
    ) || []

    const totalPortfolioValue = portfolio?.totalValue || 0

    const computeGroupMetrics = useMemo(() => {
        return (assets: PortfolioAsset[]) => {
            const value = assets.reduce((sum, asset) => sum + (asset.value || 0), 0)
            const dailyPnL = assets.reduce((sum, asset) => sum + (asset.dailyPnL || 0), 0)
            const previousValue = assets.reduce((sum, asset) => sum + ((asset.value || 0) - (asset.dailyPnL || 0)), 0)
            const dailyPnLPercentage = previousValue > 0 ? (dailyPnL / previousValue) * 100 : 0
            const shareOfTotal = totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0

            return {
                value,
                dailyPnL,
                dailyPnLPercentage,
                shareOfTotal,
            }
        }
    }, [totalPortfolioValue])

    const cashMetrics = computeGroupMetrics(cashAssets)
    const cryptoMetrics = computeGroupMetrics(cryptoAssets)
    const etfMetrics = computeGroupMetrics(etfAssets)
    const stockMetrics = computeGroupMetrics(stockAssets)
    const manualMetrics = computeGroupMetrics(manualAssets)

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Error Loading Portfolio</h3>
                        <div className="mt-2 text-sm text-red-700">
                            <p>{error}</p>
                        </div>
                        <div className="mt-4">
                            <div className="-mx-2 -my-1.5 flex">
                                <button
                                    type="button"
                                    onClick={() => refreshPortfolio()}
                                    className="bg-red-50 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value)
    }

    const formatShare = (value: number) => `${value.toFixed(2)}%`
    const getPnLClass = (value: number) => {
        if (value > 0) return 'text-green-600 dark:text-green-400'
        if (value < 0) return 'text-red-600 dark:text-red-400'
        return 'text-gray-500 dark:text-gray-400'
    }

    const renderCollapsedMetrics = (metrics: ReturnType<typeof computeGroupMetrics>, accentColor: string) => {
        const isPnLPositive = metrics.dailyPnL >= 0
        return (
            <div className="flex justify-end items-center gap-3">
                {/* Total Value Section */}
                <div className="bg-white/50 dark:bg-gray-600/50 backdrop-blur-sm rounded-lg px-4 py-2.5 border border-gray-200 dark:border-gray-600 shadow-sm">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5 uppercase tracking-wide">
                        {formatShare(metrics.shareOfTotal)} of total
                    </div>
                    <div className="text-xl md:text-2xl font-bold" style={{ color: accentColor }}>
                        {formatCurrency(metrics.value)}
                    </div>
                </div>

                {/* Daily P&L Section */}
                <div className={`rounded-lg px-4 py-2.5 border-2 shadow-sm min-w-[140px] ${isPnLPositive
                    ? 'bg-green-50/80 dark:bg-green-900/30 border-green-300 dark:border-green-600'
                    : 'bg-red-50/80 dark:bg-red-900/30 border-red-300 dark:border-red-600'
                    }`}>
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5 uppercase tracking-wide">
                        Daily P&L
                    </div>
                    <div className={`text-xl md:text-2xl font-bold ${getPnLClass(metrics.dailyPnL)}`}>
                        {formatCurrency(metrics.dailyPnL)}
                    </div>
                    <div className={`text-xs font-semibold mt-0.5 ${getPnLClass(metrics.dailyPnL)}`}>
                        {formatShare(metrics.dailyPnLPercentage)}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Portfolio Summary */}
            <PortfolioSummary portfolio={portfolio} isLoading={isLoading} portfolioId={selectedPortfolioId} />

            {/* Asset Sections */}
            <div className="space-y-4 md:space-y-6">
                {/* Cash Section */}
                {cashAssets.length > 0 && (
                    <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 shadow-lg rounded-2xl border-2 overflow-hidden transition-all hover:shadow-xl" style={{ borderColor: '#10b981' }}>
                        <div className="p-5 md:p-7">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={() => toggleGroup('cash')}
                                        className="p-2 hover:bg-gray-200/60 dark:hover:bg-gray-600/60 rounded-lg transition-all duration-200"
                                        aria-label={expandedGroups.cash ? 'Collapse cash' : 'Expand cash'}
                                    >
                                        {expandedGroups.cash ? (
                                            <ChevronDown className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                        ) : (
                                            <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                        )}
                                    </button>
                                    <div className="w-3 h-8 rounded-full shadow-sm bg-emerald-500"></div>
                                    <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                        Cash <span className="text-gray-500 dark:text-gray-400 font-normal">({cashAssets.length})</span>
                                    </h3>
                                </div>
                                <div className="flex items-end justify-between sm:justify-end w-full sm:w-auto">
                                    <div className="flex justify-end items-center gap-3">
                                        {/* Total Value Section - No Daily P&L for cash */}
                                        <div className="bg-white/50 dark:bg-gray-600/50 backdrop-blur-sm rounded-lg px-4 py-2.5 border border-gray-200 dark:border-gray-600 shadow-sm">
                                            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5 uppercase tracking-wide">
                                                {formatShare(cashMetrics.shareOfTotal)} of total
                                            </div>
                                            <div className="text-xl md:text-2xl font-bold text-emerald-500">
                                                {formatCurrency(cashMetrics.value)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {expandedGroups.cash && (
                                <AssetList assets={cashAssets} group="cash" />
                            )}
                        </div>
                    </div>
                )}

                {/* Cryptocurrencies Section */}
                {cryptoAssets.length > 0 && (
                    <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 shadow-lg rounded-2xl border-2 overflow-hidden transition-all hover:shadow-xl" style={{ borderColor: 'var(--crypto-primary)' }}>
                        <div className="p-5 md:p-7">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={() => toggleGroup('crypto')}
                                        className="p-2 hover:bg-gray-200/60 dark:hover:bg-gray-600/60 rounded-lg transition-all duration-200"
                                        aria-label={expandedGroups.crypto ? 'Collapse cryptocurrencies' : 'Expand cryptocurrencies'}
                                    >
                                        {expandedGroups.crypto ? (
                                            <ChevronDown className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                        ) : (
                                            <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                        )}
                                    </button>
                                    <div className="w-3 h-8 rounded-full shadow-sm" style={{ backgroundColor: 'var(--crypto-primary)' }}></div>
                                    <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                        Cryptocurrencies <span className="text-gray-500 dark:text-gray-400 font-normal">({cryptoAssets.length})</span>
                                    </h3>
                                </div>
                                <div className="flex items-end justify-between sm:justify-end w-full sm:w-auto">
                                    {renderCollapsedMetrics(cryptoMetrics, 'var(--crypto-primary)')}
                                </div>
                            </div>
                            {expandedGroups.crypto && (
                                <AssetList assets={cryptoAssets} group="crypto" />
                            )}
                        </div>
                    </div>
                )}

                {/* ETFs Section */}
                {etfAssets.length > 0 && (
                    <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 shadow-lg rounded-2xl border-2 overflow-hidden transition-all hover:shadow-xl" style={{ borderColor: 'var(--etf-primary, #6366f1)' }}>
                        <div className="p-5 md:p-7">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={() => toggleGroup('etf')}
                                        className="p-2 hover:bg-gray-200/60 dark:hover:bg-gray-600/60 rounded-lg transition-all duration-200"
                                        aria-label={expandedGroups.etf ? 'Collapse ETFs' : 'Expand ETFs'}
                                    >
                                        {expandedGroups.etf ? (
                                            <ChevronDown className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                        ) : (
                                            <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                        )}
                                    </button>
                                    <div className="w-3 h-8 rounded-full shadow-sm bg-indigo-500"></div>
                                    <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                        ETFs <span className="text-gray-500 dark:text-gray-400 font-normal">({etfAssets.length})</span>
                                    </h3>
                                </div>
                                <div className="flex items-end justify-between sm:justify-end w-full sm:w-auto">
                                    {renderCollapsedMetrics(etfMetrics, 'var(--etf-primary, #6366f1)')}
                                </div>
                            </div>
                            {expandedGroups.etf && (
                                <AssetList assets={etfAssets} group="stock" />
                            )}
                        </div>
                    </div>
                )}

                {/* Stocks Section */}
                {stockAssets.length > 0 && (
                    <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 shadow-lg rounded-2xl border-2 overflow-hidden transition-all hover:shadow-xl" style={{ borderColor: 'var(--stock-primary)' }}>
                        <div className="p-5 md:p-7">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={() => toggleGroup('stock')}
                                        className="p-2 hover:bg-gray-200/60 dark:hover:bg-gray-600/60 rounded-lg transition-all duration-200"
                                        aria-label={expandedGroups.stock ? 'Collapse stocks' : 'Expand stocks'}
                                    >
                                        {expandedGroups.stock ? (
                                            <ChevronDown className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                        ) : (
                                            <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                        )}
                                    </button>
                                    <div className="w-3 h-8 rounded-full shadow-sm" style={{ backgroundColor: 'var(--stock-primary)' }}></div>
                                    <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                        Stocks <span className="text-gray-500 dark:text-gray-400 font-normal">({stockAssets.length})</span>
                                    </h3>
                                </div>
                                <div className="flex items-end justify-between sm:justify-end w-full sm:w-auto">
                                    {renderCollapsedMetrics(stockMetrics, 'var(--stock-primary)')}
                                </div>
                            </div>
                            {expandedGroups.stock && (
                                <AssetList assets={stockAssets} group="stock" />
                            )}
                        </div>
                    </div>
                )}

                {/* Manual Assets Section */}
                {manualAssets.length > 0 && (
                    <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 shadow-lg rounded-2xl border-2 overflow-hidden transition-all hover:shadow-xl" style={{ borderColor: 'var(--manual-primary)' }}>
                        <div className="p-5 md:p-7">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={() => toggleGroup('manual')}
                                        className="p-2 hover:bg-gray-200/60 dark:hover:bg-gray-600/60 rounded-lg transition-all duration-200"
                                        aria-label={expandedGroups.manual ? 'Collapse manual assets' : 'Expand manual assets'}
                                    >
                                        {expandedGroups.manual ? (
                                            <ChevronDown className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                        ) : (
                                            <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                        )}
                                    </button>
                                    <div className="w-3 h-8 rounded-full shadow-sm" style={{ backgroundColor: 'var(--manual-primary)' }}></div>
                                    <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                        Manual Assets <span className="text-gray-500 dark:text-gray-400 font-normal">({manualAssets.length})</span>
                                    </h3>
                                </div>
                                <div className="flex items-end justify-between sm:justify-end w-full sm:w-auto">
                                    {renderCollapsedMetrics(manualMetrics, 'var(--manual-primary)')}
                                </div>
                            </div>
                            {expandedGroups.manual && (
                                <AssetList assets={manualAssets} group="manual" />
                            )}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {(!portfolio?.assets.length && !isLoading) && (
                    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="p-8 md:p-12">
                            <div className="text-center">
                                <div className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                                    No assets found
                                </div>
                                <div className="text-sm text-gray-400 dark:text-gray-500">
                                    Add some assets in Settings to get started
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
