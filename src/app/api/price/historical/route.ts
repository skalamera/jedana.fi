import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const symbol = searchParams.get('symbol') || ''
        const assetType = (searchParams.get('assetType') || '').toLowerCase()

        if (!symbol) {
            return NextResponse.json({ error: 'Missing symbol parameter' }, { status: 400 })
        }

        console.log(`Fetching historical data for ${symbol} (${assetType})`)

        const isCrypto = assetType === 'crypto' || ['BTC', 'ETH', 'ADA', 'SOL', 'DOT', 'AVAX', 'MATIC', 'LINK', 'UNI', 'AAVE', 'LTC', 'XRP', 'BCH', 'ATOM', 'ALGO', 'NEAR', 'FLOW', 'APE', 'MANA', 'SAND', 'GALA', 'ENJ', 'CRV', 'SUSHI'].includes(symbol.toUpperCase())

        const yahooSymbol = isCrypto ? `${symbol.toUpperCase()}-USD` : symbol.toUpperCase()
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=6mo&interval=1d`

        let data
        try {
            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json',
                }
            })
            data = response.data
        } catch (fetchError) {
            console.error(`Failed to fetch historical data for ${yahooSymbol}:`, fetchError)
            if (axios.isAxiosError(fetchError)) {
                if (fetchError.response?.status === 404) {
                    return NextResponse.json({
                        error: `Symbol ${yahooSymbol} not found. Please check the ticker symbol.`
                    }, { status: 404 })
                }
                if (fetchError.code === 'ECONNABORTED' || fetchError.code === 'ETIMEDOUT') {
                    return NextResponse.json({
                        error: 'Request timeout. Yahoo Finance is not responding. Please try again.'
                    }, { status: 504 })
                }
            }
            return NextResponse.json({
                error: 'Failed to fetch historical data from Yahoo Finance. Please try again later.'
            }, { status: 502 })
        }

        const result = data?.chart?.result?.[0]

        if (!result) {
            console.warn(`No chart result for ${yahooSymbol}`)
            return NextResponse.json({
                error: `No historical data available for ${yahooSymbol}`
            }, { status: 404 })
        }

        const timestamps: number[] = result?.timestamp || []
        const closes: number[] = result?.indicators?.quote?.[0]?.close || []

        if (!timestamps.length || !closes.length) {
            console.warn(`Empty data arrays for ${yahooSymbol}`)
            return NextResponse.json({
                error: 'No historical price data available for this symbol'
            }, { status: 404 })
        }

        console.log(`Successfully fetched ${timestamps.length} data points for ${yahooSymbol}`)

        return NextResponse.json({
            symbol: yahooSymbol,
            timestamps,
            closes
        })
    } catch (error) {
        console.error('Historical price API error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({
            error: 'Unexpected error while fetching historical data',
            details: errorMessage
        }, { status: 500 })
    }
}


