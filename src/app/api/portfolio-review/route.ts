import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: request.headers.get('authorization') || '' } } }
        )

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { portfolio } = body || {}
        if (!portfolio) return NextResponse.json({ error: 'Missing portfolio' }, { status: 400 })

        // Debug logging: Log the portfolio structure being sent to AI
        console.log('Portfolio data being sent to AI:', {
            totalValue: portfolio.totalValue,
            totalAssets: portfolio.assets?.length || 0,
            assetBreakdown: portfolio.assets?.map((asset: any) => ({
                symbol: asset.symbol,
                name: asset.name,
                asset_type: asset.asset_type,
                value: asset.value,
                balance: asset.balance,
                currentPrice: asset.currentPrice
            })) || []
        })

        // Calculate actual allocation percentages for comparison
        const totalValue = portfolio.totalValue || 0
        const cryptoAssets = portfolio.assets?.filter((asset: any) => asset.asset_type === 'crypto') || []
        const equityAssets = portfolio.assets?.filter((asset: any) => asset.asset_type === 'equity') || []
        const manualAssets = portfolio.assets?.filter((asset: any) => asset.asset_type === 'manual') || []

        const cryptoValue = cryptoAssets.reduce((sum: number, asset: any) => sum + (asset.value || 0), 0)
        const equityValue = equityAssets.reduce((sum: number, asset: any) => sum + (asset.value || 0), 0)
        const manualValue = manualAssets.reduce((sum: number, asset: any) => sum + (asset.value || 0), 0)

        const cryptoPercentage = totalValue > 0 ? (cryptoValue / totalValue) * 100 : 0
        const equityPercentage = totalValue > 0 ? (equityValue / totalValue) * 100 : 0
        const manualPercentage = totalValue > 0 ? (manualValue / totalValue) * 100 : 0

        console.log('Calculated allocation percentages:', {
            crypto: `${cryptoPercentage.toFixed(1)}% (${cryptoAssets.length} assets, $${cryptoValue.toFixed(2)})`,
            equity: `${equityPercentage.toFixed(1)}% (${equityAssets.length} assets, $${equityValue.toFixed(2)})`,
            manual: `${manualPercentage.toFixed(1)}% (${manualAssets.length} assets, $${manualValue.toFixed(2)})`,
            total: `${totalValue.toFixed(2)}`
        })

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

        const system = `You are a professional portfolio strategist creating a modern, sleek AI Portfolio Review for jedana.fi.

Analyze the user's portfolio and return data in this exact format:

{
    "title": "AI Portfolio Review by jedana.fi",
    "riskMeter": {
        "level": "LOW|MEDIUM|HIGH",
        "score": 75,
        "description": "Brief risk assessment description"
    },
    "portfolioForecast": {
        "currentValue": 50000,
        "sixMonthForecast": 55000,
        "confidence": 78,
        "forecastData": [
            {"month": "Current", "value": 50000},
            {"month": "Month 1", "value": 51000},
            {"month": "Month 2", "value": 52000},
            {"month": "Month 3", "value": 53000},
            {"month": "Month 4", "value": 54000},
            {"month": "Month 5", "value": 54500},
            {"month": "Month 6", "value": 55000}
        ]
    },
    "allocationChart": {
        "type": "donut",
        "data": [
            {"name": "Bitcoin", "value": 25000, "percentage": 50, "color": "#F7931A"},
            {"name": "Ethereum", "value": 15000, "percentage": 30, "color": "#627EEA"},
            {"name": "Tech Stocks", "value": 10000, "percentage": 20, "color": "#00C853"}
        ]
    },
    "performanceChart": {
        "bestPerformers": [
            {"symbol": "NVDA", "name": "NVIDIA", "performance": 45.2, "value": 15000},
            {"symbol": "TSLA", "name": "Tesla", "performance": 32.1, "value": 8000},
            {"symbol": "AAPL", "name": "Apple", "performance": 28.7, "value": 12000}
        ],
        "worstPerformers": [
            {"symbol": "META", "name": "Meta", "performance": -15.3, "value": 5000},
            {"symbol": "NFLX", "name": "Netflix", "performance": -8.9, "value": 3000}
        ]
    },
    "assetAnalysis": [
        {
            "symbol": "BTC",
            "name": "Bitcoin",
            "currentPrice": 65000,
            "allocation": 50,
            "analysis": "Bitcoin has shown remarkable resilience despite recent market volatility. Recent institutional adoption and ETF approvals have strengthened its position as digital gold. The halving event earlier this year has reduced supply pressure. Short-term outlook remains bullish with potential ETF-driven inflows. Long-term, Bitcoin is expected to benefit from continued institutional adoption and global economic uncertainty.",
            "outlook": {
                "shortTerm": "Bullish - expect 15-20% upside in next 3 months",
                "longTerm": "Strongly Bullish - potential to reach $100K+ by 2025"
            }
        }
    ],
    "mustSell": {
        "hasRecommendations": false,
        "recommendations": []
    }
}

IMPORTANT: Calculate ACTUAL allocation percentages by VALUE, not by number of assets. Use the portfolio data provided to generate realistic values and analysis.

For the mustSell section: ONLY recommend selling if assets require IMMEDIATE ACTION due to critical issues that could cause significant and imminent harm to the portfolio. This is extremely rare and should only apply to:

1. Assets facing imminent bankruptcy, delisting, or regulatory bans
2. Assets involved in major scandals, fraud, or criminal investigations that will likely result in total loss
3. Assets with confirmed terminal business model failure (not just temporary setbacks)
4. Assets subject to immediate government seizure, nationalization, or forced liquidation

DO NOT recommend selling for:
- Normal market volatility or corrections
- Temporary business challenges or earnings misses
- Competitive pressures or market share losses (unless terminal)
- Overvaluation concerns (even extreme ones)
- Sector rotations or economic cycles

The default response should be no recommendations (hasRecommendations: false) unless there are genuinely urgent, portfolio-threatening situations that require immediate divestment. If recommending a sale, provide extremely detailed evidence of the immediate threat, specific price targets, and clear reasoning for why action must be taken within days, not weeks or months.`

        const combinedInput = `${system}\n\nHere is the user's full portfolio JSON. Please analyze comprehensively and return the schema specified.\n\n${JSON.stringify(portfolio)}`

        const chat = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: combinedInput },
            ],
            response_format: { type: 'json_object' }
        })

        const text = chat.choices?.[0]?.message?.content || '{}'
        let data
        try { data = JSON.parse(text) } catch { data = { summary: text } }

        // Include debug allocation data in the response for comparison
        const responseData = {
            id: `review_${Date.now()}`,
            data,
            debugAllocation: {
                crypto: cryptoPercentage,
                equity: equityPercentage,
                manual: manualPercentage,
                total: totalValue
            }
        }

        return NextResponse.json(responseData)
    } catch (e) {
        console.error('[Portfolio Review API] error', e)
        return NextResponse.json({ error: 'Failed to analyze portfolio' }, { status: 500 })
    }
}


