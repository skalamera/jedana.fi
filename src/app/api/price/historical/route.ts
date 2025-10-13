import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const symbol = searchParams.get('symbol') || ''
        const assetType = (searchParams.get('assetType') || '').toLowerCase()

        if (!symbol) return NextResponse.json({ error: 'Missing symbol' }, { status: 400 })

        const isCrypto = assetType === 'crypto' || ['BTC','ETH','ADA','SOL','DOT','AVAX','MATIC','LINK','UNI','AAVE','LTC','XRP','BCH','ATOM','ALGO','NEAR','FLOW','APE','MANA','SAND','GALA','ENJ','CRV','SUSHI'].includes(symbol.toUpperCase())

        const yahooSymbol = isCrypto ? `${symbol.toUpperCase()}-USD` : symbol.toUpperCase()
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=6mo&interval=1d`

        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        })

        if (!res.ok) return NextResponse.json({ error: 'Failed to fetch historical data' }, { status: 502 })
        const data = await res.json()
        const result = data?.chart?.result?.[0]
        const timestamps: number[] = result?.timestamp || []
        const closes: number[] = result?.indicators?.quote?.[0]?.close || []

        if (!timestamps.length || !closes.length) return NextResponse.json({ error: 'No data' }, { status: 404 })

        return NextResponse.json({ symbol: yahooSymbol, timestamps, closes })
    } catch (e) {
        return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
    }
}


