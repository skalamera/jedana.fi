'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'

export default function ClearSessionPage() {
    const router = useRouter()
    const clearSession = useAuthStore((state) => state.clearSession)

    useEffect(() => {
        const handleClearSession = async () => {
            console.log('🧹 Clearing session from clear-session page...')
            await clearSession()
            console.log('✅ Session cleared, redirecting to home...')

            // Small delay to ensure everything is cleared
            setTimeout(() => {
                router.push('/')
            }, 500)
        }

        handleClearSession()
    }, [clearSession, router])

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Clearing session...</p>
            </div>
        </div>
    )
}
