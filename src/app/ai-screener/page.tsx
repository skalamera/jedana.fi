'use client'

import { useRef, useState, useEffect } from 'react'
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

const LOADING_STEPS: string[] = []

export default function AIScreenerPage() {
    const router = useRouter()
    const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const startTimeRef = useRef<number>(0)
    const ESTIMATED_MS = 35000
    const steps = 28
    const [progress, setProgress] = useState(0)
    const [stepIndex, setStepIndex] = useState(0)
    const [formData, setFormData] = useState<AIScreenerForm>({
        portfolioType: 'stocks',
        userQuery: '',
        riskTolerance: 50,
        timeHorizon: 'long_term',
        sectorPreferences: [],
        investingPhilosophy: undefined
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lastAutoPrompt, setLastAutoPrompt] = useState<string>('')
    const [userEditedPrompt, setUserEditedPrompt] = useState<boolean>(false)
    const [autoPrompt, setAutoPrompt] = useState<string>('')
    const [displaySummary, setDisplaySummary] = useState<string>('')
    const [hasInteracted, setHasInteracted] = useState<boolean>(false)

    function getRiskLabel(score: number): 'Conservative' | 'Moderate' | 'Aggressive' {
        if (score >= 70) return 'Aggressive'
        if (score <= 30) return 'Conservative'
        return 'Moderate'
    }

    function getPortfolioTypeLabel(t: PortfolioType): string {
        if (t === 'stocks') return 'Stocks & ETFs'
        if (t === 'crypto') return 'Cryptocurrencies'
        return 'Stocks/ETFs and Cryptocurrencies'
    }

    function getHorizonLabel(h?: 'short_term' | 'medium_term' | 'long_term'): string {
        if (h === 'short_term') return 'short-term (0–12 months)'
        if (h === 'medium_term') return 'medium-term (1–3 years)'
        return 'long-term (3+ years)'
    }

    function buildAutoPrompt(): string {
        const assetTypes = getPortfolioTypeLabel(formData.portfolioType)
        const risk = `${getRiskLabel(formData.riskTolerance)} (${formData.riskTolerance}/100)`
        const horizon = getHorizonLabel(formData.timeHorizon)
        const sectors = formData.sectorPreferences && formData.sectorPreferences.length > 0
            ? formData.sectorPreferences.join(', ')
            : 'any sectors'
        const philosophy = formData.investingPhilosophy || 'no specific philosophy'

        return (
            `Recommend 5 high-quality ${assetTypes} for a ${risk} investor with a ${horizon} horizon. ` +
            `Focus on ${sectors}. Use ${philosophy}. ` +
            `Provide unique strengths, specific risks, current RSI/MA/MACD with interpretation, recent catalysts, ` +
            `analyst consensus, and realistic price targets.`
        )
    }

    function getPortfolioTypeEmoji(): string {
        if (formData.portfolioType === 'stocks') return '📈 Stocks & ETFs'
        if (formData.portfolioType === 'crypto') return '🪙 Crypto'
        return '📈🪙 Mixed'
    }

    function getHorizonEmoji(): string {
        if (formData.timeHorizon === 'short_term') return '💲⏰ Short-term'
        if (formData.timeHorizon === 'medium_term') return '💲⌛ Medium-term'
        return '💲🐢 Long-term'
    }

    function getRiskEmoji(): string {
        const r = getRiskLabel(formData.riskTolerance)
        if (r === 'Aggressive') return '🎲 Aggressive'
        if (r === 'Moderate') return '⚠️ Moderate'
        return '🛡️ Conservative'
    }

    function sectorEmoji(label: string): string {
        const map: Record<string, string> = {
            'Technology': '🖥️',
            'Healthcare': '🏥',
            'Financials': '🏦',
            'Energy': '⛽',
            'Industrials': '🏭',
            'Consumer Discretionary': '🛍️',
            'Consumer Staples': '🧺',
            'Utilities': '🔌',
            'Materials': '⛏️',
            'Real Estate': '🏢',
            'Communication Services': '📡'
        }
        return `${map[label] || '•'} ${label}`
    }

    function buildDisplaySummary(): string {
        const portfolio = getPortfolioTypeEmoji()
        const horizon = getHorizonEmoji()
        const risk = getRiskEmoji()
        const sectors = (formData.sectorPreferences || []).map(sectorEmoji).join(' / ')
        const philosophy = formData.portfolioType === 'stocks' && formData.investingPhilosophy ? `♟️ ${formData.investingPhilosophy}` : ''
        return [
            portfolio,
            horizon,
            risk,
            sectors ? sectors : 'Sectors: any',
            philosophy
        ].filter(Boolean).join('\n')
    }

    // Auto-generate read-only prompt when selections change. Do not generate until user interacts.
    useEffect(() => {
        if (!hasInteracted) return
        const generated = buildAutoPrompt()
        setAutoPrompt(generated)
        setLastAutoPrompt(generated)
        setDisplaySummary(buildDisplaySummary())
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasInteracted, formData.portfolioType, formData.riskTolerance, formData.timeHorizon, JSON.stringify(formData.sectorPreferences), formData.investingPhilosophy])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!autoPrompt.trim() && !formData.userQuery.trim()) return

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
            const combinedPrompt = autoPrompt.trim() && formData.userQuery.trim()
                ? `${autoPrompt}\n\nAdditional details: ${formData.userQuery.trim()}`
                : (autoPrompt.trim() || formData.userQuery.trim())

            const requestBody = { ...formData, userQuery: combinedPrompt }

            const response = await fetch('/api/ai-screener', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
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
            const key = `ai_screener_result_${result.requestId || Date.now()}`
            sessionStorage.setItem(key, JSON.stringify(result))
            router.push(`/ai-screener/results?id=${encodeURIComponent(key)}`)

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

    // Removed common prompts dropdown per request

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

                {/* AI Screener Content */}
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
                                            onClick={() => { setFormData(prev => ({ ...prev, portfolioType: option.value })); setHasInteracted(true) }}
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

                            {/* Time Horizon - Slider (3 positions) */}
                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Time Horizon</label>
                                <div className="px-2">
                                    <Slider
                                        value={[formData.timeHorizon === 'short_term' ? 0 : formData.timeHorizon === 'medium_term' ? 50 : 100]}
                                        onValueChange={(value) => {
                                            const v = value[0]
                                            const sel = v < 25 ? 'short_term' : v < 75 ? 'medium_term' : 'long_term'
                                            setFormData(prev => ({ ...prev, timeHorizon: sel as any })); setHasInteracted(true)
                                        }}
                                        step={50}
                                        min={0}
                                        max={100}
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                                        <span>Short</span>
                                        <span>Medium</span>
                                        <span>Long</span>
                                    </div>
                                </div>

                                {/* Sector Preferences - Icon grid */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sector Preferences</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {[
                                            { label: 'Technology', icon: '🖥️' },
                                            { label: 'Healthcare', icon: '🏥' },
                                            { label: 'Financials', icon: '🏦' },
                                            { label: 'Energy', icon: '⛽' },
                                            { label: 'Industrials', icon: '🏭' },
                                            { label: 'Consumer Discretionary', icon: '🛍️' },
                                            { label: 'Consumer Staples', icon: '🧺' },
                                            { label: 'Utilities', icon: '🔌' },
                                            { label: 'Materials', icon: '⛏️' },
                                            { label: 'Real Estate', icon: '🏢' },
                                            { label: 'Communication Services', icon: '📡' },
                                        ].map(({ label, icon }) => {
                                            const selected = formData.sectorPreferences?.includes(label)
                                            return (
                                                <button
                                                    key={label}
                                                    type="button"
                                                    onClick={() => {
                                                        const next = new Set(formData.sectorPreferences || [])
                                                        if (next.has(label)) next.delete(label)
                                                        else next.add(label)
                                                        setFormData(prev => ({ ...prev, sectorPreferences: Array.from(next) }));
                                                        setHasInteracted(true)
                                                    }}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm transition-all ${selected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                                                >
                                                    <span className="text-lg">{icon}</span>
                                                    <span className="text-left">{label}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Investing Philosophy - 2x3 buttons (only for Stocks & ETFs) */}
                                {formData.portfolioType === 'stocks' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Investing Philosophy</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {[
                                                { label: 'Warren Buffett - Value Investing', emoji: '♟️' },
                                                { label: 'Peter Lynch - Growth at a Reasonable Price', emoji: '🚀' },
                                                { label: 'Benjamin Graham - Defensive Value', emoji: '🛡️' },
                                                { label: 'Ray Dalio - All Weather / Risk Parity', emoji: '⚖️' },
                                                { label: 'George Soros - Macro / Reflexivity', emoji: '🌪️' },
                                                { label: 'Carl Icahn - Activist / Event-Driven', emoji: '⚔️' },
                                            ].map(({ label, emoji }) => {
                                                const selected = formData.investingPhilosophy === label
                                                return (
                                                    <button
                                                        key={label}
                                                        type="button"
                                                        onClick={() => { setFormData(prev => ({ ...prev, investingPhilosophy: selected ? undefined : label })); setHasInteracted(true) }}
                                                        className={`flex items-center gap-2 px-3 py-3 rounded-lg border-2 text-sm transition-all ${selected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                                                    >
                                                        <span className="text-lg">{emoji}</span>
                                                        <span className="text-left">{label}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Auto-generated prompt (read-only) + user additions */}
                            <div className="space-y-4">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Selections</label>
                                <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 p-4 text-sm whitespace-pre-wrap leading-6">
                                    {displaySummary || 'Make selections above to see a formatted summary here…'}
                                </div>

                                <label htmlFor="userQuery" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Add Additional Details (optional)
                                </label>
                                <Textarea
                                    id="userQuery"
                                    placeholder="Add any specifics, focus areas, constraints, or exclusions to refine the search…"
                                    value={formData.userQuery}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                        const v = e.target.value
                                        setFormData(prev => ({ ...prev, userQuery: v }))
                                        setUserEditedPrompt(v.trim() !== '' && v !== lastAutoPrompt)
                                    }}
                                    className="min-h-[120px] resize-none border-2 focus:border-blue-500 dark:border-gray-600 dark:focus:border-blue-400 rounded-xl"
                                />
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
                                    disabled={isSubmitting || (!displaySummary.trim() && !formData.userQuery.trim())}
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
            </div>
        </MainLayout>
    )
}
