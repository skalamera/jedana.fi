'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'

interface AuthProviderProps {
    children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
    const { isLoading } = useAuthStore()

    useEffect(() => {
        // Auth state is initialized in the store
    }, [])

    // Show loading only if we're actually checking auth status
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        )
    }

    return <>{children}</>
}
