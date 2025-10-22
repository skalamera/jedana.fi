import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

interface HistoricalDataPoint {
    date: string
    portfolioValue: number
    spyPrice: number
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { assets, startDate } = body

        if (!assets || !Array.isArray(assets)) {
            return NextResponse.json(
                { error: 'Invalid request: assets array required' },
                { status: 400 }
            )
        }

        if (!startDate) {
            return NextResponse.json(
                { error: 'Invalid request: startDate required' },
                { status: 400 }
            )
        }

        const start = new Date(startDate)
        const today = new Date()
        
        // Calculate days between start and today
        const daysDiff = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysDiff < 1 || daysDiff > 365) {
            return NextResponse.json(
                { error: 'Date range must be between 1 and 365 days' },
                { status: 400 }
            )
        }

        // Fetch S&P 500 historical data
        const spyHistorical = await fetchHistoricalPrices('^GSPC', daysDiff)
        
        // Fetch historical data for each asset
        const assetHistoricalData: { [symbol: string]: { [date: string]: number } } = {}
        
        await Promise.all(
            assets.map(async (asset: { symbol: string; assetType: string }) => {
                try {
                    const symbol = asset.symbol.replace('.EQ', '')
                    const historical = await fetchHistoricalPrices(symbol, daysDiff)
                    assetHistoricalData[asset.symbol] = historical
                } catch (error) {
                    console.warn(`Failed to fetch historical data for ${asset.symbol}:`, error)
                    assetHistoricalData[asset.symbol] = {}
                }
            })
        )

        // Build daily portfolio values
        const historicalData: HistoricalDataPoint[] = []
        
        for (let i = 0; i <= daysDiff; i++) {
            const date = new Date(start)
            date.setDate(date.getDate() + i)
            const dateStr = date.toISOString().split('T')[0]
            
            // Calculate portfolio value for this date
            let portfolioValue = 0
            assets.forEach((asset: { symbol: string; balance: number }) => {
                const priceOnDate = assetHistoricalData[asset.symbol]?.[dateStr]
                if (priceOnDate) {
                    portfolioValue += asset.balance * priceOnDate
                }
            })
            
            const spyPrice = spyHistorical[dateStr] || 0
            
            if (portfolioValue > 0 && spyPrice > 0) {
                historicalData.push({
                    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    portfolioValue,
                    spyPrice
                })
            }
        }

        return NextResponse.json({ data: historicalData })
    } catch (error) {
        console.error('Portfolio Historical API Error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch historical data' },
            { status: 500 }
        )
    }
}

async function fetchHistoricalPrices(symbol: string, days: number): Promise<{ [date: string]: number }> {
    try {
        const encodedSymbol = encodeURIComponent(symbol)
        const period = days <= 30 ? '1mo' : days <= 90 ? '3mo' : days <= 180 ? '6mo' : '1y'
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?range=${period}&interval=1d`
        
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        })

        if (!response.data.chart?.result?.[0]) {
            console.warn(`No chart data from Yahoo Finance for ${symbol}`)
            return {}
        }

        const result = response.data.chart.result[0]
        const timestamps = result.timestamp || []
        const closes = result.indicators?.quote?.[0]?.close || []

        const pricesByDate: { [date: string]: number } = {}
        
        timestamps.forEach((timestamp: number, index: number) => {
            const price = closes[index]
            if (price && !isNaN(price)) {
                const date = new Date(timestamp * 1000)
                const dateStr = date.toISOString().split('T')[0]
                pricesByDate[dateStr] = price
            }
        })

        return pricesByDate
    } catch (error) {
        console.warn(`Error fetching historical prices for ${symbol}:`, error)
        return {}
    }
}

