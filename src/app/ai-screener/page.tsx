'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, TrendingUp, Zap, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { AIScreenerForm, PortfolioType } from '@/types'
import { MainLayout } from '@/components/layout/main-layout'

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
            <div className="mx-auto py-4 md:py-8 max-w-4xl">
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
                            AI Investment Screener
                        </h1>
                    </div>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Get personalized investment recommendations powered by advanced AI research.
                        Describe your criteria and let our AI analyze markets, news, and trends to find the best opportunities.
                    </p>
                </div>

                {/* Main Form */}
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

                {/* Example Queries removed in favor of dropdown */}
            </div>
        </MainLayout>
    )
}
