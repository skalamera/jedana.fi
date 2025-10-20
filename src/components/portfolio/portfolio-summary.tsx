import { TrendingUp, TrendingDown, DollarSign, Sparkles, BarChart3 } from 'lucide-react'
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

    // Fetch S&P 500 (SPY) daily performance using server-side API
    useEffect(() => {
        async function fetchSPYPerformance() {
            try {
                const response = await fetch('/api/fetch-prices', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        symbols: [{ symbol: 'SPY', assetType: 'equity' }]
                    }),
                })

                if (!response.ok) {
                    console.error('Failed to fetch SPY data')
                    return
                }

                const data = await response.json()
                const spyData = data.prices?.SPY

                if (spyData && spyData.currentPrice && spyData.previousClose) {
                    const percentChange = ((spyData.currentPrice - spyData.previousClose) / spyData.previousClose) * 100
                    setSpyPerformance(percentChange)
                }
            } catch (error) {
                console.error('Failed to fetch S&P 500 performance:', error)
            }
        }

        fetchSPYPerformance()
    }, [])

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
                    {/* Row 1: Total Value with S&P 500 Comparison */}
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-2xl p-6 shadow-xl border border-blue-400/50 dark:border-blue-500/50">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center flex-1">
                                <div className="flex-shrink-0">
                                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center ring-4 ring-white/20">
                                        <DollarSign className="h-7 w-7 text-white" />
                                    </div>
                                </div>
                                <div className="ml-5 flex-1">
                                    <dt className="text-sm font-semibold text-blue-100 uppercase tracking-wide">
                                        Total Portfolio Value
                                    </dt>
                                    <dd className="text-3xl md:text-4xl font-bold text-white mt-1 tracking-tight">
                                        {formatCurrency(portfolio.totalValue)}
                                    </dd>
                                </div>
                            </div>

                            {/* S&P 500 Comparison - Integrated */}
                            {spyPerformance !== null && portfolio.totalValue > 0 && (
                                <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
                                    <div className="flex-shrink-0">
                                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                            <BarChart3 className="h-5 w-5 text-white" />
                                        </div>
                                    </div>
                                    <div className="ml-3 text-left">
                                        <dt className="text-xs font-semibold text-blue-100 uppercase tracking-wide">
                                            vs S&P 500
                                        </dt>
                                        <dd className={`text-xl font-bold mt-0.5 ${portfolio.totalDailyPnLPercentage > spyPerformance
                                            ? 'text-green-300'
                                            : portfolio.totalDailyPnLPercentage < spyPerformance
                                                ? 'text-red-300'
                                                : 'text-white'
                                            }`}>
                                            {portfolio.totalDailyPnLPercentage > spyPerformance ? '🎯 Beating' : portfolio.totalDailyPnLPercentage < spyPerformance ? '📉 Trailing' : '➡️ Matching'}
                                        </dd>
                                        <dd className="text-xs font-medium text-blue-200 mt-0.5">
                                            SPY: {formatPercentage(spyPerformance)}
                                        </dd>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Row 2: Performance Metrics - Even grid */}
                    <div className={`grid grid-cols-1 gap-3 ${hasUnrealized ? 'md:grid-cols-3' : 'md:grid-cols-2'
                        }`}>
                        {/* Daily P&L */}
                        <div className={`rounded-xl p-5 border-2 shadow-md transition-all hover:shadow-lg ${isPositivePnL
                            ? 'bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/40 dark:to-green-900/20 border-green-400 dark:border-green-600'
                            : 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/40 dark:to-red-900/20 border-red-400 dark:border-red-600'
                            }`}>
                            <div className="flex flex-col h-full">
                                <div className="flex items-center mb-3">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-sm ${isPositivePnL ? 'bg-green-500' : 'bg-red-500'}`}>
                                        {isPositivePnL ? (
                                            <TrendingUp className="h-5 w-5 text-white" />
                                        ) : (
                                            <TrendingDown className="h-5 w-5 text-white" />
                                        )}
                                    </div>
                                    <dt className={`ml-2.5 text-xs font-bold uppercase tracking-wider ${isPositivePnL ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                                        Daily P&L
                                    </dt>
                                </div>
                                <dd className={`text-2xl md:text-3xl font-bold ${isPositivePnL ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                                    {formatCurrency(portfolio.totalDailyPnL)}
                                </dd>
                            </div>
                        </div>

                        {/* Daily P&L Percentage */}
                        <div className={`rounded-xl p-5 border-2 shadow-md transition-all hover:shadow-lg ${isPositivePnL
                            ? 'bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/40 dark:to-green-900/20 border-green-400 dark:border-green-600'
                            : 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/40 dark:to-red-900/20 border-red-400 dark:border-red-600'
                            }`}>
                            <div className="flex flex-col h-full">
                                <div className="flex items-center mb-3">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-sm ${isPositivePnL ? 'bg-green-500' : 'bg-red-500'}`}>
                                        {isPositivePnL ? (
                                            <TrendingUp className="h-5 w-5 text-white" />
                                        ) : (
                                            <TrendingDown className="h-5 w-5 text-white" />
                                        )}
                                    </div>
                                    <dt className={`ml-2.5 text-xs font-bold uppercase tracking-wider ${isPositivePnL ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                                        Daily Change
                                    </dt>
                                </div>
                                <dd className={`text-2xl md:text-3xl font-bold ${isPositivePnL ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                                    {formatPercentage(portfolio.totalDailyPnLPercentage)}
                                </dd>
                            </div>
                        </div>

                        {/* Total P&L (Unrealized) */}
                        {hasUnrealized && (
                            <div className={`rounded-xl p-5 border-2 shadow-md transition-all hover:shadow-lg ${isPositiveUnrealized
                                ? 'bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/40 dark:to-green-900/20 border-green-400 dark:border-green-600'
                                : 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/40 dark:to-red-900/20 border-red-400 dark:border-red-600'
                                }`}>
                                <div className="flex flex-col h-full">
                                    <div className="flex items-center mb-3">
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-sm ${isPositiveUnrealized ? 'bg-green-500' : 'bg-red-500'}`}>
                                            {isPositiveUnrealized ? (
                                                <TrendingUp className="h-5 w-5 text-white" />
                                            ) : (
                                                <TrendingDown className="h-5 w-5 text-white" />
                                            )}
                                        </div>
                                        <dt className={`ml-2.5 text-xs font-bold uppercase tracking-wider ${isPositiveUnrealized ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                                            Total P&L
                                        </dt>
                                    </div>
                                    <dd className={`text-2xl md:text-3xl font-bold ${isPositiveUnrealized ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                                        {formatCurrency(totalUnrealizedPnL)}
                                    </dd>
                                    <dd className={`text-sm font-semibold mt-1 ${isPositiveUnrealized ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
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
