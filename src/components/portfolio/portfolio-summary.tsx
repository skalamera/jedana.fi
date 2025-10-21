import { TrendingUp, TrendingDown, DollarSign, Sparkles, BarChart3, Edit2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { Portfolio } from '@/types'

interface PortfolioSummaryProps {
    portfolio: Portfolio | null
    isLoading: boolean
}

export function PortfolioSummary({ portfolio, isLoading }: PortfolioSummaryProps) {
    const router = useRouter()
    const [spyPerformance, setSpyPerformance] = useState<number | null>(null)
    const [currentSpyPrice, setCurrentSpyPrice] = useState<number | null>(null)
    const [startingSpyPrice, setStartingSpyPrice] = useState<number | null>(null)
    const [isEditingSpyPrice, setIsEditingSpyPrice] = useState(false)
    const [tempSpyPrice, setTempSpyPrice] = useState<string>('')

    // Load starting S&P 500 price from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('startingSpyPrice')
        if (saved) {
            setStartingSpyPrice(parseFloat(saved))
        }
    }, [])

    // Fetch S&P 500 (^GSPC) daily performance using server-side API
    useEffect(() => {
        async function fetchSPYPerformance() {
            try {
                const response = await fetch('/api/fetch-prices', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        symbols: [{ symbol: '^GSPC', assetType: 'equity' }]
                    }),
                })

                if (!response.ok) {
                    console.error('Failed to fetch S&P 500 data')
                    return
                }

                const data = await response.json()
                console.log('API Response:', data)
                console.log('Available price keys:', Object.keys(data.prices || {}))

                // Try different possible keys for the S&P 500 data
                const spyData = data.prices?.['^GSPC'] || data.prices?.['%5EGSPC'] || data.prices?.['^INX'] || data.prices?.['%5EINX'] || data.prices?.[Object.keys(data.prices || {})[0]]
                console.log('S&P 500 Data:', spyData)

                if (spyData && spyData.currentPrice && spyData.previousClose) {
                    const percentChange = ((spyData.currentPrice - spyData.previousClose) / spyData.previousClose) * 100
                    console.log('S&P 500 Data:', {
                        currentPrice: spyData.currentPrice,
                        previousClose: spyData.previousClose,
                        percentChange
                    })
                    setSpyPerformance(percentChange)
                    setCurrentSpyPrice(spyData.currentPrice)

                    // If no starting price is set, default to current price
                    if (startingSpyPrice === null) {
                        setStartingSpyPrice(spyData.currentPrice)
                        localStorage.setItem('startingSpyPrice', spyData.currentPrice.toString())
                    }
                } else {
                    console.error('Invalid S&P 500 data received:', spyData)
                }
            } catch (error) {
                console.error('Failed to fetch S&P 500 performance:', error)
            }
        }

        fetchSPYPerformance()
    }, [startingSpyPrice])

    const handleEditSpyPrice = () => {
        setTempSpyPrice(startingSpyPrice?.toFixed(2) || '')
        setIsEditingSpyPrice(true)
    }

    const handleSaveSpyPrice = () => {
        const newPrice = parseFloat(tempSpyPrice)
        if (!isNaN(newPrice) && newPrice > 0) {
            setStartingSpyPrice(newPrice)
            localStorage.setItem('startingSpyPrice', newPrice.toString())
        }
        setIsEditingSpyPrice(false)
    }

    const handleCancelEdit = () => {
        setIsEditingSpyPrice(false)
        setTempSpyPrice('')
    }

    // Calculate total S&P performance
    const spyTotalPerformance = currentSpyPrice && startingSpyPrice
        ? ((currentSpyPrice - startingSpyPrice) / startingSpyPrice) * 100
        : null

    if (isLoading || !portfolio) {
        return (
            <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <div className="animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-20 bg-gray-200 rounded"></div>
                            ))}
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
        }).format(value)
    }

    const formatPercentage = (value: number) => {
        const sign = value >= 0 ? '+' : ''
        return `${sign}${value.toFixed(2)}%`
    }

    const isPositivePnL = portfolio.totalDailyPnL >= 0
    const hasUnrealized = typeof portfolio.totalUnrealizedPnL === 'number'
        && typeof portfolio.totalCostBasis === 'number'
        && portfolio.totalCostBasis > 0
    const totalUnrealizedPnL = hasUnrealized ? portfolio.totalUnrealizedPnL! : 0
    const totalUnrealizedPnLPercentage = hasUnrealized
        ? (portfolio.totalUnrealizedPnLPercentage ?? ((totalUnrealizedPnL / portfolio.totalCostBasis!) * 100))
        : 0
    const isPositiveUnrealized = totalUnrealizedPnL >= 0

    return (
        <div className="bg-gray-50 dark:bg-gray-700 shadow-sm rounded-xl border border-gray-200 dark:border-gray-600">
            <div className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
                    <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">Portfolio Summary</h3>
                    <div className="flex items-center gap-3">
                        <span className="text-sm md:text-base text-gray-600 dark:text-gray-300">
                            Updated: {new Date(portfolio.lastUpdated).toLocaleDateString()} {new Date(portfolio.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                            onClick={() => router.push('/portfolio-review')}
                            className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 text-white text-sm md:text-base font-medium px-4 py-2 hover:bg-amber-600 shadow"
                            title="AI Portfolio Review"
                            aria-label="AI Portfolio Review"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span className="hidden sm:inline">Review</span>
                        </button>
                    </div>
                </div>

                {/* Desktop: Professional 2-row layout, Mobile: Stack vertically */}
                <div className="space-y-4">
                    {/* Row 1: Total Value & Total S&P Comparison */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                        {/* Total Portfolio Value */}
                        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 dark:from-indigo-700 dark:to-indigo-800 rounded-xl p-4 md:p-6 shadow-lg border border-indigo-500/30">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                                        <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-white" />
                                    </div>
                                </div>
                                <div className="ml-3 md:ml-4 flex-1 min-w-0">
                                    <dt className="text-xs md:text-sm font-medium text-indigo-100 uppercase tracking-wide">
                                        Total Portfolio Value
                                    </dt>
                                    <dd className="text-xl md:text-2xl lg:text-3xl font-bold text-white mt-0.5 md:mt-1 tracking-tight truncate">
                                        {formatCurrency(portfolio.totalValue)}
                                    </dd>
                                </div>
                            </div>
                        </div>

                        {/* Total S&P 500 Comparison */}
                        {spyTotalPerformance !== null && totalUnrealizedPnLPercentage !== undefined && (
                            <div className={`bg-gradient-to-br rounded-xl p-4 md:p-6 shadow-lg border ${totalUnrealizedPnLPercentage > spyTotalPerformance
                                ? 'from-emerald-600 to-emerald-700 dark:from-emerald-700 dark:to-emerald-800 border-emerald-500/30'
                                : totalUnrealizedPnLPercentage < spyTotalPerformance
                                    ? 'from-amber-600 to-amber-700 dark:from-amber-700 dark:to-amber-800 border-amber-500/30'
                                    : 'from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800 border-slate-500/30'
                                }`}>
                                <div className="space-y-3 md:space-y-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                                                <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-white" />
                                            </div>
                                        </div>
                                        <div className="ml-3 md:ml-4 flex-1 min-w-0">
                                            <dt className="text-xs md:text-sm font-medium text-white/90 uppercase tracking-wide">
                                                Total vs S&P 500
                                            </dt>
                                            <dd className="text-lg md:text-xl lg:text-2xl font-bold text-white mt-0.5 md:mt-1 tracking-tight">
                                                {totalUnrealizedPnLPercentage > spyTotalPerformance ? '🎯 Beating' : totalUnrealizedPnLPercentage < spyTotalPerformance ? '📉 Trailing' : '➡️ Matching'}
                                            </dd>
                                        </div>
                                    </div>

                                    {/* S&P Starting Price & Performance */}
                                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/20">
                                        <div className="grid grid-cols-2 gap-2 md:gap-4">
                                            <div>
                                                <dt className="text-[10px] md:text-xs font-medium text-white/80 uppercase tracking-wide mb-1">
                                                    Your Return
                                                </dt>
                                                <dd className="text-base md:text-xl lg:text-2xl font-bold text-white break-words">
                                                    {formatPercentage(totalUnrealizedPnLPercentage)}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-[10px] md:text-xs font-medium text-white/80 uppercase tracking-wide mb-1">
                                                    S&P 500
                                                </dt>
                                                <dd className="text-base md:text-xl lg:text-2xl font-bold text-white break-words">
                                                    {formatPercentage(spyTotalPerformance)}
                                                </dd>
                                            </div>
                                        </div>

                                        {/* Editable S&P Starting Price */}
                                        <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-white/20">
                                            <dt className="text-[10px] md:text-xs font-medium text-white/80 uppercase tracking-wide mb-2">
                                                S&P 500 Starting Price
                                            </dt>
                                            {isEditingSpyPrice ? (
                                                <div className="flex flex-col sm:flex-row gap-2">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={tempSpyPrice}
                                                        onChange={(e) => setTempSpyPrice(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSaveSpyPrice()
                                                            if (e.key === 'Escape') handleCancelEdit()
                                                        }}
                                                        className="flex-1 px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                                                        placeholder="Enter S&P 500 price"
                                                        autoFocus
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={handleSaveSpyPrice}
                                                            className="flex-1 sm:flex-initial px-3 md:px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg font-medium transition-colors"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="flex-1 sm:flex-initial px-3 md:px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg font-medium transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between gap-2">
                                                    <dd className="text-base md:text-lg lg:text-xl font-bold text-white truncate">
                                                        ${startingSpyPrice?.toFixed(2)}
                                                    </dd>
                                                    <button
                                                        onClick={handleEditSpyPrice}
                                                        className="inline-flex items-center gap-1 px-2 md:px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs md:text-sm font-medium transition-colors flex-shrink-0"
                                                        title="Edit starting price"
                                                    >
                                                        <Edit2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                                        <span className="hidden sm:inline">Edit</span>
                                                    </button>
                                                </div>
                                            )}
                                            <dd className="text-[10px] md:text-xs text-white/70 mt-1 truncate">
                                                Current: ${currentSpyPrice?.toFixed(2)}
                                            </dd>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Row 2: Performance Metrics - Even grid */}
                    <div className={`grid grid-cols-1 gap-3 ${hasUnrealized ? 'md:grid-cols-3' : 'md:grid-cols-2'
                        }`}>
                        {/* Daily P&L */}
                        <div className={`rounded-xl p-4 md:p-5 border shadow-md transition-all hover:shadow-lg ${isPositivePnL
                            ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-900/10 border-emerald-300 dark:border-emerald-700'
                            : 'bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-900/30 dark:to-rose-900/10 border-rose-300 dark:border-rose-700'
                            }`}>
                            <div className="flex flex-col h-full">
                                <div className="flex items-center mb-2 md:mb-3">
                                    <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center shadow-sm ${isPositivePnL ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                                        {isPositivePnL ? (
                                            <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-white" />
                                        ) : (
                                            <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-white" />
                                        )}
                                    </div>
                                    <dt className={`ml-2 md:ml-2.5 text-[10px] md:text-xs font-semibold uppercase tracking-wider ${isPositivePnL ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                                        Daily P&L
                                    </dt>
                                </div>
                                <dd className={`text-lg md:text-2xl lg:text-3xl font-bold truncate ${isPositivePnL ? 'text-emerald-900 dark:text-emerald-100' : 'text-rose-900 dark:text-rose-100'}`}>
                                    {formatCurrency(portfolio.totalDailyPnL)}
                                </dd>
                            </div>
                        </div>

                        {/* Daily P&L Percentage */}
                        <div className={`rounded-xl p-4 md:p-5 border shadow-md transition-all hover:shadow-lg ${isPositivePnL
                            ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-900/10 border-emerald-300 dark:border-emerald-700'
                            : 'bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-900/30 dark:to-rose-900/10 border-rose-300 dark:border-rose-700'
                            }`}>
                            <div className="flex flex-col h-full">
                                <div className="flex items-center mb-2 md:mb-3">
                                    <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center shadow-sm ${isPositivePnL ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                                        {isPositivePnL ? (
                                            <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-white" />
                                        ) : (
                                            <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-white" />
                                        )}
                                    </div>
                                    <dt className={`ml-2 md:ml-2.5 text-[10px] md:text-xs font-semibold uppercase tracking-wider ${isPositivePnL ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                                        Daily Change
                                    </dt>
                                </div>
                                <dd className={`text-lg md:text-2xl lg:text-3xl font-bold ${isPositivePnL ? 'text-emerald-900 dark:text-emerald-100' : 'text-rose-900 dark:text-rose-100'}`}>
                                    {formatPercentage(portfolio.totalDailyPnLPercentage)}
                                </dd>
                            </div>
                        </div>

                        {/* Total P&L (Unrealized) */}
                        {hasUnrealized && (
                            <div className={`rounded-xl p-4 md:p-5 border shadow-md transition-all hover:shadow-lg ${isPositiveUnrealized
                                ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-900/10 border-emerald-300 dark:border-emerald-700'
                                : 'bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-900/30 dark:to-rose-900/10 border-rose-300 dark:border-rose-700'
                                }`}>
                                <div className="flex flex-col h-full">
                                    <div className="flex items-center mb-2 md:mb-3">
                                        <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center shadow-sm ${isPositiveUnrealized ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                                            {isPositiveUnrealized ? (
                                                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-white" />
                                            ) : (
                                                <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-white" />
                                            )}
                                        </div>
                                        <dt className={`ml-2 md:ml-2.5 text-[10px] md:text-xs font-semibold uppercase tracking-wider ${isPositiveUnrealized ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                                            Total P&L
                                        </dt>
                                    </div>
                                    <dd className={`text-lg md:text-2xl lg:text-3xl font-bold truncate ${isPositiveUnrealized ? 'text-emerald-900 dark:text-emerald-100' : 'text-rose-900 dark:text-rose-100'}`}>
                                        {formatCurrency(totalUnrealizedPnL)}
                                    </dd>
                                    <dd className={`text-xs md:text-sm font-semibold mt-1 ${isPositiveUnrealized ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                                        {formatPercentage(totalUnrealizedPnLPercentage)}
                                    </dd>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
