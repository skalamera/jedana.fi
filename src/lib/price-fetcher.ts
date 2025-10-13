// Price fetching utility for manual assets
import axios from 'axios'

// Supported tickers for price fetching
const SUPPORTED_CRYPTO_TICKERS = [
    'BTC', 'ETH', 'ADA', 'SOL', 'DOT', 'AVAX', 'MATIC', 'LINK', 'UNI', 'AAVE',
    'LTC', 'XRP', 'BCH', 'ATOM', 'ALGO', 'NEAR', 'FLOW', 'APE', 'MANA', 'SAND',
    'GALA', 'ENJ', 'CRV', 'SUSHI'
]

const SUPPORTED_EQUITY_TICKERS = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX',
    'SPY', 'QQQ', 'VTI', 'VOO', 'VXUS', 'BND', 'GLD', 'SLV', 'ARKK', 'TQQQ', 'SQQQ'
]

export async function fetchManualAssetPrices(symbols: string[]): Promise<{
    [symbol: string]: {
        currentPrice: number
        previousClose?: number
    }
}> {
    const prices: { [symbol: string]: { currentPrice: number; previousClose?: number } } = {}

    for (const symbol of symbols) {
        try {
            // Check if it's a supported crypto ticker
            if (SUPPORTED_CRYPTO_TICKERS.includes(symbol)) {
                const data = await fetchCryptoPrice(symbol)
                if (data) {
                    prices[symbol] = data
                }
            }
            // Check if it's a supported equity ticker
            else if (SUPPORTED_EQUITY_TICKERS.includes(symbol)) {
                const priceData = await fetchEquityPrice(symbol)
                if (priceData) {
                    prices[symbol] = priceData
                }
            }
        } catch (error) {
            console.warn(`Failed to fetch price for ${symbol}:`, error)
        }
    }

    return prices
}

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
    try {
        // Use Yahoo Finance for comprehensive data
        const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryDetail,financialData,defaultKeyStatistics`

        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        })

        if (!response.data.quoteSummary?.result?.[0]) {
            return null
        }

        const result = response.data.quoteSummary.result[0]
        const quote = result.price || {}
        const summaryDetail = result.summaryDetail || {}
        const defaultKeyStatistics = result.defaultKeyStatistics || {}
        const financialData = result.financialData || {}

        return {
            symbol: quote.symbol || symbol,
            name: quote.shortName || quote.longName || '',
            currentPrice: quote.regularMarketPrice || 0,
            marketCap: quote.marketCap || summaryDetail.marketCap || 0,
            volume: quote.regularMarketVolume || 0,
            peRatio: defaultKeyStatistics.trailingPE || defaultKeyStatistics.forwardPE || summaryDetail.trailingPE || 0,
            dividendYield: summaryDetail.dividendYield ? parseFloat(summaryDetail.dividendYield.raw) * 100 : 0,
            beta: defaultKeyStatistics.beta || 0,
            dayHigh: quote.regularMarketDayHigh || 0,
            dayLow: quote.regularMarketDayLow || 0,
            open: quote.regularMarketOpen || 0,
            previousClose: quote.regularMarketPreviousClose || 0,
            change: quote.regularMarketChange || 0,
            changePercent: quote.regularMarketChangePercent ? parseFloat(quote.regularMarketChangePercent.raw) * 100 : 0
        }
    } catch (error) {
        console.warn(`Error fetching comprehensive data for ${symbol}:`, error)
        return null
    }
}

async function fetchCryptoPrice(symbol: string): Promise<{ currentPrice: number; previousClose: number } | null> {
    try {
        // Use Kraken's public ticker API for crypto prices
        const url = `https://api.kraken.com/0/public/Ticker?pair=${symbol}USD`
        const response = await axios.get(url, { timeout: 5000 })

        if (response.data.error && response.data.error.length > 0) {
            console.warn(`Kraken API error for ${symbol}:`, response.data.error)
            return null
        }

        const ticker = Object.values(response.data.result)[0] as any
        if (ticker && ticker.c && ticker.c[0]) {
            const current = parseFloat(ticker.c[0]) // Last trade price
            // Kraken provides today's opening price in 'o'
            const prev = typeof ticker.o === 'string' ? parseFloat(ticker.o) : (Array.isArray(ticker.o) ? parseFloat(ticker.o[0]) : current)
            const previousClose = !isNaN(prev) && prev > 0 ? prev : current
            return { currentPrice: current, previousClose }
        }

        return null
    } catch (error) {
        console.warn(`Error fetching crypto price for ${symbol}:`, error)
        return null
    }
}

async function fetchEquityPrice(symbol: string): Promise<{ currentPrice: number; previousClose: number } | null> {
    try {
        // Use Yahoo Finance for equity prices
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=2d&interval=1d`
        const response = await axios.get(url, {
            timeout: 5000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        })

        if (!response.data.chart?.result?.[0]) {
            return null
        }

        const result = response.data.chart.result[0]
        const currentPrice = result.meta?.regularMarketPrice
        const timestamps = result.timestamp || []
        const closes = result.indicators?.quote?.[0]?.close || []

        if (!currentPrice || timestamps.length < 2 || closes.length < 2) {
            return null
        }

        // Get previous close for P&L calculation
        const previousClose = closes[closes.length - 2]

        return {
            currentPrice,
            previousClose: previousClose || currentPrice
        }
    } catch (error) {
        console.warn(`Error fetching equity price for ${symbol}:`, error)
        return null
    }
}
