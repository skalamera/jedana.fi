import { TrendingUp, TrendingDown, Edit, Trash2 } from 'lucide-react'
import type { PortfolioAsset } from '@/types'
import { usePortfolioStore } from '@/stores/portfolio-store'
import { useState } from 'react'

interface AssetListProps {
    assets: PortfolioAsset[]
    group?: 'cash' | 'crypto' | 'stock' | 'manual'
}

export function AssetList({ assets, group = 'crypto' }: AssetListProps) {
    const { updateAssetCostBasis, deleteManualAsset, portfolio } = usePortfolioStore()

    // Helper function to check if asset is cash/stablecoin
    const isCash = (asset: PortfolioAsset) => {
        const cashAssets = new Set(['ZUSD', 'USD', 'USDT', 'USDC', 'DAI', 'BUSD'])
        return cashAssets.has(asset.symbol.replace('.EQ', ''))
    }

    // Helper function to format display symbol
    const getDisplaySymbol = (asset: PortfolioAsset) => {
        let symbol = asset.symbol

        // Remove .EQ suffix for stocks and ETFs
        if (symbol.endsWith('.EQ')) {
            symbol = symbol.replace('.EQ', '')
        }

        // Remove X prefix for Kraken crypto assets
        if (asset.source === 'kraken' && !symbol.endsWith('.EQ') && symbol.startsWith('X')) {
            symbol = symbol.substring(1)
        }

        return symbol
    }

    // Calculate allocation percentage for this asset
    const getAllocationPercentage = (asset: PortfolioAsset) => {
        if (!portfolio?.totalValue || portfolio.totalValue === 0) return 0
        return (asset.value / portfolio.totalValue) * 100
    }

    // Identify if an asset is an ETF
    const isETF = (asset: PortfolioAsset) => {
        // Common ETF tickers
        const knownETFs = new Set([
            'VOO', 'IVV', 'SPY', 'VTI', 'QQQ', 'VUG', 'VEA', 'IEFA', 'VTV', 'BND', 'AGG', 'GLD', 'IWF', 'VGT', 'IEMG', 'VXUS', 'VWO', 'IJH', 'VIG', 'IBIT', 'XLK', 'SPLG', 'VO', 'IJR', 'ITOT', 'RSP', 'BNDX', 'SCHD', 'IWM', 'VB', 'EFA', 'IVW', 'VYM', 'QQQM', 'IWD', 'IAU', 'SCHX', 'SGOV', 'VCIT', 'VT', 'XLF', 'QUAL', 'SCHF', 'SCHG', 'VEU', 'IXUS', 'TLT', 'VV', 'IWR', 'SPYG', 'IWB', 'MBB', 'BIL', 'IVE', 'JEPI', 'DIA', 'VTEB', 'MUB', 'VCSH', 'BSV', 'DFAC', 'IEF', 'SCHB', 'XLV', 'DGRO', 'SMH', 'JPST', 'VGIT', 'VNQ', 'ARKK', 'BOTZ', 'CLOU', 'HERO', 'BUG', 'CIBR', 'LIT', 'ICLN', 'HACK', 'XYLD', 'PFF', 'TLH', 'OEF', 'IOO', 'FTEC', 'RYSPX', 'XSD', 'XBI', 'IHI', 'PSP', 'CQQQ', 'GXC', 'TIP', 'VCLT', 'EDV', 'BKLN', 'SHV', 'USFR', 'KRE', 'PEJ', 'SIL', 'PALL', 'SQQQ', 'TQQQ', 'VHT', 'VIS', 'VDE', 'XLY', 'XLP', 'XLI', 'XLB', 'XLU', 'ETHU', 'ETHA'
        ])

        // Check if symbol is a known ETF
        if (knownETFs.has(asset.symbol.replace('.EQ', ''))) {
            return true
        }

        // Check if name contains ETF indicators
        const name = asset.name.toLowerCase()
        return name.includes('etf') || name.includes('trust') || name.includes('fund') ||
            name.includes('spdr') || name.includes('ishares') || name.includes('vanguard') ||
            name.includes('invesco') || name.includes('proshares')
    }

    // Get color scheme based on group
    const getColorScheme = () => {
        switch (group) {
            case 'crypto':
                return {
                    primary: 'var(--crypto-primary)',
                    secondary: 'var(--crypto-secondary)',
                    accent: 'var(--crypto-accent)',
                    border: 'border-teal-200 dark:border-teal-800',
                    hoverBorder: 'hover:border-teal-300 dark:hover:border-teal-700'
                }
            case 'stock':
                return {
                    primary: 'var(--stock-primary)',
                    secondary: 'var(--stock-secondary)',
                    accent: 'var(--stock-accent)',
                    border: 'border-orange-200 dark:border-orange-800',
                    hoverBorder: 'hover:border-orange-300 dark:hover:border-orange-700'
                }
            case 'manual':
                return {
                    primary: 'var(--manual-primary)',
                    secondary: 'var(--manual-secondary)',
                    accent: 'var(--manual-accent)',
                    border: 'border-blue-200 dark:border-blue-800',
                    hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-700'
                }
            default:
                return {
                    primary: 'var(--crypto-primary)',
                    secondary: 'var(--crypto-secondary)',
                    accent: 'var(--crypto-accent)',
                    border: 'border-gray-200 dark:border-gray-700',
                    hoverBorder: 'hover:border-gray-300 dark:hover:border-gray-600'
                }
        }
    }

    const colors = getColorScheme()

    const formatCurrency = (value: number | undefined) => {
        if (value === undefined || isNaN(value)) {
            return '$0.00'
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(value)
    }

    const formatPercentage = (value: number | undefined) => {
        if (value === undefined || isNaN(value)) {
            return '—'
        }
        const sign = value >= 0 ? '+' : ''
        return `${sign}${value.toFixed(2)}%`
    }


    const handleCostBasisUpdate = async (asset: PortfolioAsset, newCostBasis: number) => {
        const assetType = asset.symbol.endsWith('.EQ') ? 'equity' : 'crypto'
        await updateAssetCostBasis(asset.symbol, assetType, newCostBasis)
    }

    // State for editing cost basis
    const [editingCostBasis, setEditingCostBasis] = useState<string | null>(null)
    const [editCostBasisValue, setEditCostBasisValue] = useState('')
    // State for delete confirmation
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

    const startEditCostBasis = (asset: PortfolioAsset) => {
        setEditingCostBasis(asset.symbol)
        setEditCostBasisValue(asset.costBasis.toString())
    }

    const saveCostBasis = async (asset: PortfolioAsset) => {
        const newCostBasis = parseFloat(editCostBasisValue)
        if (!isNaN(newCostBasis) && newCostBasis >= 0) {
            await handleCostBasisUpdate(asset, newCostBasis)
        }
        setEditingCostBasis(null)
        setEditCostBasisValue('')
    }

    const cancelEditCostBasis = () => {
        setEditingCostBasis(null)
        setEditCostBasisValue('')
    }

    return (
        <div className="space-y-3">
            {assets.map((asset) => {
                const isPositivePnL = asset.dailyPnL !== undefined && asset.dailyPnL >= 0
                const hasUnrealizedPnL = asset.unrealizedPnL !== undefined && asset.unrealizedPnL !== 0
                const dailyPct = typeof asset.dailyPnLPercentage === 'number' && !isNaN(asset.dailyPnLPercentage)
                    ? asset.dailyPnLPercentage
                    : 0

                return (
                    <div key={asset.symbol} className="bg-gradient-to-br from-white to-gray-50/30 dark:from-gray-800 dark:to-gray-900/50 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 border-2 overflow-hidden" style={{
                        borderColor: colors.primary
                    } as React.CSSProperties}>
                        {/* Asset Header */}
                        <div className="px-5 py-4 border-b-2 border-gray-100 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col space-y-1">
                                    <h4 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">
                                        {getDisplaySymbol(asset)}
                                    </h4>
                                    <div className="flex items-center space-x-0.5">
                                        {asset.source === 'kraken' && (
                                            <img
                                                src="/kraken_logo.svg"
                                                alt="Kraken"
                                                className="w-4 h-4"
                                            />
                                        )}
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isCash(asset)
                                                ? 'text-emerald-800 dark:text-emerald-300'
                                                : asset.symbol.endsWith('.EQ') && !isETF(asset)
                                                    ? 'text-purple-800 dark:text-purple-300'
                                                    : asset.symbol.endsWith('.EQ') && isETF(asset)
                                                        ? 'text-indigo-800 dark:text-indigo-300'
                                                        : asset.source === 'kraken'
                                                            ? 'text-blue-800 dark:text-blue-300'
                                                            : asset.asset_type === 'crypto'
                                                                ? 'text-teal-800 dark:text-teal-300'
                                                                : (asset.asset_type === 'equity' || asset.asset_type === 'manual') && isETF(asset)
                                                                    ? 'text-indigo-800 dark:text-indigo-300'
                                                                    : asset.asset_type === 'equity'
                                                                        ? 'text-orange-800 dark:text-orange-300'
                                                                        : asset.asset_type === 'manual' && isETF(asset)
                                                                            ? 'text-indigo-800 dark:text-indigo-300'
                                                                            : 'text-gray-800 dark:text-gray-300'
                                            }`}>
                                            {isCash(asset)
                                                ? 'Cash'
                                                : asset.symbol.endsWith('.EQ')
                                                    ? (isETF(asset) ? 'ETF' : 'Stock')
                                                    : asset.source === 'kraken' && !asset.symbol.endsWith('.EQ')
                                                        ? 'Crypto'
                                                        : asset.asset_type === 'crypto'
                                                            ? 'Crypto'
                                                            : (asset.asset_type === 'equity' || asset.asset_type === 'manual') && isETF(asset)
                                                                ? 'ETF'
                                                                : asset.asset_type === 'equity'
                                                                    ? 'Stock'
                                                                    : asset.asset_type === 'manual' && isETF(asset)
                                                                        ? 'ETF'
                                                                        : 'Manual'
                                            }
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    {/* Top-right actions */}
                                    <div className="flex justify-end mb-2">
                                        {asset.source === 'manual' && asset.manualId && (
                                            confirmDeleteId === asset.manualId ? (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            await deleteManualAsset(asset.manualId!)
                                                            setConfirmDeleteId(null)
                                                        }}
                                                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm"
                                                    >
                                                        Confirm
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmDeleteId(null)}
                                                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirmDeleteId(asset.manualId!)}
                                                    className="inline-flex items-center p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    title="Delete manual asset"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )
                                        )}
                                    </div>

                                    <div className="text-base font-mono font-bold text-gray-900 dark:text-white mb-1">
                                        {asset.balance.toFixed(6)}
                                    </div>
                                    <div className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/50 px-2.5 py-1 rounded-full">
                                        <img
                                            src="/allocation_logo.svg"
                                            alt="Allocation"
                                            className="w-3.5 h-3.5"
                                        />
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                            {getAllocationPercentage(asset).toFixed(2)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {asset.note && (
                                <div className="text-xs mt-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                                    {asset.note}
                                </div>
                            )}
                        </div>

                        {/* All Asset Data in One Section */}
                        <div className="p-5">
                            {/* Primary Metrics Grid */}
                            <div className={`grid gap-4 mb-5 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50 ${group === 'cash' ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'
                                }`}>
                                {/* Price */}
                                <div className="text-center">
                                    <div className="text-xs font-bold uppercase tracking-wider mb-2 text-gray-600 dark:text-gray-400">
                                        Price
                                    </div>
                                    <div className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(asset.currentPrice)}
                                    </div>
                                </div>

                                {/* Value */}
                                <div className="text-center">
                                    <div className="text-xs font-bold uppercase tracking-wider mb-2 text-gray-600 dark:text-gray-400">
                                        Value
                                    </div>
                                    <div className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(asset.value)}
                                    </div>
                                </div>

                                {/* Cost Basis - Hide for cash */}
                                {group !== 'cash' && (
                                    <div className="text-center">
                                        <div className="text-xs font-bold uppercase tracking-wider mb-2 text-gray-600 dark:text-gray-400">
                                            Cost Basis
                                        </div>
                                        {editingCostBasis === asset.symbol ? (
                                            <div className="space-y-2">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={editCostBasisValue}
                                                    onChange={(e) => setEditCostBasisValue(e.target.value)}
                                                    className="w-full max-w-24 px-2 py-1 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    autoFocus
                                                />
                                                <div className="flex justify-center space-x-1">
                                                    <button
                                                        onClick={() => saveCostBasis(asset)}
                                                        className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={cancelEditCostBasis}
                                                        className="px-3 py-1 text-xs font-medium bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center space-x-1.5">
                                                <div className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                                                    {formatCurrency(asset.costBasis)}
                                                </div>
                                                <button
                                                    onClick={() => startEditCostBasis(asset)}
                                                    className="p-1 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 transition-colors"
                                                    title="Edit cost basis"
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Daily P&L - Hide for cash */}
                                {group !== 'cash' && (
                                    <div className="text-center">
                                        <div className="text-xs font-bold uppercase tracking-wider mb-2 text-gray-600 dark:text-gray-400">
                                            Daily P&L
                                        </div>
                                        <div className={`text-lg md:text-xl font-bold flex items-center justify-center ${isPositivePnL ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {asset.dailyPnL === 0 && asset.symbol.endsWith('.EQ') ? (
                                                <span className="text-gray-400 dark:text-gray-500">—</span>
                                            ) : isPositivePnL ? (
                                                <TrendingUp className="w-4 h-4 mr-1" />
                                            ) : (
                                                <TrendingDown className="w-4 h-4 mr-1" />
                                            )}
                                            {asset.dailyPnL === 0 && asset.symbol.endsWith('.EQ') ? '' : formatCurrency(asset.dailyPnL)}
                                        </div>
                                        <div className={`text-sm ${isPositivePnL ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {asset.dailyPnL === 0 && asset.symbol.endsWith('.EQ') ? (
                                                <span className="text-gray-400 dark:text-gray-500">—</span>
                                            ) : (
                                                formatPercentage(dailyPct)
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Unrealized P&L Section - When Available (Hide for cash) */}
                            {hasUnrealizedPnL && group !== 'cash' && (
                                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <div className="grid grid-cols-2 gap-4 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
                                        <div className="text-center">
                                            <div className="text-xs font-bold uppercase tracking-wider mb-2 text-gray-600 dark:text-gray-400">
                                                UP&L
                                            </div>
                                            <div className={`text-lg md:text-xl font-bold flex items-center justify-center ${asset.unrealizedPnL && asset.unrealizedPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {asset.unrealizedPnL && asset.unrealizedPnL >= 0 ? (
                                                    <TrendingUp className="w-4 h-4 mr-1" />
                                                ) : (
                                                    <TrendingDown className="w-4 h-4 mr-1" />
                                                )}
                                                {formatCurrency(asset.unrealizedPnL)}
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xs font-bold uppercase tracking-wider mb-2 text-gray-600 dark:text-gray-400">
                                                Total %
                                            </div>
                                            <div className={`text-lg md:text-xl font-bold ${asset.unrealizedPnL && asset.unrealizedPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {formatPercentage(asset.unrealizedPnLPercentage)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                )
            })}
        </div>
    )
}
