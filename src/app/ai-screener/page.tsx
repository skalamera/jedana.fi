'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, TrendingUp, Zap, Target, Users, Sparkles, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AIScreenerForm, PortfolioType } from '@/types'
import { MainLayout } from '@/components/layout/main-layout'

interface InvestorStock {
    ticker: string
    name: string
    description: string
    investmentPhilosophy: string
    keyStrengths: string[]
    keyRisks: string[]
    finance: {
        price: number
        market_cap: number
        pe_ratio: number
        dividend_yield: number
    }
    priceForecast: {
        projectedPrice: number
        confidence: number
        reasoning: string
    }
    analystRatings: {
        buy: number
        hold: number
        sell: number
        average_target: number
    }
}

interface InvestorRecommendation {
    investor: string
    investmentStyle: string
    recommendations: InvestorStock[]
}

const INVESTOR_LOADING_STEPS = [
    'analyzing investment philosophy',
    'researching historical performance',
    'identifying key market themes',
    'screening potential candidates',
    'evaluating competitive advantages',
    'assessing risk-reward profiles',
    'forecasting long-term growth',
    'validating financial metrics',
    'checking analyst consensus',
    'reviewing recent developments',
    'finalizing top recommendations',
    'preparing detailed analysis'
]

const LOADING_STEPS = [
    'forecasting future prices',
    'reading relevant news articles',
    'analyzing technical indicators',
    'scoring risk-adjusted returns',
    'checking earnings calendars',
    'summarizing analyst ratings',
    'normalizing market data',
    'measuring momentum and volatility',
    'mapping sector exposures',
    'assessing macro trends',
    'quantifying sentiment shifts',
    'backtesting simple signals',
    'weighing valuation multiples',
    'estimating cash flow resilience',
    'screening quality factors',
    'evaluating balance sheet strength',
    'sampling on-chain activity',
    'comparing peers and benchmarks',
    'triangulating price targets',
    'building probability distributions',
    'checking liquidity and spreads',
    'validating data integrity',
    'deriving confidence intervals',
    'stress-testing scenarios',
    'cross-referencing alt data',
    'resolving ticker symbols',
    'optimizing diversification',
    'finalizing recommendations',
    'asking magic 8 ball',
    'rendering charts',
    'packing results',
    'double‑checking numbers',
    'tuning narrative tone',
    'wrapping up',
    'almost there…'
]

const INVESTORS = [
    { name: 'Warren Buffett', style: 'Value Investing', color: 'green', icon: '🧠', description: 'Focus on undervalued companies with strong fundamentals' },
    { name: 'Peter Lynch', style: 'Growth at Reasonable Price', color: 'blue', icon: '📈', description: 'Invest in growing companies you understand' },
    { name: 'Benjamin Graham', style: 'Defensive Value', color: 'gray', icon: '🛡️', description: 'Margin of safety and conservative valuations' },
    { name: 'Philip Fisher', style: 'Growth Investing', color: 'purple', icon: '🚀', description: 'Invest in quality companies with long-term potential' },
    { name: 'John Templeton', style: 'Contrarian Investing', color: 'orange', icon: '🔄', description: 'Buy when others are fearful, sell when greedy' },
    { name: 'Charlie Munger', style: 'Quality Investing', color: 'indigo', icon: '🎯', description: 'Invest in great businesses with durable advantages' },
    { name: 'Ray Dalio', style: 'All Weather Strategy', color: 'teal', icon: '⚖️', description: 'Balanced portfolio that performs in all conditions' },
    { name: 'George Soros', style: 'Reflexivity Theory', color: 'red', icon: '🌪️', description: 'Markets are influenced by participants\' biases' },
    { name: 'Carl Icahn', style: 'Activist Investing', color: 'yellow', icon: '⚔️', description: 'Take large positions and push for change' }
]

function getInvestorButtonClasses(color: string): string {
    const colorMap: Record<string, string> = {
        green: 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-600',
        blue: 'bg-gradient-to-br from-blue-500 to-cyan-600 border-blue-600',
        gray: 'bg-gradient-to-br from-gray-600 to-slate-700 border-gray-600',
        purple: 'bg-gradient-to-br from-purple-500 to-violet-600 border-purple-600',
        orange: 'bg-gradient-to-br from-orange-500 to-amber-600 border-orange-600',
        indigo: 'bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-600',
        teal: 'bg-gradient-to-br from-teal-500 to-cyan-600 border-teal-600',
        red: 'bg-gradient-to-br from-red-500 to-rose-600 border-red-600',
        yellow: 'bg-gradient-to-br from-yellow-500 to-orange-600 border-yellow-600'
    }
    return colorMap[color] || 'bg-gradient-to-br from-blue-500 to-purple-600 border-blue-600'
}

// Investor stocks tab component - MUST be outside main component to prevent recreation
function InvestorStocksContent({
    investorLoading,
    investorError,
    investorResults,
    investorProgress,
    investorStepIndex,
    expandedStocks,
    handleInvestorClick,
    toggleStockExpansion,
    onBackToInvestors
}: {
    investorLoading: boolean
    investorError: string | null
    investorResults: InvestorRecommendation | null
    investorProgress: number
    investorStepIndex: number
    expandedStocks: Set<string>
    handleInvestorClick: (investor: string, style: string) => void
    toggleStockExpansion: (ticker: string) => void
    onBackToInvestors: () => void
}) {
    // Add debug logging for render
    console.log('InvestorStocksContent render:', {
        hasResults: !!investorResults,
        loading: investorLoading,
        error: !!investorError,
        recommendationsCount: investorResults?.recommendations?.length || 0
    })

    return (
        <div className="space-y-8">
            {/* Header - Only show when no results */}
            {!investorResults && (
                <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center justify-center space-x-2">
                            <Users className="w-6 h-6 text-blue-600" />
                            <span>Investment Philosophy Explorer</span>
                        </CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                            Discover top stock picks based on legendary investors' proven strategies. Click on any investor to see their top 10 recommendations for beating the market over the next 5 years.
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}

            {/* Investor Grid - Only show when no results */}
            {!investorResults && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {INVESTORS.map((investor) => (
                        <button
                            key={investor.name}
                            onClick={() => handleInvestorClick(investor.name, investor.style)}
                            disabled={investorLoading}
                            className={`group relative p-6 rounded-xl border-2 text-left transition-all duration-300 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${investorLoading
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer'
                                } ${getInvestorButtonClasses(investor.color)}`}
                        >
                            <div className="flex items-start space-x-4">
                                <div className="text-3xl mb-2">{investor.icon}</div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-white mb-1">
                                        {investor.name}
                                    </h3>
                                    <p className="text-sm font-medium text-white/90 mb-2">
                                        {investor.style}
                                    </p>
                                    <p className="text-xs text-white/80 leading-relaxed">
                                        {investor.description}
                                    </p>
                                </div>
                            </div>
                            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                        </button>
                    ))}
                </div>
            )}

            {/* Loading State */}
            {investorLoading && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
                    <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-xl">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Analyzing investor strategy...</div>
                        <Progress value={investorProgress} className="h-2 mb-3" />
                        <div className="text-xs text-gray-600 dark:text-gray-300 min-h-[1.5rem]">
                            {INVESTOR_LOADING_STEPS[investorStepIndex]}
                        </div>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {investorError && (
                <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2 text-red-800 dark:text-red-200">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="font-medium">Error</span>
                        </div>
                        <p className="text-red-700 dark:text-red-300 mt-2">{investorError}</p>
                    </CardContent>
                </Card>
            )}

            {/* Results Display */}
            {investorResults && investorResults.recommendations && investorResults.recommendations.length > 0 && (
                <>
                    {/* Back Button */}
                    <Button
                        onClick={onBackToInvestors}
                        variant="outline"
                        className="mb-4"
                    >
                        ← Back to Investors
                    </Button>

                    <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                                <Sparkles className="w-6 h-6 text-yellow-500" />
                                <span>{investorResults.investor}'s Top Picks</span>
                            </CardTitle>
                            <CardDescription className="text-gray-600 dark:text-gray-300">
                                Based on {investorResults.investmentStyle} philosophy - Top 10 stocks to beat the market over 5 years
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {investorResults.recommendations.map((stock, index) => (
                                    <div key={stock.ticker} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                        {/* Stock Header */}
                                        <button
                                            onClick={() => toggleStockExpansion(stock.ticker)}
                                            className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-4">
                                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                                                        #{index + 1}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                            {stock.name} ({stock.ticker})
                                                        </h3>
                                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                                            {stock.investmentPhilosophy}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-4">
                                                    <div className="text-right">
                                                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                                                            ${stock.finance.price.toFixed(2)}
                                                        </div>
                                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                                            Market Cap: ${(stock.finance.market_cap / 1000000000).toFixed(1)}B
                                                        </div>
                                                    </div>
                                                    <div className="text-gray-400">
                                                        {expandedStocks.has(stock.ticker) ? '−' : '+'}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>

                                        {/* Expanded Details */}
                                        {expandedStocks.has(stock.ticker) && (
                                            <div className="px-4 pb-4 bg-gray-50 dark:bg-gray-700/30">
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                                                    {/* Left Column */}
                                                    <div className="space-y-4">
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Investment Rationale</h4>
                                                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                                                {stock.description}
                                                            </p>
                                                        </div>

                                                        <div>
                                                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Key Strengths</h4>
                                                            <ul className="space-y-1">
                                                                {stock.keyStrengths.map((strength, idx) => (
                                                                    <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start">
                                                                        <span className="text-green-500 mr-2">•</span>
                                                                        {strength}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>

                                                        <div>
                                                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Key Risks</h4>
                                                            <ul className="space-y-1">
                                                                {stock.keyRisks.map((risk, idx) => (
                                                                    <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start">
                                                                        <span className="text-red-500 mr-2">•</span>
                                                                        {risk}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </div>

                                                    {/* Right Column */}
                                                    <div className="space-y-4">
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">5-Year Forecast</h4>
                                                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="text-sm text-gray-600 dark:text-gray-400">Target Price</span>
                                                                    <span className="font-bold text-blue-600 dark:text-blue-400">
                                                                        ${stock.priceForecast.projectedPrice.toLocaleString()}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="text-sm text-gray-600 dark:text-gray-400">Confidence</span>
                                                                    <span className="font-semibold text-gray-900 dark:text-white">
                                                                        {stock.priceForecast.confidence}%
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                                                                    {stock.priceForecast.reasoning}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Financial Metrics</h4>
                                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                                <div className="text-center">
                                                                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                                                                        ${stock.finance.price.toFixed(2)}
                                                                    </div>
                                                                    <div className="text-gray-600 dark:text-gray-400">Current Price</div>
                                                                </div>
                                                                <div className="text-center">
                                                                    <div className="text-lg font-bold text-blue-600">
                                                                        {(stock.finance.market_cap / 1000000000).toFixed(1)}B
                                                                    </div>
                                                                    <div className="text-gray-600 dark:text-gray-400">Market Cap</div>
                                                                </div>
                                                                <div className="text-center">
                                                                    <div className="text-lg font-bold text-green-600">
                                                                        {stock.finance.pe_ratio.toFixed(1)}
                                                                    </div>
                                                                    <div className="text-gray-600 dark:text-gray-400">P/E Ratio</div>
                                                                </div>
                                                                <div className="text-center">
                                                                    <div className="text-lg font-bold text-purple-600">
                                                                        {stock.finance.dividend_yield.toFixed(2)}%
                                                                    </div>
                                                                    <div className="text-gray-600 dark:text-gray-400">Dividend Yield</div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Analyst Ratings</h4>
                                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                                <div className="text-center">
                                                                    <div className="text-lg font-bold text-green-600">
                                                                        {stock.analystRatings.buy}
                                                                    </div>
                                                                    <div className="text-gray-600 dark:text-gray-400">Buy</div>
                                                                </div>
                                                                <div className="text-center">
                                                                    <div className="text-lg font-bold text-yellow-600">
                                                                        {stock.analystRatings.hold}
                                                                    </div>
                                                                    <div className="text-gray-600 dark:text-gray-400">Hold</div>
                                                                </div>
                                                                <div className="text-center">
                                                                    <div className="text-lg font-bold text-red-600">
                                                                        {stock.analystRatings.sell}
                                                                    </div>
                                                                    <div className="text-gray-600 dark:text-gray-400">Sell</div>
                                                                </div>
                                                                <div className="text-center">
                                                                    <div className="text-lg font-bold text-blue-600">
                                                                        ${stock.analystRatings.average_target.toFixed(2)}
                                                                    </div>
                                                                    <div className="text-gray-600 dark:text-gray-400">Avg Target</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}

export default function AIScreenerPage() {
    const router = useRouter()
    const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const startTimeRef = useRef<number>(0)
    const ESTIMATED_MS = 35000
    const steps = 28
    const [progress, setProgress] = useState(0)
    const [stepIndex, setStepIndex] = useState(0)
    const [formData, setFormData] = useState<AIScreenerForm>({
        portfolioType: 'both',
        userQuery: '',
        riskTolerance: 50
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Investor stocks tab state
    const [investorLoading, setInvestorLoading] = useState(false)
    const [investorError, setInvestorError] = useState<string | null>(null)
    const [investorResults, setInvestorResults] = useState<InvestorRecommendation | null>(null)
    const [investorProgress, setInvestorProgress] = useState(0)
    const [investorStepIndex, setInvestorStepIndex] = useState(0)
    const [expandedStocks, setExpandedStocks] = useState<Set<string>>(new Set())

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.userQuery.trim()) return

        setIsSubmitting(true)
        setError(null)

        // Kick off progress UI
        startTimeRef.current = Date.now()
        setProgress(0)
        setStepIndex(0)
        if (progressTimerRef.current) clearInterval(progressTimerRef.current)
        progressTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTimeRef.current
            const pct = Math.min(99, Math.round((elapsed / ESTIMATED_MS) * 100))
            setProgress(pct)
            const idx = Math.min(LOADING_STEPS.length - 1, Math.floor((elapsed / ESTIMATED_MS) * LOADING_STEPS.length))
            setStepIndex(idx)
        }, 900)

        try {
            const response = await fetch('/api/ai-screener', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            })

            if (!response.ok) {
                const errorData = await response.json()
                if (response.status === 503) {
                    throw new Error('AI service is temporarily unavailable. Please try again in a few minutes.')
                }
                throw new Error(errorData.error || 'Failed to process request')
            }

            const result = await response.json()

            // Persist result in sessionStorage to avoid URL size limits
            try {
                const key = `ai_screener_result_${result.requestId || Date.now()}`
                sessionStorage.setItem(key, JSON.stringify(result))
                router.push(`/ai-screener/results?id=${encodeURIComponent(key)}`)
            } catch {
                // Fallback to in-memory global if storage fails
                ; (window as any).__AI_SCREENER_RESULT__ = result
                router.push(`/ai-screener/results`)
            }

        } catch (error) {
            console.error('Error:', error)
            setError(error instanceof Error ? error.message : 'An unexpected error occurred')
        } finally {
            if (progressTimerRef.current) {
                clearInterval(progressTimerRef.current)
                progressTimerRef.current = null
            }
            setProgress(100)
            setTimeout(() => setIsSubmitting(false), 150)
        }
    }

    const handleInvestorClick = async (investor: string, investmentStyle: string) => {
        setInvestorLoading(true)
        setInvestorError(null)
        setInvestorResults(null)
        setExpandedStocks(new Set())

        // Start progress UI
        const startTime = Date.now()
        const ESTIMATED_MS = 20000
        setInvestorProgress(0)
        setInvestorStepIndex(0)

        const progressTimer = setInterval(() => {
            const elapsed = Date.now() - startTime
            const pct = Math.min(99, Math.round((elapsed / ESTIMATED_MS) * 100))
            setInvestorProgress(pct)
            const idx = Math.min(INVESTOR_LOADING_STEPS.length - 1, Math.floor((elapsed / ESTIMATED_MS) * INVESTOR_LOADING_STEPS.length))
            setInvestorStepIndex(idx)
        }, 800)

        try {
            const response = await fetch('/api/ai-investor-stocks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ investor, investmentStyle })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to process request')
            }

            const result = await response.json()

            console.log('API result received:', result)
            console.log('Has recommendations:', result?.recommendations?.length || 0)

            // Clear timer first
            if (progressTimer) {
                clearInterval(progressTimer)
            }

            setInvestorProgress(100)
            setInvestorLoading(false)

            // Set results immediately after loading is cleared
            setInvestorResults(result)

            console.log('State updated - loading:', false, 'results set:', !!result)

        } catch (error) {
            console.error('Error:', error)
            if (progressTimer) {
                clearInterval(progressTimer)
            }
            setInvestorProgress(100)
            setInvestorLoading(false)
            setInvestorError(error instanceof Error ? error.message : 'An unexpected error occurred')
        }
    }

    const toggleStockExpansion = (ticker: string) => {
        const newExpanded = new Set(expandedStocks)
        if (newExpanded.has(ticker)) {
            newExpanded.delete(ticker)
        } else {
            newExpanded.add(ticker)
        }
        setExpandedStocks(newExpanded)
    }

    const portfolioTypeOptions: { value: PortfolioType; label: string; icon: React.ReactNode; description: string }[] = [
        {
            value: 'stocks',
            label: 'Stocks & ETFs',
            icon: <TrendingUp className="w-5 h-5" />,
            description: 'Traditional stocks, ETFs, and equity investments'
        },
        {
            value: 'crypto',
            label: 'Cryptocurrency',
            icon: <Zap className="w-5 h-5" />,
            description: 'Digital assets, blockchain tokens, and cryptocurrencies'
        },
        {
            value: 'both',
            label: 'Mixed Portfolio',
            icon: <Target className="w-5 h-5" />,
            description: 'Combination of traditional and digital assets'
        }
    ]

    // Curated prompts for quick selection
    const commonPrompts: string[] = [
        'Small- and mid-cap tech with 20%+ YoY revenue growth and low debt',
        'Dividend aristocrats with yield > 3%, payout ratio < 60%, stable cash flows',
        'High ROIC (>15%) quality stocks with consistent free cash flow growth',
        'Undervalued stocks with P/E below sector median and positive earnings revisions',
        'AI and semiconductor beneficiaries with strong moat and pricing power',
        'Green energy leaders (solar, wind, storage) with improving margins',
        'Defensive healthcare (medtech/biopharma) with robust R&D pipelines',
        'Cyclical recovery plays (industrials/financials) with operating leverage',
        'Value + momentum screen: low EV/EBITDA with positive 6–12M momentum',
        'High dividend growth stocks with 5-year CAGR > 8% and low payout risk',
        'Cryptocurrency L1/L2 projects with rising TVL and developer activity',
        'DeFi protocols with sustainable fees, audited contracts, and user growth',
        'AI infrastructure crypto (compute, storage) with strong token utility',
        'Top stable, large-cap crypto (BTC/ETH) with on-chain accumulation signals',
        'Balanced portfolio mix for 5-year horizon with moderate risk tolerance',
        'Low-volatility equities with drawdown protection and stable beta (< 0.9)',
        'Fintech and payments leaders with expanding TAM and recurring revenue',
        'Cloud/SaaS companies with net retention > 110% and improving margins',
        'Commodities and gold exposure for inflation hedging and diversification',
        'European tech and industrial champions with USD tailwinds and exports'
    ]

    return (
        <MainLayout>
            <div className="mx-auto py-4 md:py-8 max-w-6xl">
                {isSubmitting && (
                    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
                        <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-xl">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Generating report…</div>
                            <Progress value={progress} className="h-2 mb-3" />
                            <div className="text-xs text-gray-600 dark:text-gray-300 min-h-[1.5rem]">
                                {LOADING_STEPS[stepIndex]}
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <Brain className="w-12 h-12 text-blue-600 dark:text-blue-400 mr-3" />
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                            AI Investment Tools
                        </h1>
                    </div>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                        Choose from our AI-powered investment tools to get personalized recommendations and analysis.
                    </p>
                </div>

                <Tabs defaultValue="screener" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8">
                        <TabsTrigger value="screener" className="flex items-center space-x-2">
                            <Brain className="w-4 h-4" />
                            <span>AI Screener</span>
                        </TabsTrigger>
                        <TabsTrigger value="investor-stocks" className="flex items-center space-x-2">
                            <Users className="w-4 h-4" />
                            <span>Investor Stocks</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="screener">
                        {/* Original AI Screener Content */}
                        <Card className="mb-8 shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    Investment Criteria
                                </CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-300">
                                    Select your preferred asset types and describe what you&apos;re looking for in detail
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-8">
                                    {/* Portfolio Type Selection */}
                                    <div className="space-y-4">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Portfolio Type
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {portfolioTypeOptions.map((option) => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, portfolioType: option.value }))}
                                                    className={`p-4 rounded-lg border-2 text-left transition-all duration-200 hover:shadow-md ${formData.portfolioType === option.value
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                        }`}
                                                >
                                                    <div className="flex items-start space-x-3">
                                                        <div className={`p-2 rounded-lg ${formData.portfolioType === option.value
                                                            ? 'bg-blue-500 text-white'
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                                            }`}>
                                                            {option.icon}
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className={`font-medium ${formData.portfolioType === option.value
                                                                ? 'text-blue-700 dark:text-blue-300'
                                                                : 'text-gray-900 dark:text-white'
                                                                }`}>
                                                                {option.label}
                                                            </h3>
                                                            <p className={`text-sm mt-1 ${formData.portfolioType === option.value
                                                                ? 'text-blue-600 dark:text-blue-400'
                                                                : 'text-gray-500 dark:text-gray-400'
                                                                }`}>
                                                                {option.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Risk Tolerance Slider */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Risk Tolerance
                                            </label>
                                            <Badge variant="outline" className="text-sm">
                                                {formData.riskTolerance}/100
                                            </Badge>
                                        </div>
                                        <div className="px-2">
                                            <Slider
                                                value={[formData.riskTolerance]}
                                                onValueChange={(value) => setFormData(prev => ({ ...prev, riskTolerance: value[0] }))}
                                                max={100}
                                                min={0}
                                                step={5}
                                                className="w-full"
                                            />
                                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                                                <span>Conservative (0)</span>
                                                <span>Moderate (50)</span>
                                                <span>Aggressive (100)</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Free-form Query Input */}
                                    <div className="space-y-4">
                                        <label htmlFor="userQuery" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Describe Your Investment Criteria
                                        </label>
                                        <Textarea
                                            id="userQuery"
                                            placeholder="Examples:
• Stocks with a P/E ratio under 15 over the past 2 years
• Best dividend stocks for income in 2025
• Tech stocks with strong growth potential
• Defensive stocks for market volatility
• Best crypto assets for the next bull run
• Balanced portfolio for retirement planning

Be as specific as possible about your risk tolerance, time horizon, sector preferences, and any other criteria."
                                            value={formData.userQuery}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, userQuery: e.target.value }))}
                                            className="min-h-[150px] resize-none border-2 focus:border-blue-500 dark:border-gray-600 dark:focus:border-blue-400"
                                            required
                                        />
                                        {/* Common prompts dropdown */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                                Or choose a common prompt
                                            </label>
                                            <select
                                                value=""
                                                onChange={(e) => {
                                                    const value = e.target.value
                                                    if (value) setFormData(prev => ({ ...prev, userQuery: value }))
                                                }}
                                                className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                                            >
                                                <option value="" disabled>Choose a prompt…</option>
                                                {commonPrompts.map((p, idx) => (
                                                    <option key={idx} value={p}>{p}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            💡 Tip: The more specific you are, the better our AI can tailor recommendations to your needs.
                                            Include details about risk tolerance, time horizon, sector preferences, and investment goals.
                                        </p>
                                    </div>

                                    {/* Error Display */}
                                    {error && (
                                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
                                        </div>
                                    )}

                                    {/* Submit Button */}
                                    <div className="flex justify-center pt-4">
                                        <Button
                                            type="submit"
                                            disabled={isSubmitting || !formData.userQuery.trim()}
                                            className="px-5 py-2 text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-auto max-w-xs"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                    Analyzing Markets...
                                                </>
                                            ) : (
                                                <>
                                                    <Brain className="w-4 h-4 mr-2" />
                                                    Generate Investment Report
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="investor-stocks">
                        <InvestorStocksContent
                            investorLoading={investorLoading}
                            investorError={investorError}
                            investorResults={investorResults}
                            investorProgress={investorProgress}
                            investorStepIndex={investorStepIndex}
                            expandedStocks={expandedStocks}
                            handleInvestorClick={handleInvestorClick}
                            toggleStockExpansion={toggleStockExpansion}
                            onBackToInvestors={() => {
                                setInvestorResults(null)
                                setExpandedStocks(new Set())
                            }}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </MainLayout>
    )
}
