'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
    children: React.ReactNode
}

export default function DemoTour({ children }: Props) {
    const [show, setShow] = useState(false)
    const [step, setStep] = useState(0)

    useEffect(() => {
        ; (async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) {
                    console.warn('⚠️ Demo tour session check error:', error.message)
                    return
                }

                const email = session?.user?.email?.toLowerCase()
                const seen = sessionStorage.getItem('demo_tour_seen')
                const savedStep = Number(sessionStorage.getItem('demo_tour_step') || '0')
                if (email === 'skalamera@live.com' && !seen) {
                    setStep(Number.isNaN(savedStep) ? 0 : savedStep)
                    setShow(true)
                }
            } catch (error) {
                console.warn('⚠️ Demo tour error:', error)
            }
        })()
    }, [])

    const steps = [
        { title: 'Welcome to jedana.fi ✨', body: 'Track your crypto, stocks, and ETFs in one place. Get AI-powered screening and portfolio reviews.' },
        { title: 'Portfolio 📊', body: 'See totals, P&L, and sections by asset type. Use the gold ✨ to get an AI portfolio review.', href: '/' },
        { title: 'AI Screener 🤖', body: 'Describe what you want and generate an investment report with charts, strengths/risks, and forecasts.', href: '/ai-screener' },
        { title: 'Saved 🔖', body: 'Your saved asset analyses and portfolio reviews live here. You can revisit or delete them.', href: '/analysis' }
    ]

    const goNext = () => {
        const next = step + 1
        if (next >= steps.length) {
            sessionStorage.setItem('demo_tour_seen', '1')
            sessionStorage.removeItem('demo_tour_step')
            setShow(false)
            return
        }
        setStep(next)
        sessionStorage.setItem('demo_tour_step', String(next))
        const href = steps[next].href
        if (href) window.location.href = href
    }

    return (
        <>
            {children}
            {show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="max-w-md w-[90%] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-xl">
                        <div className="text-xl font-bold mb-2">{steps[step].title}</div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 mb-4">{steps[step].body}</div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => { sessionStorage.setItem('demo_tour_seen', '1'); sessionStorage.removeItem('demo_tour_step'); setShow(false) }} className="px-3 py-1.5 rounded-md border text-sm">Skip</button>
                            <button onClick={goNext} className="px-3 py-1.5 rounded-md bg-amber-500 text-white text-sm">Next</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}


