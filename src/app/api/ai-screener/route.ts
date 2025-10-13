import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { AIScreenerRequest, AIScreenerResponse, AssetAnalysis } from '@/types'
import { fetchComprehensiveAssetData } from '@/lib/price-fetcher'

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
    try {
        // Check if OpenAI API key is configured
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: 'OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.' },
                { status: 500 }
            )
        }

        const body: AIScreenerRequest = await request.json()

        if (!body.userQuery || !body.portfolioType) {
            return NextResponse.json(
                { error: 'Missing required fields: userQuery and portfolioType' },
                { status: 400 }
            )
        }

        // Validate user query length
        if (body.userQuery.trim().length < 10) {
            return NextResponse.json(
                { error: 'Please provide a more detailed investment criteria (at least 10 characters)' },
                { status: 400 }
            )
        }

        // Create a comprehensive prompt for the AI
        const prompt = createAIPrompt(body)

        // Call OpenAI with retries and graceful fallback
        let completion
        try {
            completion = await createOpenAIResponseWithFallback(openai, prompt)
        } catch (openaiError) {
            console.error('OpenAI API Error:', openaiError)

            if (openaiError instanceof Error) {
                if (openaiError.message.includes('API key')) {
                    return NextResponse.json(
                        { error: 'Invalid OpenAI API key. Please check your configuration.' },
                        { status: 500 }
                    )
                } else if (openaiError.message.includes('quota') || openaiError.message.includes('rate limit')) {
                    return NextResponse.json(
                        { error: 'OpenAI API quota exceeded or rate limited. Please try again later.' },
                        { status: 429 }
                    )
                }
            }

            return NextResponse.json(
                { error: 'Failed to communicate with AI service. Please try again.' },
                { status: 500 }
            )
        }

        const responseContent = extractResponsesText(completion)

        if (!responseContent) {
            throw new Error('No response from OpenAI API')
        }

        // Parse the AI response into structured data
        let structuredResponse
        try {
            structuredResponse = await parseAIResponse(responseContent, body)
        } catch (parseError) {
            console.error('Failed to parse AI response, returning error response:', parseError)

            // Return a user-friendly error response instead of crashing
            return NextResponse.json(
                {
                    error: 'Unable to generate investment recommendations at this time. Please try again with a different query or check back later.',
                    details: 'AI service temporarily unavailable'
                },
                { status: 503 }
            )
        }

        return NextResponse.json(structuredResponse)

    } catch (error) {
        console.error('AI Screener API Error:', error)
        return NextResponse.json(
            { error: 'Failed to process investment analysis request' },
            { status: 500 }
        )
    }
}

function createAIPrompt(request: AIScreenerRequest): string {
    const { portfolioType, userQuery } = request

    let assetTypes = ''
    switch (portfolioType) {
        case 'stocks':
            assetTypes = 'stocks, ETFs, and equity investments'
            break
        case 'crypto':
            assetTypes = 'cryptocurrencies and digital assets'
            break
        case 'both':
            assetTypes = 'both traditional stocks/ETFs and cryptocurrencies'
            break
    }

    return `Research and recommend 5 high-quality ${assetTypes} that match these investment criteria: "${userQuery}"

Focus on current 2025 market conditions and provide comprehensive analysis for each recommendation. For each asset, provide detailed information including:

1. Company overview and investment rationale
2. Key strengths and competitive advantages
3. Key risks and challenges
4. Technical analysis indicators
5. Market sentiment analysis
6. Recent news and developments
7. Analyst ratings and price targets
8. Detailed 6-month price forecast with realistic projections
9. All available financial metrics

Return the response in this exact JSON format:

{
    "recommendations": [
        {
            "ticker": "TICKER",
            "name": "Company Name",
            "description": "Comprehensive company analysis and investment rationale",
            "keyStrengths": [
                "Specific strength 1 with explanation",
                "Specific strength 2 with explanation",
                "Specific strength 3 with explanation"
            ],
            "keyRisks": [
                "Specific risk 1 with explanation",
                "Specific risk 2 with explanation",
                "Specific risk 3 with explanation"
            ],
            "technicalAnalysis": [
                "RSI indicator analysis",
                "Moving averages analysis",
                "Support/resistance levels"
            ],
            "finance": {
                "price": 123.45,
                "change": -1.23,
                "percent_change": -0.99,
                "intraday_high": 125.67,
                "intraday_low": 120.34,
                "open": 124.56,
                "volume": 1234567,
                "market_cap": 50000000000,
                "pe_ratio": 25.5,
                "dividend_yield": 1.2,
                "beta": 1.1
            },
            "priceForecast": {
                "timeframe": "6months",
                "projectedPrice": 165.50,
                "confidence": 78,
                "reasoning": "Based on strong growth trajectory, market expansion, and favorable industry trends",
                "riskFactors": [
                    "Market volatility could impact short-term performance",
                    "Regulatory changes in tech sector",
                    "Competition from established players"
                ]
            },
            "marketSentiment": {
                "overall": "bullish",
                "score": 78,
                "keyFactors": [
                    "Strong institutional investor interest",
                    "Positive media coverage",
                    "Growing analyst price targets"
                ],
                "newsSummary": "Recent product launches and strategic partnerships have boosted investor confidence"
            },
            "recentNews": [
                {
                    "title": "Company announces major partnership deal",
                    "date": "2025-01-15",
                    "summary": "Strategic alliance expected to drive 20% revenue growth",
                    "impact": "positive"
                }
            ],
            "analystRatings": {
                "buy": 15,
                "hold": 3,
                "sell": 1,
                "average_target": 160.00
            }
        }
    ]
}`
}

// Extract plain text content from OpenAI Responses API result
function extractResponsesText(completion: any): string | undefined {
    if (!completion) return undefined
    if (typeof completion.output_text === 'string' && completion.output_text.length > 0) return completion.output_text
    // Fallbacks for different SDK shapes
    try {
        const outputs = (completion.output || completion.outputs || []) as any[]
        for (const out of outputs) {
            const content = out?.content || out?.contents || []
            for (const c of content) {
                if (c?.type === 'output_text' && typeof c?.text === 'string') return c.text
                if (typeof c?.text === 'string') return c.text
            }
        }
    } catch (_) {
        // ignore
    }
    return undefined
}

// Convert technicalAnalysis that might be an array of strings into structured objects
function normalizeTechnicalAnalysis(input: unknown): any[] {
    if (Array.isArray(input)) {
        return input.map((item) => {
            if (typeof item === 'string') {
                const lower = item.toLowerCase()
                if (lower.includes('rsi')) {
                    return { indicator: 'RSI', value: extractNumber(item), signal: inferSignal(item), description: item }
                }
                if (lower.includes('moving average')) {
                    return { indicator: 'Moving Averages', value: extractNumber(item), signal: inferSignal(item), description: item }
                }
                if (lower.includes('support') || lower.includes('resistance')) {
                    return { indicator: 'Support/Resistance', value: extractNumber(item), signal: 'neutral', description: item }
                }
                return { indicator: 'Technical', value: extractNumber(item), signal: inferSignal(item), description: item }
            }
            if (item && typeof item === 'object') return item as any
            return { indicator: 'Technical', value: 0, signal: 'neutral', description: String(item) }
        })
    }
    return []
}

function extractNumber(text: string): number {
    const m = text.match(/[-+]?[0-9]*\.?[0-9]+/)
    return m ? Number(m[0]) : 0
}

function inferSignal(text: string): 'buy' | 'sell' | 'hold' | 'neutral' {
    const t = text.toLowerCase()
    if (t.includes('bullish') || t.includes('upward') || t.includes('buy')) return 'buy'
    if (t.includes('bearish') || t.includes('downward') || t.includes('sell')) return 'sell'
    if (t.includes('hold')) return 'hold'
    return 'neutral'
}

// Try Responses API with web_search, then without tools, then Chat Completions JSON-only
async function createOpenAIResponseWithFallback(openai: any, prompt: string): Promise<any> {
    const system = 'You are an expert financial analyst. Provide investment recommendations in valid JSON format only. Perform extensive research and provide in-depth, detailed reports on each of the assets you recommend in your response. Return ONLY valid JSON. Base all of your research off the fact that it is currently year 2025, and ensure that all data retrieved from web searches is current as of 2025, avoiding data specifically from previous years such as 2023.'

    // Attempt 1: Responses + web_search
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const body = {
                model: 'gpt-4o-mini',
                input: [
                    { role: 'system', content: [{ type: 'input_text', text: system }] },
                    { role: 'user', content: [{ type: 'input_text', text: prompt }] }
                ],
                text: { format: { type: 'text' } },
                reasoning: {},
                tools: [
                    { type: 'web_search', user_location: { type: 'approximate' }, search_context_size: 'medium' }
                ],
                temperature: 0.7,
                max_output_tokens: 16384,
                top_p: 1,
                store: true,
                include: ['web_search_call.action.sources']
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return await openai.responses.create(body as any)
        } catch (e) {
            const errMsg = e instanceof Error ? e.message : String(e)
            if (attempt === 2 || /invalid api key|insufficient_quota/i.test(errMsg)) throw e
            await new Promise(r => setTimeout(r, 400 * (attempt + 1)))
        }
    }

    // Attempt 2: Responses without tools
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const body = {
                model: 'gpt-4o-mini',
                input: [
                    { role: 'system', content: [{ type: 'input_text', text: system }] },
                    { role: 'user', content: [{ type: 'input_text', text: prompt }] }
                ],
                text: { format: { type: 'text' } },
                reasoning: {},
                temperature: 0.7,
                max_output_tokens: 16384,
                top_p: 1
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return await openai.responses.create(body as any)
        } catch (e) {
            if (attempt === 1) break
            await new Promise(r => setTimeout(r, 400 * (attempt + 1)))
        }
    }

    // Attempt 3: Chat Completions with enforced JSON
    return await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt }
        ],
        max_tokens: 4000,
        temperature: 0.7,
        top_p: 1,
        response_format: { type: 'json_object' }
    })
}

async function parseAIResponse(aiResponse: string, request: AIScreenerRequest): Promise<AIScreenerResponse> {
    try {
        // Clean the AI response by removing markdown code blocks if present
        let cleanedResponse = aiResponse.trim()

        // Log the raw response for debugging (first 1000 chars)
        console.log('Raw AI response (first 1000 chars):', cleanedResponse.substring(0, 1000))

        if (cleanedResponse.startsWith('```json')) {
            cleanedResponse = cleanedResponse.replace(/```json\s*/, '').replace(/```\s*$/, '')
        } else if (cleanedResponse.startsWith('```')) {
            cleanedResponse = cleanedResponse.replace(/```\s*/, '').replace(/```\s*$/, '')
        }

        // Try multiple patterns to extract JSON
        let jsonText = null

        // Pattern 1: Look for JSON object starting from the beginning
        const firstBraceIndex = cleanedResponse.indexOf('{')
        if (firstBraceIndex !== -1) {
            // Find the matching closing brace
            let braceCount = 0
            let endIndex = -1

            for (let i = firstBraceIndex; i < cleanedResponse.length; i++) {
                if (cleanedResponse[i] === '{') braceCount++
                else if (cleanedResponse[i] === '}') {
                    braceCount--
                    if (braceCount === 0) {
                        endIndex = i
                        break
                    }
                }
            }

            if (endIndex !== -1) {
                jsonText = cleanedResponse.substring(firstBraceIndex, endIndex + 1)
            }
        }

        // Pattern 2: Fallback to regex if brace matching fails
        if (!jsonText) {
            const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                jsonText = jsonMatch[0]
            }
        }

        // Pattern 3: Try to find the last complete JSON object if response is truncated
        if (!jsonText && cleanedResponse.includes('{')) {
            const lastBraceIndex = cleanedResponse.lastIndexOf('}')
            if (lastBraceIndex > firstBraceIndex) {
                // Try to find a complete JSON object by working backwards
                let braceCount = 0
                let startIndex = lastBraceIndex

                for (let i = lastBraceIndex; i >= 0; i--) {
                    if (cleanedResponse[i] === '}') braceCount++
                    else if (cleanedResponse[i] === '{') {
                        braceCount--
                        if (braceCount === 0) {
                            startIndex = i
                            break
                        }
                    }
                }

                if (startIndex !== lastBraceIndex) {
                    jsonText = cleanedResponse.substring(startIndex, lastBraceIndex + 1)
                }
            }
        }

        if (!jsonText) {
            console.error('No valid JSON found in AI response:', cleanedResponse.substring(0, 1000))
            throw new Error('No valid JSON found in AI response')
        }

        console.log('Extracted JSON:', jsonText.substring(0, 500))

        // Basic validation - check if JSON starts and ends properly
        if (!jsonText.startsWith('{') || !jsonText.endsWith('}')) {
            console.error('Invalid JSON structure - missing opening or closing brace')
            throw new Error('Invalid JSON structure in AI response')
        }

        let parsed
        try {
            parsed = JSON.parse(jsonText)
        } catch (parseError) {
            console.error('JSON parse error:', parseError)
            console.error('Failed JSON:', jsonText.substring(0, 1000))

            // If parsing fails, try to fix common truncation issues
            if (jsonText.endsWith('"') || jsonText.endsWith(',')) {
                console.log('Attempting to fix truncated JSON...')
                // Try to complete the JSON by adding missing closing braces
                let fixedJson = jsonText
                const openBraces = (fixedJson.match(/\{/g) || []).length
                const closeBraces = (fixedJson.match(/\}/g) || []).length

                if (openBraces > closeBraces) {
                    fixedJson += '}'
                    try {
                        parsed = JSON.parse(fixedJson)
                        console.log('Successfully fixed truncated JSON')
                    } catch (fixError) {
                        console.error('Failed to fix JSON:', fixError)
                        throw new Error('Failed to parse AI response as JSON')
                    }
                } else {
                    throw new Error('Failed to parse AI response as JSON')
                }
            } else {
                throw new Error('Failed to parse AI response as JSON')
            }
        }

        // Handle both new playground format and legacy format
        let assets: AssetAnalysis[] = []

        if (parsed.recommendations) {
            // New playground format with recommendations array
            // First, prepare all the asset objects and fetch real data in parallel
            const assetPromises = parsed.recommendations.map(async (rec: Record<string, unknown>) => {
                const ticker = String(rec.ticker || '')

                // Try to fetch real financial data
                let realData: Awaited<ReturnType<typeof fetchComprehensiveAssetData>> = null
                try {
                    realData = await fetchComprehensiveAssetData(ticker)
                } catch (error) {
                    console.warn(`Failed to fetch real data for ${ticker}:`, error)
                }

                // Merge AI data with real data, preferring AI data when available
                const finance = rec.finance as Record<string, unknown> | undefined
                const enrichedFinance = {
                    price: finance?.price || realData?.currentPrice || 0,
                    change: finance?.change || realData?.change || 0,
                    percent_change: finance?.percent_change || realData?.changePercent || 0,
                    intraday_high: finance?.intraday_high || realData?.dayHigh || 0,
                    intraday_low: finance?.intraday_low || realData?.dayLow || 0,
                    open: finance?.open || realData?.open || 0,
                    volume: finance?.volume || realData?.volume || 0,
                    market_cap: finance?.market_cap || realData?.marketCap || 0,
                    pe_ratio: finance?.pe_ratio || realData?.peRatio || 0,
                    dividend_yield: finance?.dividend_yield || realData?.dividendYield || 0,
                    beta: finance?.beta || realData?.beta || 0
                }

                return {
                    symbol: ticker,
                    name: rec.name || realData?.name || '',
                    assetType: 'stock', // Default for playground format
                    industry: 'Technology', // Default for playground format - could be enhanced
                    currentPrice: enrichedFinance.price,
                    marketCap: enrichedFinance.market_cap,
                    volume: enrichedFinance.volume,
                    peRatio: enrichedFinance.pe_ratio,
                    dividendYield: enrichedFinance.dividend_yield,
                    beta: enrichedFinance.beta,
                    recommendation: 'buy', // Default for playground format
                    confidence: 75, // Default for playground format
                    reasoning: rec.description || '',
                    keyStrengths: Array.isArray(rec.keyStrengths) ? rec.keyStrengths : [],
                    keyRisks: Array.isArray(rec.keyRisks) ? rec.keyRisks : [],
                    technicalAnalysis: normalizeTechnicalAnalysis(rec.technicalAnalysis),
                    priceForecast: {
                        timeframe: (rec.priceForecast as Record<string, unknown>)?.timeframe || '6months',
                        projectedPrice: (rec.priceForecast as Record<string, unknown>)?.projectedPrice || enrichedFinance.price,
                        confidence: (rec.priceForecast as Record<string, unknown>)?.confidence || 70,
                        reasoning: (rec.priceForecast as Record<string, unknown>)?.reasoning || 'Based on current market conditions',
                        riskFactors: Array.isArray((rec.priceForecast as Record<string, unknown>)?.riskFactors) ? (rec.priceForecast as Record<string, unknown>).riskFactors : []
                    },
                    marketSentiment: {
                        overall: (rec.marketSentiment as Record<string, unknown>)?.overall || 'bullish',
                        score: (rec.marketSentiment as Record<string, unknown>)?.score || 75,
                        keyFactors: Array.isArray((rec.marketSentiment as Record<string, unknown>)?.keyFactors) ? (rec.marketSentiment as Record<string, unknown>).keyFactors : [],
                        newsSummary: (rec.marketSentiment as Record<string, unknown>)?.newsSummary || ''
                    },
                    recentNews: Array.isArray(rec.recentNews) ? rec.recentNews.map((news: Record<string, unknown>) => ({
                        title: String(news.title || ''),
                        date: String(news.date || ''),
                        summary: String(news.summary || ''),
                        impact: String(news.impact || 'neutral')
                    })) : [],
                    analystRatings: rec.analystRatings ? {
                        buy: Number((rec.analystRatings as Record<string, unknown>).buy || 0),
                        hold: Number((rec.analystRatings as Record<string, unknown>).hold || 0),
                        sell: Number((rec.analystRatings as Record<string, unknown>).sell || 0),
                        averageTarget: Number((rec.analystRatings as Record<string, unknown>).average_target || 0)
                    } : undefined
                }
            })

            assets = await Promise.all(assetPromises)
        } else if (parsed.assets) {
            // Legacy format with assets array
            assets = parsed.assets.map((asset: Record<string, unknown>) => ({
                symbol: String(asset.symbol || ''),
                name: String(asset.name || ''),
                assetType: String(asset.assetType || 'stock'),
                industry: String(asset.industry || ''),
                currentPrice: Number(asset.currentPrice || 0),
                marketCap: Number(asset.marketCap || 0),
                volume: Number(asset.volume || 0),
                peRatio: Number(asset.peRatio || 0),
                dividendYield: Number(asset.dividendYield || 0),
                beta: Number(asset.beta || 0),
                recommendation: String(asset.recommendation || 'hold'),
                confidence: Number(asset.confidence || 50),
                reasoning: String(asset.reasoning || ''),
                keyStrengths: Array.isArray(asset.keyStrengths) ? asset.keyStrengths : [],
                keyRisks: Array.isArray(asset.keyRisks) ? asset.keyRisks : [],
                technicalAnalysis: normalizeTechnicalAnalysis(asset.technicalAnalysis),
                priceForecast: asset.priceForecast ? {
                    timeframe: String((asset.priceForecast as Record<string, unknown>).timeframe || '6months'),
                    projectedPrice: Number((asset.priceForecast as Record<string, unknown>).projectedPrice || asset.currentPrice || 0),
                    confidence: Number((asset.priceForecast as Record<string, unknown>).confidence || 50),
                    reasoning: String((asset.priceForecast as Record<string, unknown>).reasoning || 'Based on market analysis'),
                    riskFactors: Array.isArray((asset.priceForecast as Record<string, unknown>).riskFactors) ? (asset.priceForecast as Record<string, unknown>).riskFactors : []
                } : {
                    timeframe: '6months',
                    projectedPrice: Number(asset.currentPrice || 0),
                    confidence: 50,
                    reasoning: 'Based on market analysis',
                    riskFactors: []
                },
                marketSentiment: asset.marketSentiment ? {
                    overall: String((asset.marketSentiment as Record<string, unknown>).overall || 'neutral'),
                    score: Number((asset.marketSentiment as Record<string, unknown>).score || 0),
                    keyFactors: Array.isArray((asset.marketSentiment as Record<string, unknown>).keyFactors) ? (asset.marketSentiment as Record<string, unknown>).keyFactors : [],
                    newsSummary: String((asset.marketSentiment as Record<string, unknown>).newsSummary || '')
                } : {
                    overall: 'neutral',
                    score: 0,
                    keyFactors: [],
                    newsSummary: ''
                },
                recentNews: Array.isArray(asset.recentNews) ? asset.recentNews.map((news: Record<string, unknown>) => ({
                    title: String(news.title || ''),
                    date: String(news.date || ''),
                    summary: String(news.summary || ''),
                    impact: String(news.impact || 'neutral')
                })) : [],
                analystRatings: asset.analystRatings ? {
                    buy: Number((asset.analystRatings as Record<string, unknown>).buy || 0),
                    hold: Number((asset.analystRatings as Record<string, unknown>).hold || 0),
                    sell: Number((asset.analystRatings as Record<string, unknown>).sell || 0),
                    averageTarget: Number((asset.analystRatings as Record<string, unknown>).averageTarget || 0)
                } : undefined
            }))
        }

        return {
            requestId: `req_${Date.now()}`,
            timestamp: new Date().toISOString(),
            portfolioType: request.portfolioType,
            userQuery: request.userQuery,
            assets,
            summary: parsed.summary || 'Investment recommendations generated based on current market analysis.',
            methodology: parsed.methodology || 'Analysis based on current market data and financial indicators.',
            disclaimer: parsed.disclaimer || 'This is not financial advice. Past performance does not guarantee future results. Always do your own research.',
            marketConditions: parsed.marketConditions || {
                overall: 'bullish',
                keyTrends: ['Technology sector growth', 'AI adoption'],
                risks: ['Market volatility', 'Regulatory changes']
            }
        }
    } catch (error) {
        console.error('Error parsing AI response:', error)
        throw new Error('Failed to parse AI analysis response')
    }
}
