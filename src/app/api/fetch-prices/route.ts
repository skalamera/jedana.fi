import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

interface PriceRequest {
    symbol: string
    assetType: 'crypto' | 'equity' | 'manual'
}

export async function POST(request: NextRequest) {
    try {
        const body: { symbols: PriceRequest[] } = await request.json()
        const { symbols } = body

        if (!symbols || !Array.isArray(symbols)) {
            return NextResponse.json(
                { error: 'Invalid request: symbols array required' },
                { status: 400 }
            )
        }

        const prices: {
            [symbol: string]: {
                currentPrice: number
                previousClose?: number
            }
        } = {}

        // Fetch prices for each symbol
        await Promise.all(
            symbols.map(async ({ symbol, assetType }) => {
                try {
                    // Try crypto API for crypto assets
                    if (assetType === 'crypto') {
                        const cryptoData = await fetchCryptoPrice(symbol)
                        if (cryptoData) {
                            prices[symbol] = cryptoData
                            return
                        }
                    }

                    // Try equity API for equity or manual assets (or if crypto fetch failed)
                    if (assetType === 'equity' || assetType === 'manual') {
                        const equityData = await fetchEquityPrice(symbol)
                        if (equityData) {
                            prices[symbol] = equityData
                            return
                        }
                    }

                    // If asset type is crypto but Kraken failed, try Yahoo Finance as fallback
                    if (assetType === 'crypto') {
                        console.log(`Crypto API failed for ${symbol}, trying equity API as fallback`)
                        const equityData = await fetchEquityPrice(symbol)
                        if (equityData) {
                            prices[symbol] = equityData
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to fetch price for ${symbol}:`, error)
                }
            })
        )

        return NextResponse.json({ prices })
    } catch (error) {
        console.error('Fetch Prices API Error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch prices' },
            { status: 500 }
        )
    }
}

async function fetchCryptoPrice(symbol: string): Promise<{ currentPrice: number; previousClose: number } | null> {
    try {
        const url = `https://api.kraken.com/0/public/Ticker?pair=${symbol}USD`
        const response = await axios.get(url, { timeout: 5000 })

        if (response.data.error && response.data.error.length > 0) {
            console.warn(`Kraken API error for ${symbol}:`, response.data.error)
            return null
        }

        const ticker = Object.values(response.data.result)[0] as any
        if (ticker && ticker.c && ticker.c[0]) {
            const current = parseFloat(ticker.c[0])
            const prev = typeof ticker.o === 'string' ? parseFloat(ticker.o) : (Array.isArray(ticker.o) ? parseFloat(ticker.o[0]) : current)
            const previousClose = !isNaN(prev) && prev > 0 ? prev : current
            console.log(`✓ Successfully fetched crypto price for ${symbol}: $${current}`)
            return { currentPrice: current, previousClose }
        }

        console.warn(`No valid ticker data from Kraken for ${symbol}`)
        return null
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.warn(`Error fetching crypto price for ${symbol}: ${errorMessage}`)
        return null
    }
}

async function fetchEquityPrice(symbol: string): Promise<{ currentPrice: number; previousClose: number } | null> {
    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=2d&interval=1d`
        const response = await axios.get(url, {
            timeout: 5000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        })

        if (!response.data.chart?.result?.[0]) {
            console.warn(`No chart data from Yahoo Finance for ${symbol}`)
            return null
        }

        const result = response.data.chart.result[0]
        const currentPrice = result.meta?.regularMarketPrice
        const timestamps = result.timestamp || []
        const closes = result.indicators?.quote?.[0]?.close || []

        if (!currentPrice || timestamps.length < 2 || closes.length < 2) {
            console.warn(`Incomplete price data from Yahoo Finance for ${symbol}`)
            return null
        }

        const previousClose = closes[closes.length - 2]

        console.log(`✓ Successfully fetched equity price for ${symbol}: $${currentPrice}`)
        return {
            currentPrice,
            previousClose: previousClose || currentPrice
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.warn(`Error fetching equity price for ${symbol}: ${errorMessage}`)
        return null
    }
}

