'use client'

import { Suspense } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { PortfolioDashboard } from '@/components/portfolio/portfolio-dashboard'
import { PortfolioSelector } from '@/components/portfolio/portfolio-selector'
import { useAuthStore } from '@/stores/auth-store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const { user, isLoading } = useAuthStore()
  const router = useRouter()

  console.log('🏠 HomePage render:', {
    user: user ? { id: user.id, email: user.email } : null,
    isLoading,
    hasUser: !!user
  })

  useEffect(() => {
    console.log('🔄 HomePage useEffect:', {
      user: user ? { id: user.id, email: user.email } : null,
      isLoading,
      hasUser: !!user
    })

    // Only redirect if we're not loading and have no user
    if (!isLoading && !user) {
      console.log('🔀 Redirecting to auth page - no user and not loading')
      router.push('/auth')
    } else if (!isLoading && user) {
      console.log('✅ User is authenticated, showing portfolio')
    }
  }, [user, isLoading, router])

  // Show loading spinner while checking authentication
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

  // If no user after loading, the useEffect will redirect
  if (!user) {
    return null
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Portfolio Overview</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Track your cryptocurrency, stocks, and ETF investments and performance
            </p>
          </div>
          <div className="flex-shrink-0">
            <PortfolioSelector />
          </div>
        </div>

        <Suspense fallback={<PortfolioSkeleton />}>
          <PortfolioDashboard />
        </Suspense>
      </div>
    </MainLayout>
  )
}

function PortfolioSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}