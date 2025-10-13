'use client'

import { useEffect, useState } from 'react'
import { usePortfolioStore } from '@/stores/portfolio-store'
import { PortfolioSummary } from '@/components/portfolio/portfolio-summary'
import { AssetList } from '@/components/portfolio/asset-list'
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'

export function PortfolioDashboard() {
    const { portfolio, isLoading, error, refreshPortfolio } = usePortfolioStore()

    // State for tracking expanded groups
    const [expandedGroups, setExpandedGroups] = useState({
        crypto: true,
        stock: true,
        manual: true
    })

    const toggleGroup = (group: 'crypto' | 'stock' | 'manual') => {
        setExpandedGroups(prev => ({
            ...prev,
            [group]: !prev[group]
        }))
    }

    useEffect(() => {
        refreshPortfolio()
    }, [refreshPortfolio])

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

    // Group assets by type and calculate totals
    const cryptoAssets = portfolio?.assets.filter(asset => asset.source === 'kraken' && !asset.symbol.endsWith('.EQ')) || []
    const equityAssets = portfolio?.assets.filter(asset => asset.symbol.endsWith('.EQ')) || []
    const manualAssets = portfolio?.assets.filter(asset => asset.source === 'manual') || []

    const cryptoTotal = cryptoAssets.reduce((sum, asset) => sum + asset.value, 0)
    const equityTotal = equityAssets.reduce((sum, asset) => sum + asset.value, 0)
    const manualTotal = manualAssets.reduce((sum, asset) => sum + asset.value, 0)

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value)
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
                                    <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Cryptocurrencies</h3>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end space-x-4">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {cryptoAssets.length} asset{cryptoAssets.length !== 1 ? 's' : ''}
                                    </span>
                                    <span className="text-lg md:text-xl font-bold" style={{ color: 'var(--crypto-primary)' }}>
                                        {formatCurrency(cryptoTotal)}
                                    </span>
                                </div>
                            </div>
                            {expandedGroups.crypto && (
                                <AssetList assets={cryptoAssets} group="crypto" />
                            )}
                        </div>
                    </div>
                )}

                {/* Stocks & ETFs Section */}
                {equityAssets.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-700 shadow-sm rounded-xl border-2 border-orange-300 dark:border-orange-600" style={{ borderColor: 'var(--stock-primary)' }}>
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
                                    <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Stocks & ETFs</h3>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end space-x-4">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {equityAssets.length} asset{equityAssets.length !== 1 ? 's' : ''}
                                    </span>
                                    <span className="text-lg md:text-xl font-bold" style={{ color: 'var(--stock-primary)' }}>
                                        {formatCurrency(equityTotal)}
                                    </span>
                                </div>
                            </div>
                            {expandedGroups.stock && (
                                <AssetList assets={equityAssets} group="stock" />
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
                                    <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Manual Assets</h3>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end space-x-4">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {manualAssets.length} asset{manualAssets.length !== 1 ? 's' : ''}
                                    </span>
                                    <span className="text-lg md:text-xl font-bold" style={{ color: 'var(--manual-primary)' }}>
                                        {formatCurrency(manualTotal)}
                                    </span>
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
