'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import {
    TrendingUp,
    TrendingDown,
    Minus,
    Calendar,
    DollarSign,
    Target,
    AlertTriangle,
    CheckCircle,
    XCircle,
    BarChart3,
    Globe,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AIScreenerResponse, AssetAnalysis } from '@/types'
import { MainLayout } from '@/components/layout/main-layout'
import { supabase } from '@/lib/supabase'

export default function AIScreenerResultsPage() {
    const searchParams = useSearchParams()
    const [result, setResult] = useState<AIScreenerResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const id = searchParams.get('id')
        const dataParam = searchParams.get('data')

        try {
            if (id) {
                const stored = sessionStorage.getItem(id)
                if (stored) {
                    setResult(JSON.parse(stored))
                    setIsLoading(false)
                    return
                }
            }

            if (dataParam) {
                // Backward compatibility with old URL param
                const parsedResult = JSON.parse(decodeURIComponent(dataParam))
                setResult(parsedResult)
                setIsLoading(false)
                return
            }

            // Fallback to global (if sessionStorage blocked)
            const fallback = (window as any).__AI_SCREENER_RESULT__
            if (fallback) {
                setResult(fallback)
                setIsLoading(false)
                return
            }

            setError('No analysis data provided')
            setIsLoading(false)
        } catch {
            setError('Failed to load analysis results')
            setIsLoading(false)
        }
    }, [searchParams])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Loading analysis results...</p>
                </div>
            </div>
        )
    }

    if (error || !result) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
                <Card className="max-w-md mx-auto">
                    <CardHeader>
                        <CardTitle className="text-red-600 flex items-center">
                            <XCircle className="w-5 h-5 mr-2" />
                            Error Loading Results
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            {error || 'Analysis results could not be loaded.'}
                        </p>
                        <Button onClick={() => window.history.back()} variant="outline">
                            Go Back
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <MainLayout>
            <div className="mx-auto py-4 md:py-8 max-w-7xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        AI Investment Analysis Report
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                        Generated on {new Date(result.timestamp).toLocaleDateString()}
                    </p>
                    <Badge variant="outline" className="mt-2">
                        Portfolio Type: {result.portfolioType.toUpperCase()}
                    </Badge>
                </div>

                {/* Summary Card */}
                <Card className="mb-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
                    <CardHeader>
                        <CardTitle className="text-2xl">Executive Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-blue-100 leading-relaxed">{result.summary}</p>
                    </CardContent>
                </Card>

                <Tabs defaultValue="assets" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-1">
                        <TabsTrigger value="assets">Asset Analysis</TabsTrigger>
                    </TabsList>

                    <TabsContent value="assets" className="space-y-6">
                        {/* Swipe hint */}
                        <div className="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                            <ChevronLeft className="w-3 h-3 mr-1" /> Swipe to see more <ChevronRight className="w-3 h-3 ml-1" />
                        </div>
                        {/* Horizontal Carousel */}
                        <Carousel assets={result.assets} />
                    </TabsContent>
                </Tabs>

                {/* Disclaimer */}
                <Card className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                    <CardContent className="pt-6">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            <strong>Disclaimer:</strong> {result.disclaimer}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    )
}

function AssetCard({ asset }: { asset: AssetAnalysis }) {
    const getRecommendationColor = (rec: string) => {
        switch (rec) {
            case 'strong_buy': return 'bg-green-500'
            case 'buy': return 'bg-green-400'
            case 'hold': return 'bg-yellow-500'
            case 'sell': return 'bg-red-400'
            case 'strong_sell': return 'bg-red-500'
            default: return 'bg-gray-500'
        }
    }

    const getSentimentIcon = (sentiment: string) => {
        switch (sentiment) {
            case 'bullish': return <TrendingUp className="w-4 h-4 text-green-500" />
            case 'bearish': return <TrendingDown className="w-4 h-4 text-red-500" />
            default: return <Minus className="w-4 h-4 text-gray-500" />
        }
    }

    const priceChange = asset.priceForecast.projectedPrice - asset.currentPrice
    const priceChangePercent = (priceChange / asset.currentPrice) * 100

    // Lazy mini-chart loader
    const [series, setSeries] = useState<number[] | null>(null)
    const [labels, setLabels] = useState<string[] | null>(null)
    const [loadingChart, setLoadingChart] = useState(false)

    async function loadChart() {
        if (series) return
        setLoadingChart(true)
        try {
            const res = await fetch(`/api/price/historical?symbol=${encodeURIComponent(asset.symbol)}&assetType=${encodeURIComponent(asset.assetType)}`)
            const data = await res.json()
            if (data?.closes && data?.timestamps) {
                setSeries(data.closes)
                setLabels(data.timestamps.map((t: number) => new Date(t * 1000).toLocaleDateString()))
            }
        } finally {
            setLoadingChart(false)
        }
    }

    return (
        <Card className="hover:shadow-lg transition-shadow duration-200 border-2 border-gray-200 dark:border-gray-700 shadow-sm bg-white/90 dark:bg-gray-900/60">
            <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                            {asset.symbol}
                        </CardTitle>
                        <CardDescription className="text-base font-medium text-gray-600 dark:text-gray-300">
                            {asset.name}
                        </CardDescription>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            ${asset.currentPrice.toLocaleString()}
                        </div>
                        <Badge variant="outline" className="mt-1">
                            {asset.assetType.toUpperCase()}
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center gap-4 mt-2">
                    <Badge className={`${getRecommendationColor(asset.recommendation)} text-white`}>
                        {asset.recommendation.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <div className="flex items-center gap-1">
                        {getSentimentIcon(asset.marketSentiment.overall)}
                        <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                            {asset.marketSentiment.overall}
                        </span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => saveAnalysis(asset)}>
                        Save
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Industry and Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Industry</p>
                        <p className="font-medium text-gray-900 dark:text-white">{asset.industry}</p>
                    </div>
                    {asset.marketCap && asset.marketCap > 0 && (
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Market Cap</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                                ${(asset.marketCap / 1e9).toFixed(1)}B
                            </p>
                        </div>
                    )}
                    {asset.peRatio && asset.peRatio > 0 && (
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">P/E Ratio</p>
                            <p className="font-medium text-gray-900 dark:text-white">{asset.peRatio}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Confidence</p>
                        <div className="flex items-center gap-2">
                            <Progress value={asset.confidence} className="flex-1" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {asset.confidence}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Price Forecast */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white flex items-center">
                            <Target className="w-4 h-4 mr-2" />
                            6-Month Forecast
                        </h4>
                        <div className={`flex items-center gap-1 ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {priceChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            <span className="font-bold">
                                ${asset.priceForecast.projectedPrice.toLocaleString()}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">
                            {priceChange >= 0 ? '+' : ''}{priceChangePercent.toFixed(1)}% change
                        </span>
                        <Badge variant="outline">
                            {asset.priceForecast.confidence}% confidence
                        </Badge>
                    </div>
                    {/* Comparison bar */}
                    <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <span>Current</span>
                            <span>Forecast</span>
                        </div>
                        <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded">
                            <div
                                className="h-2 bg-blue-500 rounded"
                                style={{ width: `${Math.min(100, (asset.currentPrice / Math.max(asset.currentPrice, asset.priceForecast.projectedPrice)) * 100)}%` }}
                            />
                        </div>
                        <div className="mt-1 h-2 w-full bg-gray-200 dark:bg-gray-700 rounded">
                            <div
                                className={`h-2 ${priceChange >= 0 ? 'bg-green-500' : 'bg-red-500'} rounded`}
                                style={{ width: `${Math.min(100, (asset.priceForecast.projectedPrice / Math.max(asset.currentPrice, asset.priceForecast.projectedPrice)) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Mini chart loader */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">6-Month Price Chart</h4>
                        <Button size="sm" variant="outline" onClick={loadChart} disabled={loadingChart || !!series}>
                            {series ? 'Loaded' : (loadingChart ? 'Loading…' : 'Load Chart')}
                        </Button>
                    </div>
                    {series && labels ? (
                        <SimpleSparkline labels={labels} data={series} />
                    ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-300">Click Load Chart to fetch recent prices.</p>
                    )}
                </div>

                {/* Strengths and Risks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 className="font-medium text-green-700 dark:text-green-300 mb-2 flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Key Strengths
                        </h4>
                        <ul className="space-y-1">
                            {asset.keyStrengths.slice(0, 3).map((strength, index) => (
                                <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                    {strength}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-medium text-red-700 dark:text-red-300 mb-2 flex items-center">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Key Risks
                        </h4>
                        <ul className="space-y-1">
                            {asset.keyRisks.slice(0, 3).map((risk, index) => (
                                <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start">
                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                    {risk}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Technical Analysis */}
                {asset.technicalAnalysis.length > 0 && (
                    <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Technical Analysis
                        </h4>
                        <div className="space-y-2">
                            {asset.technicalAnalysis.map((indicator, index) => (
                                <div key={index} className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {indicator.indicator}
                                        </span>
                                        <Badge
                                            variant={indicator.signal === 'buy' ? 'default' :
                                                indicator.signal === 'sell' ? 'destructive' : 'secondary'}
                                            className="text-xs"
                                        >
                                            {indicator.signal}
                                        </Badge>
                                    </div>
                                    {indicator.description && (
                                        <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">{indicator.description}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Investment Reasoning */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                        Investment Rationale
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                        {asset.reasoning}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
async function saveAnalysis(asset: AssetAnalysis) {
    try {
        console.log('[SaveAnalysis] saving', { symbol: asset.symbol, name: asset.name })

        // Grab current Supabase session to forward access token for the API route
        const { data: { session } } = await supabase.auth.getSession()
        const headers = new Headers({ 'Content-Type': 'application/json' })
        if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)

        const res = await fetch('/api/analysis', {
            method: 'POST',
            headers,
            body: JSON.stringify({ symbol: asset.symbol, name: asset.name, payload: asset })
        })
        if (!res.ok) {
            const text = await res.text().catch(() => '')
            console.warn('[SaveAnalysis] failed', res.status, text)
            alert('Failed to save analysis. Please try again.')
        } else {
            console.log('[SaveAnalysis] success')
            alert('Analysis saved successfully!')
        }
    } catch (e) {
        console.warn('[SaveAnalysis] exception', e)
    }
}


function Carousel({ assets }: { assets: AssetAnalysis[] }) {
    const trackRef = useRef<HTMLDivElement | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)

    function scrollByCards(direction: 1 | -1) {
        const track = trackRef.current
        const container = containerRef.current
        if (!track || !container) return
        const firstCard = track.querySelector('[data-card]') as HTMLElement | null
        const cardWidth = firstCard ? firstCard.clientWidth : 560
        const gap = 24 // md:gap-6
        container.scrollBy({ left: direction * (cardWidth + gap), behavior: 'smooth' })
    }

    return (
        <div className="relative">
            {/* Desktop fixed controls - always visible */}
            <button
                type="button"
                onClick={() => scrollByCards(-1)}
                className="hidden md:flex fixed left-2 top-1/2 -translate-y-1/2 z-40 h-10 w-10 items-center justify-center rounded-full bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 shadow hover:bg-white dark:hover:bg-gray-800"
                aria-label="Scroll left"
            >
                <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
            </button>
            <button
                type="button"
                onClick={() => scrollByCards(1)}
                className="hidden md:flex fixed right-2 top-1/2 -translate-y-1/2 z-40 h-10 w-10 items-center justify-center rounded-full bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 shadow hover:bg-white dark:hover:bg-gray-800"
                aria-label="Scroll right"
            >
                <ChevronRight className="w-6 h-6 text-gray-700 dark:text-gray-200" />
            </button>

            <div ref={containerRef} className="overflow-x-auto pb-3 -mx-4 md:mx-0">
                <div ref={trackRef} className="flex gap-4 md:gap-6 px-4 md:px-0 snap-x snap-mandatory scroll-smooth">
                    {assets.map((asset, index) => (
                        <div
                            key={`${asset.symbol}-${index}`}
                            data-card
                            className="snap-start shrink-0 w-[88vw] sm:w-[520px] md:w-[560px] lg:w-[600px]"
                        >
                            <AssetCard asset={asset} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// Very small inline SVG sparkline (no external deps)
function SimpleSparkline({ data, labels }: { data: number[]; labels: string[] }) {
    const width = 600
    const height = 80
    const padding = 6
    const n = data.length
    if (n < 2) return (
        <div className="h-20 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-xs text-gray-500">
            Not enough data
        </div>
    )

    const min = Math.min(...data)
    const max = Math.max(...data)
    const span = max - min || 1

    const points = data.map((v, i) => {
        const x = padding + (i * (width - padding * 2)) / (n - 1)
        const y = padding + (height - padding * 2) * (1 - (v - min) / span)
        return [x, y]
    })

    const path = points
        .map(([x, y], i) => (i === 0 ? `M ${x},${y}` : `L ${x},${y}`))
        .join(' ')

    const area = `M ${points[0][0]},${height - padding} ` +
        points.map(([x, y]) => `L ${x},${y}`).join(' ') +
        ` L ${points[points.length - 1][0]},${height - padding} Z`

    const last = data[data.length - 1]
    const lastY = padding + (height - padding * 2) * (1 - (last - min) / span)
    const lastX = points[points.length - 1][0]

    return (
        <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="rgba(59,130,246,0.25)" />
                        <stop offset="100%" stopColor="rgba(59,130,246,0)" />
                    </linearGradient>
                </defs>
                <path d={area} fill="url(#sparkFill)" />
                <path d={path} fill="none" stroke="#3b82f6" strokeWidth="2" />
                <circle cx={lastX} cy={lastY} r="2.5" fill="#3b82f6" />
            </svg>
            <div className="flex justify-between px-2 pb-1 text-[10px] text-gray-500 dark:text-gray-400">
                <span>{labels[0]}</span>
                <span>Last: {last.toLocaleString()}</span>
            </div>
        </div>
    )
}
