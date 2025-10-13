'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { usePortfolioStore } from '@/stores/portfolio-store'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useSearchParams } from 'next/navigation'

export default function PortfolioReviewPage() {
    const { portfolio } = usePortfolioStore()
    const [review, setReview] = useState<any | null>(null)
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

    function toDisplay(value: any) {
        if (value == null) return ''
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
        try { return JSON.stringify(value, null, 2) } catch { return String(value) }
    }

    function titleize(raw: string) {
        return raw
            .replace(/[_-]+/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/^\w|\s\w/g, c => c.toUpperCase())
    }

    function PercentRow({ label, value }: { label: string; value: number }) {
        const pct = Math.max(0, Math.min(100, Number(value)))
        return (
            <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-300">{label}</span>
                    <span className="font-medium">{pct.toFixed(1)}%</span>
                </div>
                <Progress value={pct} className="h-1.5" />
            </div>
        )
    }

    function Distribution({ title, data }: { title: string; data: Record<string, number> }) {
        const entries = Object.entries(data || {})
        if (!entries.length) return null
        return (
            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    {entries.map(([k, v]) => (
                        <PercentRow key={k} label={titleize(k)} value={Number(v)} />
                    ))}
                </CardContent>
            </Card>
        )
    }

    return (
        <MainLayout>
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">AI Portfolio Review</h1>

                {!review || loading ? (
                    <p className="text-sm text-gray-500">Analyzing your portfolio…</p>
                ) : (
                    <div className="space-y-6">
                        {/* Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Key metrics */}
                                {review.summary && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {review.summary.totalPortfolioValue != null && (
                                            <div className="rounded-lg border p-3 bg-white dark:bg-gray-800">
                                                <div className="text-xs text-gray-500">Total Value</div>
                                                <div className="text-lg font-semibold">${review.summary.totalPortfolioValue.toLocaleString?.() || review.summary.totalPortfolioValue}</div>
                                            </div>
                                        )}
                                        {review.summary.totalDailyPnL != null && (
                                            <div className="rounded-lg border p-3 bg-white dark:bg-gray-800">
                                                <div className="text-xs text-gray-500">Daily P&L</div>
                                                <div className="text-lg font-semibold">${review.summary.totalDailyPnL.toLocaleString?.() || review.summary.totalDailyPnL}</div>
                                            </div>
                                        )}
                                        {(review.summary.highLevelRisk || review.summary.highLevelRiskAssessment) && (
                                            <div className="rounded-lg border p-3 bg-white dark:bg-gray-800">
                                                <div className="text-xs text-gray-500">Risk Level</div>
                                                <div className="text-lg font-semibold">{toDisplay(review.summary.highLevelRisk || review.summary.highLevelRiskAssessment)}</div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {review.summary?.overallComment && (
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{review.summary.overallComment}</p>
                                )}

                                {/* Target allocation */}
                                {review.rebalancing?.targets && (
                                    <div className="space-y-2">
                                        <div className="text-lg font-semibold">Target Allocation</div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {review.rebalancing.targets.map((t: any, i: number) => (
                                                <div key={i} className="rounded-lg border p-3 bg-gray-50 dark:bg-gray-800/50">
                                                    <div className="flex items-center justify-between text-sm font-medium">
                                                        <span>{t.symbol} – {t.name}</span>
                                                        <span>{t.targetWeight}%</span>
                                                    </div>
                                                    <div className="mt-2"><Progress value={Number(t.targetWeight)} className="h-1.5" /></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                {review.actions && (
                                    <div className="space-y-2">
                                        <div className="text-lg font-semibold">Actions</div>
                                        <div className="divide-y rounded-lg border">
                                            {review.actions.map((a: any, i: number) => (
                                                <div key={i} className="p-3 bg-white dark:bg-gray-800">
                                                    <div className="flex items-center justify-between text-sm font-medium">
                                                        <span>{a.symbol}</span>
                                                        <span className="uppercase tracking-wide text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700">{a.action}</span>
                                                    </div>
                                                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{a.note}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Outlook */}
                        {review.outlook && (
                            <Card>
                                <CardHeader><CardTitle>Outlook</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="rounded-lg border p-3 bg-white dark:bg-gray-800">
                                        <div className="text-sm font-semibold mb-2">Short-term</div>
                                        <div className="space-y-1 text-sm">
                                            {review.outlook.shortTerm?.base && (<div><span className="font-medium">Base:</span> {toDisplay(review.outlook.shortTerm.base)}</div>)}
                                            {review.outlook.shortTerm?.bull && (<div><span className="font-medium">Bull:</span> {toDisplay(review.outlook.shortTerm.bull)}</div>)}
                                            {review.outlook.shortTerm?.bear && (<div><span className="font-medium">Bear:</span> {toDisplay(review.outlook.shortTerm.bear)}</div>)}
                                        </div>
                                    </div>
                                    <div className="rounded-lg border p-3 bg-white dark:bg-gray-800">
                                        <div className="text-sm font-semibold mb-2">Long-term</div>
                                        <div className="space-y-1 text-sm">
                                            {review.outlook.longTerm?.base && (<div><span className="font-medium">Base:</span> {toDisplay(review.outlook.longTerm.base)}</div>)}
                                            {review.outlook.longTerm?.bull && (<div><span className="font-medium">Bull:</span> {toDisplay(review.outlook.longTerm.bull)}</div>)}
                                            {review.outlook.longTerm?.bear && (<div><span className="font-medium">Bear:</span> {toDisplay(review.outlook.longTerm.bear)}</div>)}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Risks & Diversification */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {review.risks && (
                                <Card>
                                    <CardHeader><CardTitle>Risks</CardTitle></CardHeader>
                                    <CardContent>
                                        {typeof review.risks === 'string' ? (
                                            <p className="text-sm">{review.risks}</p>
                                        ) : (
                                            <ul className="list-disc pl-5 space-y-2 text-sm">
                                                {Object.entries(review.risks).map(([k, v]: any, i) => (
                                                    <li key={i}><span className="font-medium">{titleize(k)}:</span> {toDisplay(v)}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {review.diversification && (
                                <div className="space-y-4">
                                    <Card>
                                        <CardHeader><CardTitle>Diversification</CardTitle></CardHeader>
                                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {'assetClass' in review.diversification && (
                                                <Distribution title="Asset Class" data={review.diversification.assetClass} />
                                            )}
                                            {'sector' in review.diversification && (
                                                <Distribution title="Sector" data={review.diversification.sector} />
                                            )}
                                            {'region' in review.diversification && (
                                                <Distribution title="Region" data={review.diversification.region} />
                                            )}
                                            {'marketCap' in review.diversification && (
                                                <Distribution title="Market Cap" data={review.diversification.marketCap} />
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </div>

                        <div className="pt-2">
                            <Button onClick={saveReview}>Save Review</Button>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    )
}


