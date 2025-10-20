// Price fetching utility for manual assets
// Uses server-side API route to avoid CORS issues

export async function fetchManualAssetPrices(
    symbols: { symbol: string; assetType: 'crypto' | 'equity' | 'manual' }[]
): Promise<{
    [symbol: string]: {
        currentPrice: number
        previousClose?: number
    }
}> {
    try {
        // Call our server-side API route to fetch prices
        const response = await fetch('/api/fetch-prices', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ symbols }),
        })

        if (!response.ok) {
            console.error('Failed to fetch prices from API:', response.statusText)
            return {}
        }

        const data = await response.json()
        return data.prices || {}
    } catch (error) {
        console.error('Error fetching prices:', error)
        return {}
    }
}

// Kept for backward compatibility with other parts of the app
export interface ComprehensiveAssetData {
    symbol: string
    name: string
    currentPrice: number
    marketCap?: number
    volume?: number
    peRatio?: number
    dividendYield?: number
    beta?: number
    dayHigh?: number
    dayLow?: number
    open?: number
    previousClose?: number
    change?: number
    changePercent?: number
}

export async function fetchComprehensiveAssetData(symbol: string): Promise<ComprehensiveAssetData | null> {
    // This function is not currently used but kept for future enhancements
    console.warn('fetchComprehensiveAssetData is deprecated and not implemented')
    return null
}
