'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { usePortfolioStore } from '@/stores/portfolio-store'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSearchParams } from 'next/navigation'
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, AlertTriangle, Target, DollarSign, Activity, Shield, Zap } from 'lucide-react'

interface PortfolioReviewData {
    title: string
    riskMeter: {
        level: 'LOW' | 'MEDIUM' | 'HIGH'
        score: number
        description: string
    }
    portfolioForecast: {
        currentValue: number
        sixMonthForecast: number
        confidence: number
        forecastData: Array<{
            month: string
            value: number
        }>
    }
    allocationChart: {
        type: string
        data: Array<{
            name: string
            value: number
            percentage: number
            color: string
        }>
    }
    performanceChart: {
        bestPerformers: Array<{
            symbol: string
            name: string
            performance: number
            value: number
        }>
        worstPerformers: Array<{
            symbol: string
            name: string
            performance: number
            value: number
        }>
    }
    assetAnalysis: Array<{
        symbol: string
        name: string
        currentPrice: number
        allocation: number
        analysis: string
        outlook: {
            shortTerm: string
            longTerm: string
        }
    }>
    mustSell: {
        hasRecommendations: boolean
        recommendations: Array<{
            symbol: string
            name: string
            reasoning: string
            evidence: string[]
            action: string
            timeframe: string
            targetPrice: number
            stopLoss: number
        }>
    }
}

export default function PortfolioReviewPage() {
    const { portfolio } = usePortfolioStore()
    const [review, setReview] = useState<PortfolioReviewData | null>(null)
    const [loading, setLoading] = useState(false)
    const searchParams = useSearchParams()

    useEffect(() => {
        async function run() {
            if (review || loading) return
            const id = searchParams.get('id')
            if (id) {
                try {
                    const raw = sessionStorage.getItem(id)
                    if (raw) setReview(JSON.parse(raw))
                } finally { }
                return
            }
            if (!portfolio) return
            setLoading(true)
            try {
                const { data: { session } } = await supabase.auth.getSession()
                const headers = new Headers({ 'Content-Type': 'application/json' })
                if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)
                const res = await fetch('/api/portfolio-review', { method: 'POST', headers, body: JSON.stringify({ portfolio }) })
                const data = await res.json()
                setReview(data?.data || null)
            } finally {
                setLoading(false)
            }
        }
        run()
    }, [portfolio, searchParams, review, loading])

    async function saveReview() {
        if (!review) return
        const { data: { session } } = await supabase.auth.getSession()
        const headers = new Headers({ 'Content-Type': 'application/json' })
        if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)
        await fetch('/api/analysis', {
            method: 'POST',
            headers,
            body: JSON.stringify({ symbol: 'PORTFOLIO', name: 'Portfolio Review', payload: { type: 'portfolio_review', review } })
        })
        alert('Portfolio review saved to Saved Analyses (Portfolio Reviews).')
    }

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'LOW': return 'text-green-600 bg-green-100 dark:bg-green-900/30'
            case 'MEDIUM': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30'
            case 'HIGH': return 'text-red-600 bg-red-100 dark:bg-red-900/30'
            default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30'
        }
    }

    if (loading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">Generating AI Portfolio Review...</p>
                    </div>
                </div>
            </MainLayout>
        )
    }

    if (!review) {
        return (
            <MainLayout>
                <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">No portfolio review data available.</p>
                </div>
            </MainLayout>
        )
    }

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto space-y-8 p-6">
                {/* Title */}
                <div className="text-center py-8">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        {review.title}
                    </h1>
                    <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto rounded-full"></div>
                </div>

                {/* Header Section - Risk Meter */}
                <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-0 shadow-lg">
                    <CardContent className="p-8">
                        <div className="flex items-center justify-center space-x-8">
                            <div className="text-center">
                                <div className={`inline-flex items-center px-6 py-3 rounded-full text-lg font-semibold mb-4 ${getRiskColor(review.riskMeter.level)}`}>
                                    <Shield className="w-5 h-5 mr-2" />
                                    {review.riskMeter.level} RISK
                                </div>
                                <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                                    {review.riskMeter.score}/100
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 max-w-md">
                                    {review.riskMeter.description}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Section 1: Portfolio Value Forecast */}
                    <Card className="shadow-lg">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center space-x-2 text-xl">
                                <TrendingUp className="w-5 h-5 text-blue-600" />
                                <span>Portfolio Value Forecast</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-center">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Current Value</div>
                                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                            ${review.portfolioForecast.currentValue.toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">6-Month Forecast</div>
                                        <div className="text-2xl font-bold text-green-600">
                                            ${review.portfolioForecast.sixMonthForecast.toLocaleString()}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {review.portfolioForecast.confidence}% confidence
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={review.portfolioForecast.forecastData}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                    <XAxis dataKey="month" stroke="#6B7280" />
                                    <YAxis stroke="#6B7280" />
                                    <Tooltip
                                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Portfolio Value']}
                                        labelStyle={{ color: '#374151' }}
                                        contentStyle={{
                                            backgroundColor: '#F9FAFB',
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#3B82F6"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorValue)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Section 2: Allocation Chart */}
                    <Card className="shadow-lg">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center space-x-2 text-xl">
                                <Target className="w-5 h-5 text-purple-600" />
                                <span>Portfolio Allocation</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={review.allocationChart.data}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {review.allocationChart.data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number, name) => [
                                            `$${value.toLocaleString()} (${((value / review.portfolioForecast.currentValue) * 100).toFixed(1)}%)`,
                                            name
                                        ]}
                                        contentStyle={{
                                            backgroundColor: '#F9FAFB',
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '8px'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                {review.allocationChart.data.map((item, index) => (
                                    <div key={index} className="flex items-center space-x-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: item.color }}
                                        ></div>
                                        <span className="text-sm text-gray-600 dark:text-gray-300">
                                            {item.name}: {item.percentage}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Section 3: Best/Worst Performers */}
                <Card className="shadow-lg">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center space-x-2 text-xl">
                            <Activity className="w-5 h-5 text-green-600" />
                            <span>Performance Analysis (6 Months)</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Best Performers */}
                            <div>
                                <h3 className="text-lg font-semibold text-green-600 mb-4 flex items-center">
                                    <TrendingUp className="w-4 h-4 mr-2" />
                                    Best Performers
                                </h3>
                                <div className="space-y-3">
                                    {review.performanceChart.bestPerformers.map((performer, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    {performer.name} ({performer.symbol})
                                                </div>
                                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                                    ${performer.value.toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-green-600">
                                                    +{performer.performance}%
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Worst Performers */}
                            <div>
                                <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center">
                                    <TrendingDown className="w-4 h-4 mr-2" />
                                    Worst Performers
                                </h3>
                                <div className="space-y-3">
                                    {review.performanceChart.worstPerformers.map((performer, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    {performer.name} ({performer.symbol})
                                                </div>
                                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                                    ${performer.value.toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-red-600">
                                                    {performer.performance}%
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Section 4: Asset Analysis */}
                <Card className="shadow-lg">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center space-x-2 text-xl">
                            <Zap className="w-5 h-5 text-blue-600" />
                            <span>Asset Analysis & Outlook</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {review.assetAnalysis.map((asset, index) => (
                                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {asset.name} ({asset.symbol})
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                                Current: ${asset.currentPrice.toLocaleString()} • Allocation: {asset.allocation}%
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                                        {asset.analysis}
                                    </p>
                                    <div className="space-y-2">
                                        <div className="text-sm">
                                            <span className="font-medium text-green-600">Short-term:</span> {asset.outlook.shortTerm}
                                        </div>
                                        <div className="text-sm">
                                            <span className="font-medium text-blue-600">Long-term:</span> {asset.outlook.longTerm}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Section 5: Critical Action Required */}
                {review.mustSell.hasRecommendations && review.mustSell.recommendations.length > 0 ? (
                    <Card className="shadow-lg border-red-200 dark:border-red-800">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center space-x-2 text-xl text-red-600">
                                <AlertTriangle className="w-5 h-5" />
                                <span>Critical Action Required</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {review.mustSell.recommendations.map((rec, index) => (
                                    <div key={index} className="border border-red-200 dark:border-red-800 rounded-lg p-6 bg-red-50 dark:bg-red-900/20">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xl font-semibold text-red-800 dark:text-red-200">
                                                {rec.symbol} - {rec.name}
                                            </h3>
                                            <div className="text-right">
                                                <div className="text-sm text-red-600 dark:text-red-400">Target: ${rec.targetPrice}</div>
                                                <div className="text-sm text-red-600 dark:text-red-400">Stop Loss: ${rec.stopLoss}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                                            <div>
                                                <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">Detailed Reasoning</h4>
                                                <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">
                                                    {rec.reasoning}
                                                </p>
                                            </div>

                                            <div>
                                                <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">Key Evidence</h4>
                                                <ul className="space-y-2">
                                                    {rec.evidence.map((evidence, evidenceIndex) => (
                                                        <li key={evidenceIndex} className="flex items-start space-x-2">
                                                            <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                                                            <span className="text-sm text-red-700 dark:text-red-300">{evidence}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="border-t border-red-200 dark:border-red-800 pt-4">
                                            <div className="flex items-center justify-between">
                                                <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-4 border-l-4 border-red-500">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <AlertTriangle className="w-5 h-5 text-red-600" />
                                                        <span className="font-semibold text-red-800 dark:text-red-200">Immediate Action Required</span>
                                                    </div>
                                                    <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                                                        {rec.action}
                                                    </p>
                                                    <p className="text-xs text-red-600 dark:text-red-400">
                                                        Timeframe: {rec.timeframe}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="shadow-lg border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center space-x-2 text-xl text-green-600">
                                <Shield className="w-5 h-5" />
                                <span>Portfolio Health Confirmed</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-6">
                                <div className="text-green-600 dark:text-green-400 mb-4">
                                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className="text-green-800 dark:text-green-200 text-lg font-medium mb-2">
                                    ✅ No assets require immediate action
                                </p>
                                <p className="text-green-700 dark:text-green-300 text-sm">
                                    All holdings pass our strict criteria for continued investment. The AI analysis found no critical issues requiring urgent divestment. This is the expected outcome for a well-constructed, long-term portfolio.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Action Buttons */}
                <div className="flex justify-center pt-6">
                    <Button onClick={saveReview} className="bg-blue-600 hover:bg-blue-700">
                        Save Portfolio Review
                    </Button>
                </div>
            </div>
        </MainLayout>
    )
}


