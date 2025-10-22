import { create } from 'zustand'
import type { Portfolio, ManualAsset, LoadingState } from '@/types'
import { supabase } from '@/lib/supabase'
import { fetchManualAssetPrices } from '@/lib/price-fetcher'

interface PortfolioData {
    id: string
    name: string
    description?: string
    is_default: boolean
    created_at: string
    updated_at: string
}

interface PortfolioStore extends LoadingState {
    // Multiple portfolios
    portfolios: PortfolioData[]
    selectedPortfolioId: string | null
    isLoadingPortfolios: boolean

    // Current portfolio data
    portfolio: Portfolio | null
    manualAssets: ManualAsset[]

    // Portfolio management
    fetchPortfolios: () => Promise<void>
    setSelectedPortfolio: (portfolioId: string) => void
    createPortfolio: (name: string, description?: string) => Promise<void>
    deletePortfolio: (portfolioId: string) => Promise<void>
    setDefaultPortfolio: (portfolioId: string) => Promise<void>

    // Asset management (for selected portfolio)
    refreshPortfolio: () => Promise<void>
    addManualAsset: (asset: Omit<ManualAsset, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>
    updateManualAsset: (id: string, asset: Partial<ManualAsset>) => Promise<void>
    deleteManualAsset: (id: string) => Promise<void>
    refreshManualAssets: () => Promise<void>
    updateAssetCostBasis: (symbol: string, assetType: 'crypto' | 'equity' | 'manual', costBasis: number) => Promise<void>
}

export const usePortfolioStore = create<PortfolioStore>((set, get) => ({
    // Multiple portfolios
    portfolios: [],
    selectedPortfolioId: null,
    isLoadingPortfolios: false,

    // Current portfolio data
    portfolio: null,
    manualAssets: [],
    isLoading: false,
    error: null,

    // Portfolio management methods
    fetchPortfolios: async () => {
        set({ isLoadingPortfolios: true })
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('Not authenticated')

            const response = await fetch('/api/portfolios', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            })

            if (!response.ok) {
                throw new Error('Failed to fetch portfolios')
            }

            const { portfolios } = await response.json()

            // Set selected portfolio to default if not set, or first portfolio
            const currentSelected = get().selectedPortfolioId
            let selectedId = currentSelected

            if (!selectedId || !portfolios.find((p: PortfolioData) => p.id === selectedId)) {
                const defaultPortfolio = portfolios.find((p: PortfolioData) => p.is_default)
                selectedId = defaultPortfolio?.id || portfolios[0]?.id || null
            }

            set({
                portfolios,
                selectedPortfolioId: selectedId,
                isLoadingPortfolios: false
            })

            // Refresh portfolio data for selected portfolio
            if (selectedId) {
                await get().refreshPortfolio()
            }
        } catch (error) {
            console.error('Failed to fetch portfolios:', error)
            set({
                error: error instanceof Error ? error.message : 'Failed to fetch portfolios',
                isLoadingPortfolios: false
            })
        }
    },

    setSelectedPortfolio: (portfolioId: string) => {
        set({ selectedPortfolioId: portfolioId })
        // Refresh portfolio data when selection changes
        get().refreshPortfolio()
    },

    createPortfolio: async (name: string, description?: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('Not authenticated')

            const response = await fetch('/api/portfolios', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, description })
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to create portfolio')
            }

            const { portfolio } = await response.json()

            set(state => ({
                portfolios: [...state.portfolios, portfolio]
            }))
        } catch (error) {
            console.error('Failed to create portfolio:', error)
            throw error
        }
    },

    deletePortfolio: async (portfolioId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('Not authenticated')

            const response = await fetch(`/api/portfolios/${portfolioId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to delete portfolio')
            }

            set(state => ({
                portfolios: state.portfolios.filter(p => p.id !== portfolioId),
                selectedPortfolioId: state.selectedPortfolioId === portfolioId
                    ? state.portfolios.find(p => p.id !== portfolioId)?.id || null
                    : state.selectedPortfolioId
            }))
        } catch (error) {
            console.error('Failed to delete portfolio:', error)
            throw error
        }
    },

    setDefaultPortfolio: async (portfolioId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('Not authenticated')

            const response = await fetch(`/api/portfolios/${portfolioId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_default: true })
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to set default portfolio')
            }

            const { portfolio } = await response.json()

            set(state => ({
                portfolios: state.portfolios.map(p =>
                    p.id === portfolioId
                        ? { ...p, is_default: true }
                        : { ...p, is_default: false }
                )
            }))
        } catch (error) {
            console.error('Failed to set default portfolio:', error)
            throw error
        }
    },

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

            // Small delay to ensure auth state is stable
            await new Promise(resolve => setTimeout(resolve, 100))

            const selectedPortfolioId = get().selectedPortfolioId

            // Fetch assets from portfolio_assets table for the selected portfolio
            let manualAssets: any[] = []
            if (selectedPortfolioId) {
                const { data: portfolioAssets } = await supabase
                    .from('portfolio_assets')
                    .select('*')
                    .eq('portfolio_id', selectedPortfolioId)

                // Map portfolio_assets to match the manual_assets structure
                manualAssets = (portfolioAssets || []).map(asset => ({
                    id: asset.id,
                    user_id: session.user.id,
                    symbol: asset.symbol,
                    name: asset.name,
                    asset_type: asset.asset_type,
                    quantity: asset.quantity,
                    cost_basis: asset.cost_basis,
                    notes: asset.notes,
                    created_at: asset.created_at,
                    updated_at: asset.updated_at
                }))
            } else {
                // Fallback to old manual_assets table if no portfolio selected
                const { data: oldManualAssets } = await supabase
                    .from('manual_assets')
                    .select('*')
                    .eq('user_id', session.user.id)

                manualAssets = oldManualAssets || []
            }

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

                // Fetch real prices for all manual assets with their asset types
                const manualSymbolsWithTypes = manualAssets.map(asset => ({
                    symbol: asset.symbol,
                    assetType: asset.asset_type
                }))
                const manualPrices = await fetchManualAssetPrices(manualSymbolsWithTypes)

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

                    // Determine if we got real-time data
                    const hasRealTimeData = realPriceData && realPriceData.currentPrice !== parseFloat(asset.cost_basis)
                    const noteMessage = !hasRealTimeData
                        ? `No real-time price data available for ${asset.symbol}. Using cost basis. Check that the ticker symbol is correct.`
                        : undefined

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
                        ...(noteMessage ? { note: noteMessage } : {})
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
                // No manual assets and no API data - create an empty portfolio
                console.log('No manual assets and no API data - creating empty portfolio')
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

            const selectedPortfolioId = get().selectedPortfolioId

            // Fetch assets from portfolio_assets table for the selected portfolio
            let data: any[] = []
            if (selectedPortfolioId) {
                const { data: portfolioAssets, error } = await supabase
                    .from('portfolio_assets')
                    .select('*')
                    .eq('portfolio_id', selectedPortfolioId)

                if (error) throw error

                // Map portfolio_assets to match the manual_assets structure
                data = (portfolioAssets || []).map(asset => ({
                    id: asset.id,
                    user_id: session.user.id,
                    symbol: asset.symbol,
                    name: asset.name,
                    asset_type: asset.asset_type,
                    quantity: asset.quantity,
                    cost_basis: asset.cost_basis,
                    notes: asset.notes,
                    created_at: asset.created_at,
                    updated_at: asset.updated_at
                }))
            } else {
                // Fallback to old manual_assets table if no portfolio selected
                const { data: oldManualAssets, error } = await supabase
                    .from('manual_assets')
                    .select('*')
                    .eq('user_id', session.user.id)

                if (error) throw error
                data = oldManualAssets || []
            }

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

