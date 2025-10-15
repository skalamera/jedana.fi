'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePortfolioStore } from '@/stores/portfolio-store'
import { PortfolioSummary } from '@/components/portfolio/portfolio-summary'
import { AssetList } from '@/components/portfolio/asset-list'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { PortfolioAsset } from '@/types'

export function PortfolioDashboard() {
    const { portfolio, isLoading, error, refreshPortfolio } = usePortfolioStore()

    // State for tracking expanded groups
    const [expandedGroups, setExpandedGroups] = useState({
        crypto: false,
        etf: false,
        stock: false,
        manual: false
    })

    const toggleGroup = (group: 'crypto' | 'etf' | 'stock' | 'manual') => {
        setExpandedGroups(prev => ({
            ...prev,
            [group]: !prev[group]
        }))
    }

    useEffect(() => {
        refreshPortfolio()
    }, [refreshPortfolio])

    // Group assets by type and calculate totals
    // Cryptocurrencies: Kraken crypto assets OR manual assets with crypto type
    const cryptoAssets = portfolio?.assets.filter(asset =>
        (asset.source === 'kraken' && !asset.symbol.endsWith('.EQ')) ||
        (asset.source === 'manual' && asset.asset_type === 'crypto')
    ) || []

    // Helper function to check if asset is an ETF
    const isETF = (asset: PortfolioAsset) => {
        const knownETFs = new Set([
            'VOO', 'IVV', 'SPY', 'VTI', 'QQQ', 'VUG', 'VEA', 'IEFA', 'VTV', 'BND', 'AGG', 'GLD', 'IWF', 'VGT', 'IEMG', 'VXUS', 'VWO', 'IJH', 'VIG', 'IBIT', 'XLK', 'SPLG', 'VO', 'IJR', 'ITOT', 'RSP', 'BNDX', 'SCHD', 'IWM', 'VB', 'EFA', 'IVW', 'VYM', 'QQQM', 'IWD', 'IAU', 'SCHX', 'SGOV', 'VCIT', 'VT', 'XLF', 'QUAL', 'SCHF', 'SCHG', 'VEU', 'IXUS', 'TLT', 'VV', 'IWR', 'SPYG', 'IWB', 'MBB', 'BIL', 'IVE', 'JEPI', 'DIA', 'VTEB', 'MUB', 'VCSH', 'BSV', 'DFAC', 'IEF', 'SCHB', 'XLV', 'DGRO', 'SMH', 'JPST', 'VGIT', 'VNQ', 'ARKK', 'BOTZ', 'CLOU', 'HERO', 'BUG', 'CIBR', 'LIT', 'ICLN', 'HACK', 'XYLD', 'PFF', 'TLH', 'OEF', 'IOO', 'FTEC', 'RYSPX', 'XSD', 'XBI', 'IHI', 'PSP', 'CQQQ', 'GXC', 'TIP', 'VCLT', 'EDV', 'BKLN', 'SHV', 'USFR', 'KRE', 'PEJ', 'SIL', 'PALL', 'SQQQ', 'TQQQ', 'VRTX', 'VHT', 'VIS', 'VDE', 'XLY', 'XLP', 'XLI', 'XLB', 'XLU', 'ETHU', 'ETHA'
        ])
        return knownETFs.has(asset.symbol.replace('.EQ', ''))
    }

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
        return (
            <div className="flex justify-end items-start space-x-6">
                {/* Total Value Section */}
                <div className="text-right">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {formatShare(metrics.shareOfTotal)} of total
                    </div>
                    <div className="text-lg md:text-xl font-bold" style={{ color: accentColor }}>
                        {formatCurrency(metrics.value)}
                    </div>
                </div>

                {/* Daily P&L Section */}
                <div className="text-right min-w-[100px]">
                    <div className={`text-xs text-gray-500 dark:text-gray-400 mb-1`}>
                        Daily P&L
                    </div>
                    <div className={`text-lg md:text-xl font-semibold ${getPnLClass(metrics.dailyPnL)}`}>
                        {formatCurrency(metrics.dailyPnL)}
                    </div>
                    <div className={`text-xs ${getPnLClass(metrics.dailyPnL)}`}>
                        {formatShare(metrics.dailyPnLPercentage)}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Portfolio Summary */}
            <PortfolioSummary portfolio={portfolio} isLoading={isLoading} />

            {/* Asset Sections */}
            <div className="space-y-4 md:space-y-6">
                {/* Cryptocurrencies Section */}
                {cryptoAssets.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-700 shadow-sm rounded-xl border-2 border-teal-300 dark:border-teal-600" style={{ borderColor: 'var(--crypto-primary)' }}>
                        <div className="p-4 md:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={() => toggleGroup('crypto')}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                    >
                                        {expandedGroups.crypto ? (
                                            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                        )}
                                    </button>
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'var(--crypto-primary)' }}></div>
                                    <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">
                                        Cryptocurrencies ({cryptoAssets.length})
                                    </h3>
                                </div>
                                <div className="flex items-end justify-between sm:justify-end space-x-4 w-full sm:w-auto">
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
                    <div className="bg-gray-50 dark:bg-gray-700 shadow-sm rounded-xl border-2 border-indigo-300 dark:border-indigo-600" style={{ borderColor: 'var(--etf-primary, #6366f1)' }}>
                        <div className="p-4 md:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={() => toggleGroup('etf')}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                    >
                                        {expandedGroups.etf ? (
                                            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                        )}
                                    </button>
                                    <div className="w-4 h-4 rounded-full bg-indigo-500"></div>
                                    <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">
                                        ETFs ({etfAssets.length})
                                    </h3>
                                </div>
                                <div className="flex items-end justify-between sm:justify-end space-x-4 w-full sm:w-auto">
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
                    <div className="bg-gray-50 dark:bg-gray-700 shadow-sm rounded-xl border-2 border-purple-300 dark:border-purple-600" style={{ borderColor: 'var(--stock-primary)' }}>
                        <div className="p-4 md:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={() => toggleGroup('stock')}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                    >
                                        {expandedGroups.stock ? (
                                            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                        )}
                                    </button>
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'var(--stock-primary)' }}></div>
                                    <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">
                                        Stocks ({stockAssets.length})
                                    </h3>
                                </div>
                                <div className="flex items-end justify-between sm:justify-end space-x-4 w-full sm:w-auto">
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
                    <div className="bg-gray-50 dark:bg-gray-700 shadow-sm rounded-xl border-2 border-blue-300 dark:border-blue-600" style={{ borderColor: 'var(--manual-primary)' }}>
                        <div className="p-4 md:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={() => toggleGroup('manual')}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                    >
                                        {expandedGroups.manual ? (
                                            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                        )}
                                    </button>
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'var(--manual-primary)' }}></div>
                                    <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">
                                        Manual Assets ({manualAssets.length})
                                    </h3>
                                </div>
                                <div className="flex items-end justify-between sm:justify-end space-x-4 w-full sm:w-auto">
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
