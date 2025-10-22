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
            if (!id) {
                setError('No analysis data provided')
                setIsLoading(false)
                return
            }

            const stored = sessionStorage.getItem(id)
            if (stored) {
                setResult(JSON.parse(stored))
                setIsLoading(false)
                return
            }

            setError('Analysis data expired. Please run the AI screener again.')
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

                <div className="space-y-6">
                    {/* Navigation hint */}
                    <div className="md:hidden flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 mb-4">
                        <ChevronLeft className="w-3 h-3 mr-1" /> Swipe to navigate <ChevronRight className="w-3 h-3 ml-1" />
                    </div>
                    {/* Asset Carousel */}
                    <Carousel assets={result.assets} aiMetadata={result.aiMetadata} />
                </div>

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

function AssetCard({ asset, aiMetadata }: { asset: AssetAnalysis; aiMetadata?: { usedWebSearch: boolean; webSearchSources?: any[] } }) {
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
                        {/* Web Search Indicator */}
                        {aiMetadata?.usedWebSearch && (
                            <div className="mt-1 flex items-center gap-1">
                                <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                                    🔍 GPT-4o Analysis
                                </Badge>
                                {aiMetadata.webSearchSources && aiMetadata.webSearchSources.length > 0 && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        ({aiMetadata.webSearchSources.length} sources)
                                    </span>
                                )}
                            </div>
                        )}
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


function CoverCard({ assets, aiMetadata }: { assets: AssetAnalysis[]; aiMetadata?: { usedWebSearch: boolean; webSearchSources?: any[] } }) {
    const [isCreatingPortfolio, setIsCreatingPortfolio] = useState(false)
    const [portfolioCreated, setPortfolioCreated] = useState(false)

    const getOverviewDescription = () => {
        const totalAssets = assets.length
        const positiveForecasts = assets.filter(asset => {
            const priceChange = asset.priceForecast.projectedPrice - asset.currentPrice
            return priceChange > 0
        }).length

        if (totalAssets <= 2) {
            return `A curated selection of high-quality investments chosen for their strong fundamentals and growth potential.`
        } else if (positiveForecasts >= totalAssets * 0.7) {
            return `An optimistic portfolio of ${totalAssets} assets with strong bullish momentum and growth prospects.`
        } else if (positiveForecasts >= totalAssets * 0.5) {
            return `A balanced portfolio of ${totalAssets} assets with mixed momentum, offering diversified risk-adjusted returns.`
        } else {
            return `A conservative portfolio of ${totalAssets} assets focused on stability and long-term value creation.`
        }
    }

    const handleTrackPortfolio = async () => {
        setIsCreatingPortfolio(true)
        try {
            // Get the current session for auth token
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                alert('Please sign in to create a portfolio.')
                return
            }

            const authToken = session.access_token

            // Get current date for portfolio name
            const today = new Date()
            const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

            // Create portfolio name based on asset types
            const assetTypes = [...new Set(assets.map(a => a.assetType))]
            let portfolioType = 'AI'
            if (assetTypes.length === 1) {
                portfolioType = assetTypes[0] === 'crypto' ? 'Crypto' : 'Stock'
            }

            const portfolioName = `${portfolioType} AI Pick - ${dateStr}`
            const portfolioDescription = `AI-recommended portfolio with ${assets.length} assets. Track performance vs S&P 500.`

            // Create the portfolio
            const createResponse = await fetch('/api/portfolios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    name: portfolioName,
                    description: portfolioDescription,
                })
            })

            if (!createResponse.ok) {
                throw new Error('Failed to create portfolio')
            }

            const { portfolio } = await createResponse.json()

            // Add each asset to the portfolio
            for (const asset of assets) {
                const assetData = {
                    symbol: asset.symbol,
                    name: asset.name,
                    asset_type: asset.assetType === 'crypto' ? 'crypto' : 'equity',
                    quantity: 1,
                    cost_basis: asset.currentPrice,
                    notes: `AI recommended on ${dateStr}. 6M target: $${asset.priceForecast.projectedPrice.toFixed(2)}`
                }

                await fetch(`/api/portfolios/${portfolio.id}/assets`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify(assetData)
                })
            }

            setPortfolioCreated(true)

            // Redirect to portfolio page after a brief delay
            setTimeout(() => {
                window.location.href = '/'
            }, 2000)
        } catch (error) {
            console.error('Failed to create portfolio:', error)
            alert('Failed to create portfolio. Please try again.')
        } finally {
            setIsCreatingPortfolio(false)
        }
    }

    return (
        <Card className="w-full max-w-4xl mx-auto bg-gradient-to-br from-indigo-50 via-white to-blue-50 dark:from-gray-800 dark:via-gray-900 dark:to-indigo-950 border-2 border-indigo-200 dark:border-indigo-700 shadow-2xl">
            <CardHeader className="text-center pb-3 md:pb-6 px-3 md:px-6">
                {/* Track vs S&P Button */}
                <div className="flex justify-center md:justify-end mb-2">
                    <button
                        onClick={handleTrackPortfolio}
                        disabled={isCreatingPortfolio || portfolioCreated}
                        className={`group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all duration-300 ${portfolioCreated
                            ? 'bg-emerald-500 text-white cursor-default'
                            : isCreatingPortfolio
                                ? 'bg-indigo-400 text-white cursor-wait'
                                : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-indigo-500/50 hover:scale-105 active:scale-95'
                            }`}
                    >
                        {portfolioCreated ? (
                            <>
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Created!</span>
                            </>
                        ) : isCreatingPortfolio ? (
                            <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Creating...</span>
                            </>
                        ) : (
                            <>
                                <Activity className="w-3.5 h-3.5 group-hover:animate-pulse" />
                                <span>Track vs S&P</span>
                                <ArrowUpRight className="w-3 h-3 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </>
                        )}
                    </button>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 mb-3 md:mb-4">
                    <div className="p-2 md:p-3 bg-indigo-600 rounded-full">
                        <BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                            AI Investment Analysis
                        </CardTitle>
                        <CardDescription className="text-xs md:text-lg text-gray-600 dark:text-gray-300 mt-1 px-2 md:px-0">
                            {getOverviewDescription()}
                        </CardDescription>
                    </div>
                </div>
                {aiMetadata?.usedWebSearch && (
                    <Badge variant="outline" className="mx-auto text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                        🔍 GPT-4o Analysis
                    </Badge>
                )}
            </CardHeader>
            <CardContent className="px-2 md:px-8">
                <div className="space-y-3 md:space-y-4">
                    <h3 className="text-base md:text-xl font-semibold text-center text-gray-800 dark:text-gray-200 mb-3 md:mb-6">
                        Recommended Portfolio ({assets.length} Assets)
                    </h3>
                    <div className="grid gap-2 md:gap-4">
                        {assets.map((asset, index) => {
                            const priceChange = asset.priceForecast.projectedPrice - asset.currentPrice
                            const priceChangePercent = (priceChange / asset.currentPrice) * 100
                            const isPositive = priceChangePercent > 0

                            return (
                                <div key={asset.symbol} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-0 md:justify-between p-2 md:p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg md:rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                                    <div className="flex items-start md:items-center gap-2 md:gap-4 flex-1 min-w-0">
                                        <div className="flex items-center justify-center w-7 h-7 md:w-10 md:h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg text-white font-bold text-xs md:text-base flex-shrink-0">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                                                <span className="font-bold text-gray-900 dark:text-white text-xs md:text-base">
                                                    {asset.symbol}
                                                </span>
                                                <span className="text-gray-600 dark:text-gray-400 text-xs md:text-base truncate max-w-[120px] md:max-w-none">
                                                    {asset.name}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 md:gap-4 mt-0.5 md:mt-1 flex-wrap">
                                                <span className="text-[10px] md:text-sm font-medium text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                                    ${asset.currentPrice.toLocaleString()}
                                                </span>
                                                <div className="flex items-center gap-0.5 md:gap-1">
                                                    <Target className="w-2.5 h-2.5 md:w-4 md:h-4 text-indigo-600 dark:text-indigo-400" />
                                                    <span className="text-[10px] md:text-sm font-medium text-gray-700 dark:text-gray-300 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">
                                                        6M: ${asset.priceForecast.projectedPrice.toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className={`flex items-center gap-0.5 md:gap-1 ${isPositive ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-rose-50 dark:bg-rose-900/30'} px-1.5 py-0.5 rounded`}>
                                                    <TrendingUp className={`w-2.5 h-2.5 md:w-4 md:h-4 ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400 rotate-180'}`} />
                                                    <span className={`text-[10px] md:text-sm font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                        {isPositive ? '+' : ''}{priceChangePercent.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-left md:text-right ml-9 md:ml-0">
                                        <div className={`text-xs md:text-base font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {isPositive ? '↗' : '↘'} {isPositive ? 'Bullish' : 'Bearish'}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
                <div className="mt-4 md:mt-8 text-center">
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Swipe or use arrow keys to explore detailed analysis for each asset
                    </p>
                    <div className="flex items-center justify-center gap-2">
                        <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                            Detailed Analysis →
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function Carousel({ assets, aiMetadata }: { assets: AssetAnalysis[]; aiMetadata?: { usedWebSearch: boolean; webSearchSources?: any[] } }) {
    const [currentIndex, setCurrentIndex] = useState(0)

    // Total items: cover card + assets
    const totalItems = assets.length + 1

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1))
    }

    const goToNext = () => {
        setCurrentIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0))
    }

    const goToIndex = (index: number) => {
        setCurrentIndex(index)
    }

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault()
                goToPrevious()
            } else if (e.key === 'ArrowRight') {
                e.preventDefault()
                goToNext()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [assets.length])

    if (assets.length === 0) {
        return <div className="text-center text-gray-500">No assets to display</div>
    }

    return (
        <div className="relative">
            {/* Navigation Arrows - Desktop */}
            {assets.length > 1 && (
                <>
                    <button
                        type="button"
                        onClick={goToPrevious}
                        className="hidden md:flex fixed left-4 lg:left-8 top-1/2 -translate-y-1/2 z-50 h-14 w-14 items-center justify-center rounded-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-400 dark:hover:border-blue-500"
                        aria-label="Previous asset"
                    >
                        <ChevronLeft className="w-7 h-7 text-gray-700 dark:text-gray-200" />
                    </button>
                    <button
                        type="button"
                        onClick={goToNext}
                        className="hidden md:flex fixed right-4 lg:right-8 top-1/2 -translate-y-1/2 z-50 h-14 w-14 items-center justify-center rounded-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-400 dark:hover:border-blue-500"
                        aria-label="Next asset"
                    >
                        <ChevronRight className="w-7 h-7 text-gray-700 dark:text-gray-200" />
                    </button>
                </>
            )}

            {/* Desktop: Single Card Display */}
            <div className="hidden md:block">
                {/* Navigation Indicator - Top */}
                {assets.length > 1 && (
                    <div className="flex items-center justify-center gap-3 mb-6">
                        {/* Current position indicator */}
                        <span className="text-base font-semibold text-gray-700 dark:text-gray-300">
                            {currentIndex + 1} / {assets.length}
                        </span>

                        {/* Dot indicators */}
                        <div className="flex gap-2">
                            {assets.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => goToIndex(index)}
                                    className={`transition-all duration-200 rounded-full ${index === currentIndex
                                        ? 'w-8 h-2.5 bg-blue-600 dark:bg-blue-400'
                                        : 'w-2.5 h-2.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                                        }`}
                                    aria-label={`Go to asset ${index + 1}`}
                                />
                            ))}
                        </div>

                        {/* Navigation buttons */}
                        <div className="flex items-center gap-2 ml-2">
                            <button
                                onClick={goToPrevious}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Previous
                            </button>
                            <button
                                onClick={goToNext}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                <div className="max-w-4xl mx-auto">
                    {currentIndex === 0 ? (
                        <CoverCard assets={assets} aiMetadata={aiMetadata} />
                    ) : (
                        <AssetCard asset={assets[currentIndex - 1]} aiMetadata={aiMetadata} />
                    )}
                </div>
            </div>

            {/* Mobile: Swipeable Carousel */}
            <div className="md:hidden overflow-x-auto pb-3 -mx-4">
                <div className="flex gap-4 px-4 snap-x snap-mandatory scroll-smooth">
                    {/* Cover Card */}
                    <div className="snap-start shrink-0 w-[88vw]">
                        <CoverCard assets={assets} aiMetadata={aiMetadata} />
                    </div>
                    {/* Asset Cards */}
                    {assets.map((asset, index) => (
                        <div
                            key={`${asset.symbol}-${index}`}
                            className="snap-start shrink-0 w-[88vw]"
                        >
                            <AssetCard asset={asset} aiMetadata={aiMetadata} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigation Dots */}
            {totalItems > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                    {/* Current position indicator */}
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mr-2">
                        {currentIndex + 1} / {totalItems}
                    </span>

                    {/* Dot indicators */}
                    <div className="flex gap-2">
                        {Array.from({ length: totalItems }, (_, index) => (
                            <button
                                key={index}
                                onClick={() => goToIndex(index)}
                                className={`transition-all duration-200 rounded-full ${index === currentIndex
                                    ? 'w-8 h-2 bg-blue-600 dark:bg-blue-400'
                                    : 'w-2 h-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                                    }`}
                                aria-label={index === 0 ? 'Go to portfolio overview' : `Go to asset ${index}`}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Keyboard Navigation Hint */}
            <div className="hidden md:flex items-center justify-center gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">←</kbd>
                    <span>Previous</span>
                </div>
                <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">→</kbd>
                    <span>Next</span>
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
