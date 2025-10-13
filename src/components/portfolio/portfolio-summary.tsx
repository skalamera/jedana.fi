import { TrendingUp, TrendingDown, DollarSign, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Portfolio } from '@/types'

interface PortfolioSummaryProps {
    portfolio: Portfolio | null
    isLoading: boolean
}

export function PortfolioSummary({ portfolio, isLoading }: PortfolioSummaryProps) {
    const router = useRouter()
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
            minimumFractionDigits: 2,
        }).format(value)
    }

    const formatPercentage = (value: number) => {
        const sign = value >= 0 ? '+' : ''
        return `${sign}${value.toFixed(2)}%`
    }

    const isPositivePnL = portfolio.totalDailyPnL >= 0

    return (
        <div className="bg-gray-50 dark:bg-gray-700 shadow-sm rounded-xl border border-gray-200 dark:border-gray-600">
            <div className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Portfolio Summary</h3>
                    <div className="flex items-center gap-3">
                        <span className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                            Updated: {new Date(portfolio.lastUpdated).toLocaleDateString()} {new Date(portfolio.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                            onClick={() => router.push('/portfolio-review')}
                            className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 text-white text-xs md:text-sm font-medium px-3 py-1.5 hover:bg-amber-600 shadow"
                            title="AI Portfolio Review"
                            aria-label="AI Portfolio Review"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span className="hidden sm:inline">Review</span>
                        </button>
                    </div>
                </div>

                {/* Mobile: Stack vertically, Desktop: 3 columns */}
                <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-3 md:gap-4">
                    {/* Total Value */}
                    <div className="bg-white dark:bg-gray-600 rounded-xl p-4 border border-gray-200 dark:border-gray-500 shadow-sm">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                    <DollarSign className="h-5 w-5 text-white" />
                                </div>
                            </div>
                            <div className="ml-4 flex-1">
                                <dt className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Total Value
                                </dt>
                                <dd className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(portfolio.totalValue)}
                                </dd>
                            </div>
                        </div>
                    </div>

                    {/* Daily P&L */}
                    <div className={`rounded-xl p-4 border shadow-sm ${isPositivePnL
                        ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700'
                        : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700'
                        }`}>
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPositivePnL ? 'bg-green-500' : 'bg-red-500'}`}>
                                    {isPositivePnL ? (
                                        <TrendingUp className="h-5 w-5 text-white" />
                                    ) : (
                                        <TrendingDown className="h-5 w-5 text-white" />
                                    )}
                                </div>
                            </div>
                            <div className="ml-4 flex-1">
                                <dt className={`text-sm font-medium ${isPositivePnL ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                                    Daily P&L
                                </dt>
                                <dd className={`text-xl md:text-2xl font-bold ${isPositivePnL ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                                    {formatCurrency(portfolio.totalDailyPnL)}
                                </dd>
                            </div>
                        </div>
                    </div>

                    {/* Daily P&L Percentage */}
                    <div className={`rounded-xl p-4 border shadow-sm ${isPositivePnL
                        ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700'
                        : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700'
                        }`}>
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPositivePnL ? 'bg-green-500' : 'bg-red-500'}`}>
                                    {isPositivePnL ? (
                                        <TrendingUp className="h-5 w-5 text-white" />
                                    ) : (
                                        <TrendingDown className="h-5 w-5 text-white" />
                                    )}
                                </div>
                            </div>
                            <div className="ml-4 flex-1">
                                <dt className={`text-sm font-medium ${isPositivePnL ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                                    Daily Change
                                </dt>
                                <dd className={`text-xl md:text-2xl font-bold ${isPositivePnL ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                                    {formatPercentage(portfolio.totalDailyPnLPercentage)}
                                </dd>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
