'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

interface SavedAnalysis {
    id: string
    created_at: string
    symbol: string
    name: string
    payload: unknown
}

export default function AnalysisPage() {
    const { user } = useAuthStore()
    const [items, setItems] = useState<SavedAnalysis[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const [deletingId, setDeletingId] = useState<string | null>(null)

    useEffect(() => {
        async function load() {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                const headers = new Headers()
                if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)
                const res = await fetch('/api/analysis', { headers })
                const data = await res.json()
                if (Array.isArray(data)) setItems(data)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    return (
        <MainLayout>
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Saved Analyses</h1>
                {loading ? (
                    <p className="text-sm text-gray-500">Loading…</p>
                ) : items.length === 0 ? (
                    <p className="text-sm text-gray-500">No saved analyses yet.</p>
                ) : (
                    <>
                        <h2 className="text-lg font-semibold mt-2">Portfolio Reviews</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {items.filter(i => (i as any).payload && (i as any).payload.type === 'portfolio_review').map(item => (
                                <Card
                                    key={item.id}
                                    className="border-2 bg-white/70 dark:bg-gray-900/50 cursor-pointer shadow-sm hover:shadow-md"
                                    style={{ borderColor: 'hsl(0deg 0% 58.42%)' }}
                                    onClick={() => {
                                        const id = `saved_review_${item.id}`
                                        try {
                                            const payload = (item as any).payload
                                            const review = payload?.review || payload
                                            sessionStorage.setItem(id, JSON.stringify(review))
                                            router.push(`/portfolio-review?id=${encodeURIComponent(id)}`)
                                        } catch { }
                                    }}
                                >
                                    <CardHeader className="flex-row items-start justify-between">
                                        <CardTitle className="pr-2">{item.symbol} – {item.name}</CardTitle>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation()
                                                setDeletingId(item.id)
                                                try {
                                                    const { data: { session } } = await supabase.auth.getSession()
                                                    const headers = new Headers()
                                                    if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)
                                                    const res = await fetch(`/api/analysis?id=${encodeURIComponent(item.id)}`, { method: 'DELETE', headers })
                                                    if (res.ok) setItems(prev => prev.filter(x => x.id !== item.id))
                                                } finally {
                                                    setDeletingId(null)
                                                }
                                            }}
                                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                                            title="Delete saved analysis"
                                            aria-label="Delete saved analysis"
                                        >
                                            <Trash2 className={`w-4 h-4 ${deletingId === item.id ? 'opacity-40' : ''}`} />
                                        </button>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-xs text-gray-500">Saved {new Date(item.created_at).toLocaleString()}</div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                        <h2 className="text-lg font-semibold">Saved Asset Analyses</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {items.filter(i => !(i as any).payload || (i as any).payload.type !== 'portfolio_review').map(item => (
                                <Card
                                    key={item.id}
                                    className="border-2 bg-white/70 dark:bg-gray-900/50 cursor-pointer shadow-sm hover:shadow-md"
                                    style={{ borderColor: 'hsl(0deg 0% 58.42%)' }}
                                    onClick={() => {
                                        const id = `saved_${item.id}`
                                        try {
                                            sessionStorage.setItem(id, JSON.stringify({
                                                requestId: id,
                                                timestamp: item.created_at,
                                                portfolioType: 'mixed',
                                                userQuery: 'Saved analysis',
                                                assets: Array.isArray((item as any).payload?.assets) ? (item as any).payload.assets : [item.payload],
                                                summary: '',
                                                disclaimer: 'Saved analysis',
                                            }))
                                            router.push(`/ai-screener/results?id=${encodeURIComponent(id)}`)
                                        } catch { }
                                    }}
                                >
                                    <CardHeader className="flex-row items-start justify-between">
                                        <CardTitle className="pr-2">{item.symbol} – {item.name}</CardTitle>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation()
                                                setDeletingId(item.id)
                                                try {
                                                    const { data: { session } } = await supabase.auth.getSession()
                                                    const headers = new Headers()
                                                    if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)
                                                    const res = await fetch(`/api/analysis?id=${encodeURIComponent(item.id)}`, { method: 'DELETE', headers })
                                                    if (res.ok) setItems(prev => prev.filter(x => x.id !== item.id))
                                                } finally {
                                                    setDeletingId(null)
                                                }
                                            }}
                                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                                            title="Delete saved analysis"
                                            aria-label="Delete saved analysis"
                                        >
                                            <Trash2 className={`w-4 h-4 ${deletingId === item.id ? 'opacity-40' : ''}`} />
                                        </button>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-xs text-gray-500">Saved {new Date(item.created_at).toLocaleString()}</div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </MainLayout>
    )
}


