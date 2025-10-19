import { create } from 'zustand'
import type { Portfolio, ManualAsset, LoadingState } from '@/types'
import { supabase } from '@/lib/supabase'
import { fetchManualAssetPrices } from '@/lib/price-fetcher'

interface PortfolioStore extends LoadingState {
    portfolio: Portfolio | null
    manualAssets: ManualAsset[]
    refreshPortfolio: () => Promise<void>
    addManualAsset: (asset: Omit<ManualAsset, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>
    updateManualAsset: (id: string, asset: Partial<ManualAsset>) => Promise<void>
    deleteManualAsset: (id: string) => Promise<void>
    refreshManualAssets: () => Promise<void>
    updateAssetCostBasis: (symbol: string, assetType: 'crypto' | 'equity' | 'manual', costBasis: number) => Promise<void>
}

export const usePortfolioStore = create<PortfolioStore>((set) => ({
    portfolio: null,
    manualAssets: [],
    isLoading: false,
    error: null,

    refreshPortfolio: async () => {
        set({ isLoading: true, error: null })

        try {
            // Get current session token with error handling
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()

            if (sessionError) {
                console.warn('⚠️ Session error in portfolio refresh:', sessionError.message)
                if (sessionError.message.includes('Refresh Token') || sessionError.message.includes('refresh_token_not_found')) {
                    throw new Error('Session expired. Please refresh the page.')
                }
                throw new Error('Authentication error')
            }

            if (!session) {
                throw new Error('Not authenticated')
            }

            // Demo mode for a specific user email
            if (session.user.email && session.user.email.toLowerCase() === 'skalamera@live.com') {
                const demoPortfolio = buildDemoPortfolio()
                set({ portfolio: demoPortfolio, isLoading: false })
                return
            }

            // Small delay to ensure auth state is stable
            await new Promise(resolve => setTimeout(resolve, 100))

            // First, check if we have manual assets - if so, we can show a portfolio even without API keys
            const { data: manualAssets } = await supabase
                .from('manual_assets')
                .select('*')
                .eq('user_id', session.user.id)

            let portfolioData: any = null
            let hasApiData = false

            // Try to fetch from Kraken API, but don't fail if it doesn't work
            try {
                console.log('Fetching portfolio from API...')
                const response = await fetch('/api/kraken/portfolio', {
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`
                    }
                })

                if (response.ok) {
                    portfolioData = await response.json()
                    console.log('Portfolio data received from API:', portfolioData)
                    hasApiData = true
                } else {
                    console.log('API request failed, will use manual assets only')
                }
            } catch (apiError) {
                console.log('API not available, will use manual assets only:', apiError)
            }

            // If we have manual assets, create a portfolio from them
            if (manualAssets && manualAssets.length > 0) {
                console.log('Processing manual assets:', manualAssets.length)

                // If we don't have API data, create a basic portfolio structure
                if (!hasApiData) {
                    portfolioData = {
                        assets: [],
                        totalValue: 0,
                        totalDailyPnL: 0,
                        totalDailyPnLPercentage: 0,
                        totalCostBasis: 0,
                        totalUnrealizedPnL: 0,
                        totalUnrealizedPnLPercentage: 0,
                        lastUpdated: new Date().toISOString()
                    }
                }

                // Fetch real prices for supported tickers
                const manualSymbols = manualAssets.map(asset => asset.symbol)
                const manualPrices = await fetchManualAssetPrices(manualSymbols)

                const manualPortfolioAssets = manualAssets.map(asset => {
                    const realPriceData = manualPrices[asset.symbol]
                    const currentPrice = realPriceData?.currentPrice || parseFloat(asset.cost_basis)
                    const previousPrice = realPriceData && typeof realPriceData.previousClose === 'number' && realPriceData.previousClose > 0
                        ? realPriceData.previousClose
                        : currentPrice
                    const quantity = parseFloat(asset.quantity)
                    const costBasis = parseFloat(asset.cost_basis)
                    const value = quantity * currentPrice

                    // Calculate P&L if we have a real price
                    let dailyPnL = 0
                    let dailyPnLPercentage = 0
                    let unrealizedPnL = 0
                    let unrealizedPnLPercentage = 0

                    if (previousPrice > 0) {
                        const previousValue = quantity * previousPrice
                        dailyPnL = value - previousValue
                        dailyPnLPercentage = previousValue > 0 ? (dailyPnL / previousValue) * 100 : 0

                        // Calculate unrealized P&L using cost basis
                        unrealizedPnL = value - costBasis
                        unrealizedPnLPercentage = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0
                    }

                    // Clean up symbol and name for display
                    const cleanSymbol = asset.symbol.endsWith('.EQ') ? asset.symbol.replace('.EQ', '') : asset.symbol
                    const cleanName = asset.name.endsWith('.EQ') ? asset.name.replace('.EQ', '') : asset.name

                    return {
                        symbol: asset.symbol,
                        name: cleanName,
                        asset_type: asset.asset_type,
                        balance: quantity,
                        currentPrice,
                        costBasis,
                        value,
                        dailyPnL,
                        dailyPnLPercentage,
                        unrealizedPnL,
                        unrealizedPnLPercentage,
                        source: 'manual' as const,
                        manualId: asset.id,
                        ...(currentPrice === costBasis ? { note: 'No real-time price data available' } : {})
                    }
                })

                // Combine API assets with manual assets
                if (hasApiData && portfolioData) {
                    portfolioData.assets = [...(portfolioData.assets || []), ...manualPortfolioAssets]

                    // Aggregate manual totals
                    const manualValueSum = manualPortfolioAssets.reduce((sum, a) => sum + (a.value || 0), 0)
                    const manualDailyPnLSum = manualPortfolioAssets.reduce((sum, a) => sum + (a.dailyPnL || 0), 0)
                    const manualCostBasisSum = manualPortfolioAssets.reduce((sum, a) => sum + safeNumber(a.costBasis), 0)
                    const manualUnrealizedPnLSum = manualPortfolioAssets.reduce((sum, a) => sum + safeNumber(a.unrealizedPnL), 0)

                    // Combine with API totals
                    portfolioData.totalValue = (portfolioData.totalValue || 0) + manualValueSum
                    portfolioData.totalDailyPnL = (portfolioData.totalDailyPnL || 0) + manualDailyPnLSum
                    portfolioData.totalCostBasis = (portfolioData.totalCostBasis || 0) + manualCostBasisSum
                    portfolioData.totalUnrealizedPnL = (portfolioData.totalUnrealizedPnL || 0) + manualUnrealizedPnLSum

                    const apiOpenTotal = (portfolioData.totalValue || 0) - (portfolioData.totalDailyPnL || 0)
                    const manualOpenTotal = manualPortfolioAssets.reduce((sum, a) => sum + ((a.value || 0) - (a.dailyPnL || 0)), 0)
                    const combinedOpenTotal = apiOpenTotal + manualOpenTotal

                    portfolioData.totalDailyPnLPercentage = combinedOpenTotal > 0
                        ? (portfolioData.totalDailyPnL / combinedOpenTotal) * 100
                        : 0

                    const combinedCostBasis = portfolioData.totalCostBasis || 0
                    portfolioData.totalUnrealizedPnLPercentage = combinedCostBasis > 0
                        ? (portfolioData.totalUnrealizedPnL / combinedCostBasis) * 100
                        : 0
                } else {
                    // Only manual assets - use them as the complete portfolio
                    portfolioData.assets = manualPortfolioAssets
                    portfolioData.totalValue = manualPortfolioAssets.reduce((sum, a) => sum + (a.value || 0), 0)
                    portfolioData.totalDailyPnL = manualPortfolioAssets.reduce((sum, a) => sum + (a.dailyPnL || 0), 0)
                    portfolioData.totalCostBasis = manualPortfolioAssets.reduce((sum, a) => sum + safeNumber(a.costBasis), 0)
                    portfolioData.totalUnrealizedPnL = manualPortfolioAssets.reduce((sum, a) => sum + safeNumber(a.unrealizedPnL), 0)

                    const manualOpenTotal = manualPortfolioAssets.reduce((sum, a) => sum + ((a.value || 0) - (a.dailyPnL || 0)), 0)
                    portfolioData.totalDailyPnLPercentage = manualOpenTotal > 0
                        ? (portfolioData.totalDailyPnL / manualOpenTotal) * 100
                        : 0

                    portfolioData.totalUnrealizedPnLPercentage = portfolioData.totalCostBasis > 0
                        ? (portfolioData.totalUnrealizedPnL / portfolioData.totalCostBasis) * 100
                        : 0
                }
            } else if (!hasApiData) {
                // No manual assets and no API data - this is when we should show an error
                throw new Error('No API keys found. Please configure your Kraken API keys in settings.')
            }

            set({ portfolio: portfolioData as Portfolio, isLoading: false })
        } catch (error) {
            console.error('Failed to refresh portfolio:', error)
            set({
                error: error instanceof Error ? error.message : 'Failed to refresh portfolio',
                isLoading: false,
            })
        }
    },

    addManualAsset: async (assetData) => {
        set({ isLoading: true, error: null })

        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()

            if (sessionError) {
                console.warn('⚠️ Session error:', sessionError.message)
                if (sessionError.message.includes('Refresh Token') || sessionError.message.includes('refresh_token_not_found')) {
                    throw new Error('Session expired. Please refresh the page.')
                }
                throw new Error('Authentication error')
            }

            if (!session) {
                throw new Error('Not authenticated')
            }

            const { data, error } = await supabase
                .from('manual_assets')
                .insert({
                    user_id: session.user.id,
                    ...assetData
                })
                .select()
                .single()

            if (error) throw error

            set((state) => ({
                manualAssets: [...state.manualAssets, data as ManualAsset],
                isLoading: false,
            }))

            // Refresh portfolio to include new asset
            const store = usePortfolioStore.getState()
            store.refreshPortfolio()
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to add manual asset',
                isLoading: false,
            })
        }
    },

    updateManualAsset: async (id, assetData) => {
        set({ isLoading: true, error: null })

        try {
            const { data, error } = await supabase
                .from('manual_assets')
                .update(assetData)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error

            set((state) => ({
                manualAssets: state.manualAssets.map((asset) =>
                    asset.id === id ? (data as ManualAsset) : asset
                ),
                isLoading: false,
            }))

            // Refresh portfolio to update values
            const store = usePortfolioStore.getState()
            store.refreshPortfolio()
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to update manual asset',
                isLoading: false,
            })
        }
    },

    deleteManualAsset: async (id) => {
        set({ isLoading: true, error: null })

        try {
            const { error } = await supabase
                .from('manual_assets')
                .delete()
                .eq('id', id)

            if (error) throw error

            set((state) => ({
                manualAssets: state.manualAssets.filter((asset) => asset.id !== id),
                isLoading: false,
            }))

            // Refresh portfolio to update values
            const store = usePortfolioStore.getState()
            store.refreshPortfolio()
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to delete manual asset',
                isLoading: false,
            })
        }
    },

    refreshManualAssets: async () => {
        set({ isLoading: true, error: null })

        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()

            if (sessionError) {
                console.warn('⚠️ Session error:', sessionError.message)
                if (sessionError.message.includes('Refresh Token') || sessionError.message.includes('refresh_token_not_found')) {
                    throw new Error('Session expired. Please refresh the page.')
                }
                throw new Error('Authentication error')
            }

            if (!session) {
                throw new Error('Not authenticated')
            }

            const { data, error } = await supabase
                .from('manual_assets')
                .select('*')
                .eq('user_id', session.user.id)

            if (error) throw error

            set({ manualAssets: (data as ManualAsset[]) || [], isLoading: false })
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to refresh manual assets',
                isLoading: false,
            })
        }
    },

    updateAssetCostBasis: async (symbol: string, assetType: 'crypto' | 'equity' | 'manual', costBasis: number) => {
        set({ isLoading: true, error: null })

        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()

            if (sessionError) {
                console.warn('⚠️ Session error:', sessionError.message)
                if (sessionError.message.includes('Refresh Token') || sessionError.message.includes('refresh_token_not_found')) {
                    throw new Error('Session expired. Please refresh the page.')
                }
                throw new Error('Authentication error')
            }

            if (!session) {
                throw new Error('Not authenticated')
            }

            // Check if cost basis already exists
            const { data: existing } = await supabase
                .from('asset_cost_basis')
                .select('id')
                .eq('user_id', session.user.id)
                .eq('symbol', symbol)
                .eq('asset_type', assetType)
                .single()

            if (existing) {
                // Update existing cost basis
                const { error: updateError } = await supabase
                    .from('asset_cost_basis')
                    .update({ cost_basis: costBasis })
                    .eq('id', existing.id)

                if (updateError) throw updateError
            } else {
                // Insert new cost basis
                const { error: insertError } = await supabase
                    .from('asset_cost_basis')
                    .insert({
                        user_id: session.user.id,
                        symbol,
                        asset_type: assetType,
                        cost_basis: costBasis
                    })

                if (insertError) throw insertError
            }

            set({ isLoading: false })

            // Refresh portfolio to show updated cost basis
            const store = usePortfolioStore.getState()
            store.refreshPortfolio()
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to update cost basis',
                isLoading: false,
            })
        }
    },
}))

function safeNumber(value: number | undefined | null): number {
    if (typeof value !== 'number' || Number.isNaN(value)) return 0
    return value
}

// ---------- Demo Mode Helpers ----------
function buildDemoPortfolio(): Portfolio {
    type Seed = { symbol: string; name: string; balance: number; current: number; previous: number; costBasis: number; equity?: boolean }

    const seeds: Seed[] = [
        // Crypto
        { symbol: 'BTC', name: 'Bitcoin', balance: 0.334324, current: 65000, previous: 64000, costBasis: 40045.7 },
        { symbol: 'ETH', name: 'Ethereum', balance: 0.51178, current: 3200, previous: 3100, costBasis: 2311.69 },
        { symbol: 'XRP', name: 'Ripple', balance: 86.88974, current: 0.55, previous: 0.53, costBasis: 243 },
        // Stocks & ETFs
        { symbol: 'AAPL', name: 'Apple Inc.', balance: 25, current: 190, previous: 188, costBasis: 4000, equity: true },
        { symbol: 'NVDA', name: 'NVIDIA Corporation', balance: 5, current: 1100, previous: 1080, costBasis: 4500, equity: true },
        { symbol: 'SPY', name: 'SPDR S&P 500 ETF', balance: 5, current: 510, previous: 505, costBasis: 2400, equity: true },
    ]

    const assets = seeds.map(seed => toPortfolioAsset(seed))
    const totalValue = assets.reduce((s, a) => s + a.value, 0)
    const totalDailyPnL = assets.reduce((s, a) => s + a.dailyPnL, 0)
    const previousTotal = assets.reduce((s, a) => s + (a.value - a.dailyPnL), 0)
    const totalDailyPnLPercentage = previousTotal > 0 ? (totalDailyPnL / previousTotal) * 100 : 0

    return {
        assets,
        totalValue,
        totalDailyPnL,
        totalDailyPnLPercentage,
        lastUpdated: new Date().toISOString(),
    }
}

function toPortfolioAsset(seed: { symbol: string; name: string; balance: number; current: number; previous: number; costBasis: number; equity?: boolean }): Portfolio['assets'][number] {
    const symbol = seed.equity ? `${seed.symbol}.EQ` : seed.symbol
    const value = seed.balance * seed.current
    const previousValue = seed.balance * seed.previous
    const dailyPnL = value - previousValue
    const dailyPnLPercentage = previousValue > 0 ? (dailyPnL / previousValue) * 100 : 0
    const unrealizedPnL = value - seed.costBasis
    const unrealizedPnLPercentage = seed.costBasis > 0 ? (unrealizedPnL / seed.costBasis) * 100 : 0

    return {
        symbol,
        name: seed.name,
        asset_type: seed.equity ? 'equity' : 'crypto',
        balance: seed.balance,
        currentPrice: seed.current,
        costBasis: seed.costBasis,
        value,
        dailyPnL,
        dailyPnLPercentage,
        unrealizedPnL,
        unrealizedPnLPercentage,
        source: 'kraken',
    }
}
