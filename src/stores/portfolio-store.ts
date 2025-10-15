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
            // Get current session token
            const { data: { session } } = await supabase.auth.getSession()

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

            // Fetch portfolio data from API
            console.log('Fetching portfolio from API...')
            const response = await fetch('/api/kraken/portfolio', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            })
            console.log('Response status:', response.status)

            if (!response.ok) {
                const errorText = await response.text()
                console.error('API error response:', errorText)
                let error
                try {
                    error = JSON.parse(errorText)
                } catch {
                    error = { error: errorText }
                }

                // Check if it's a nonce error and retry once
                if (errorText.includes('Invalid nonce') || error.error?.includes('Invalid nonce')) {
                    console.log('Nonce error detected, retrying...')
                    await new Promise(resolve => setTimeout(resolve, 1000)) // Wait longer before retry

                    try {
                        const retryResponse = await fetch('/api/kraken/portfolio', {
                            headers: {
                                'Authorization': `Bearer ${session.access_token}`
                            }
                        })

                        if (retryResponse.ok) {
                            const portfolioData = await retryResponse.json()
                            console.log('Retry successful, portfolio data received:', portfolioData)

                            // Include manual assets
                            const { data: manualAssets } = await supabase
                                .from('manual_assets')
                                .select('*')
                                .eq('user_id', session.user.id)

                            // If we have manual assets, fetch real prices for supported tickers
                            if (manualAssets && manualAssets.length > 0) {
                                const manualSymbols = manualAssets.map(asset => asset.symbol)
                                console.log('Fetching prices for manual assets:', manualSymbols)

                                // Fetch real prices for supported tickers
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

                                    if (realPriceData && previousPrice > 0) {
                                        const previousValue = quantity * previousPrice
                                        dailyPnL = value - previousValue
                                        dailyPnLPercentage = previousValue > 0 ? (dailyPnL / previousValue) * 100 : 0

                                        // Calculate unrealized P&L using cost basis
                                        unrealizedPnL = value - costBasis
                                        unrealizedPnLPercentage = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0

                                        console.log(`${asset.symbol}: Current $${currentPrice}, Previous $${previousPrice}, Daily P&L $${dailyPnL.toFixed(2)}`)
                                    }

                                    // Clean up symbol and name for display
                                    const cleanSymbol = asset.symbol.endsWith('.EQ') ? asset.symbol.replace('.EQ', '') : asset.symbol
                                    const cleanName = asset.name.endsWith('.EQ') ? asset.name.replace('.EQ', '') : asset.name

                                    return {
                                        symbol: asset.symbol, // Keep original symbol for processing
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

                                const apiTotalValue = portfolioData.totalValue || 0
                                const apiDailyPnL = portfolioData.totalDailyPnL || 0
                                const apiCostBasis = portfolioData.totalCostBasis || 0
                                const apiUnrealizedPnL = portfolioData.totalUnrealizedPnL || 0

                                portfolioData.assets = [...portfolioData.assets, ...manualPortfolioAssets]

                                // Aggregate manual totals
                                const manualValueSum = manualPortfolioAssets.reduce((sum, a) => sum + (a.value || 0), 0)
                                const manualDailyPnLSum = manualPortfolioAssets.reduce((sum, a) => sum + (a.dailyPnL || 0), 0)
                                const manualOpenTotal = manualPortfolioAssets.reduce((sum, a) => sum + ((a.value || 0) - (a.dailyPnL || 0)), 0)
                                const manualCostBasisSum = manualPortfolioAssets.reduce((sum, a) => sum + safeNumber(a.costBasis), 0)
                                const manualUnrealizedPnLSum = manualPortfolioAssets.reduce((sum, a) => sum + safeNumber(a.unrealizedPnL), 0)

                                // Combine with API totals
                                portfolioData.totalValue = apiTotalValue + manualValueSum
                                portfolioData.totalDailyPnL = apiDailyPnL + manualDailyPnLSum
                                portfolioData.totalCostBasis = apiCostBasis + manualCostBasisSum
                                portfolioData.totalUnrealizedPnL = apiUnrealizedPnL + manualUnrealizedPnLSum
                                const apiOpenTotal = apiTotalValue - apiDailyPnL
                                const combinedOpenTotal = apiOpenTotal + manualOpenTotal
                                portfolioData.totalDailyPnLPercentage = combinedOpenTotal > 0
                                    ? (portfolioData.totalDailyPnL / combinedOpenTotal) * 100
                                    : 0
                                const combinedCostBasis = portfolioData.totalCostBasis || 0
                                portfolioData.totalUnrealizedPnLPercentage = combinedCostBasis > 0
                                    ? (portfolioData.totalUnrealizedPnL / combinedCostBasis) * 100
                                    : 0
                            }

                            set({ portfolio: portfolioData as Portfolio, isLoading: false })
                            return
                        } else {
                            // Retry also failed, use the retry error for the final error
                            const retryErrorText = await retryResponse.text()
                            console.error('Retry also failed:', retryErrorText)
                            error = { error: retryErrorText }
                        }
                    } catch (retryError) {
                        console.error('Retry failed with exception:', retryError)
                        // Continue with original error
                    }
                }

                throw new Error(error.error || 'Failed to fetch portfolio')
            }

            const portfolioData = await response.json()
            console.log('Portfolio data received:', portfolioData)

            // Include manual assets
            const { data: manualAssets } = await supabase
                .from('manual_assets')
                .select('*')
                .eq('user_id', session.user.id)

            // If we have manual assets, fetch real prices for supported tickers
            if (manualAssets && manualAssets.length > 0) {
                const manualSymbols = manualAssets.map(asset => asset.symbol)
                console.log('Fetching prices for manual assets (retry):', manualSymbols)

                // Fetch real prices for supported tickers
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

                        console.log(`${asset.symbol} (retry): Current $${currentPrice}, Previous $${previousPrice}, Daily P&L $${dailyPnL.toFixed(2)}`)
                    }

                    // Clean up symbol and name for display
                    const cleanSymbol = asset.symbol.endsWith('.EQ') ? asset.symbol.replace('.EQ', '') : asset.symbol
                    const cleanName = asset.name.endsWith('.EQ') ? asset.name.replace('.EQ', '') : asset.name

                    return {
                        symbol: asset.symbol, // Keep original symbol for processing
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

                const apiTotalValue2 = portfolioData.totalValue || 0
                const apiDailyPnL2 = portfolioData.totalDailyPnL || 0
                const apiCostBasis2 = portfolioData.totalCostBasis || 0
                const apiUnrealizedPnL2 = portfolioData.totalUnrealizedPnL || 0

                portfolioData.assets = [...portfolioData.assets, ...manualPortfolioAssets]

                const manualValueSum2 = manualPortfolioAssets.reduce((sum, a) => sum + (a.value || 0), 0)
                const manualDailyPnLSum2 = manualPortfolioAssets.reduce((sum, a) => sum + (a.dailyPnL || 0), 0)
                const manualOpenTotal2 = manualPortfolioAssets.reduce((sum, a) => sum + ((a.value || 0) - (a.dailyPnL || 0)), 0)
                const manualCostBasisSum2 = manualPortfolioAssets.reduce((sum, a) => sum + safeNumber(a.costBasis), 0)
                const manualUnrealizedPnLSum2 = manualPortfolioAssets.reduce((sum, a) => sum + safeNumber(a.unrealizedPnL), 0)

                portfolioData.totalValue = apiTotalValue2 + manualValueSum2
                portfolioData.totalDailyPnL = apiDailyPnL2 + manualDailyPnLSum2
                portfolioData.totalCostBasis = apiCostBasis2 + manualCostBasisSum2
                portfolioData.totalUnrealizedPnL = apiUnrealizedPnL2 + manualUnrealizedPnLSum2
                const apiOpenTotal2 = apiTotalValue2 - apiDailyPnL2
                const combinedOpenTotal2 = apiOpenTotal2 + manualOpenTotal2
                portfolioData.totalDailyPnLPercentage = combinedOpenTotal2 > 0
                    ? (portfolioData.totalDailyPnL / combinedOpenTotal2) * 100
                    : 0
                const combinedCostBasis2 = portfolioData.totalCostBasis || 0
                portfolioData.totalUnrealizedPnLPercentage = combinedCostBasis2 > 0
                    ? (portfolioData.totalUnrealizedPnL / combinedCostBasis2) * 100
                    : 0
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
            const { data: { session } } = await supabase.auth.getSession()

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
            const { data: { session } } = await supabase.auth.getSession()

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
            const { data: { session } } = await supabase.auth.getSession()

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
