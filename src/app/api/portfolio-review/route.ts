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

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

        const system = `You are a professional portfolio strategist. Analyze the user's aggregated portfolio (crypto, stocks, ETFs). Provide:
1) High-level overview and risk assessment
2) Diversification analysis (sector, factor, region, market cap, asset class)
3) Concentration risks and position-level notes
4) Performance drivers and sensitivities
5) Rebalancing suggestions with target weights
6) Buy/Sell/Trim/Add rationales with priorities
7) 3–6M and 12M outlook (base/bull/bear) with confidence bands
8) Risk management checklist (stops, hedges, cash buffer)
9) Action plan next steps.
Return JSON with fields: { summary, risks, diversification, rebalancing: { targets: [{symbol,name,targetWeight}] }, actions: [{symbol,action,note}], outlook: { shortTerm, longTerm }, notes }`

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

        return NextResponse.json({ id: `review_${Date.now()}`, data })
    } catch (e) {
        console.error('[Portfolio Review API] error', e)
        return NextResponse.json({ error: 'Failed to analyze portfolio' }, { status: 500 })
    }
}


