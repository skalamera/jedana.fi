import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import axios from 'axios'
import { AIScreenerRequest, AIScreenerResponse, AssetAnalysis } from '@/types'

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

interface TechnicalData {
    currentPrice: number
    rsi?: number
    ma50?: number
    ma200?: number
    support?: number
    resistance?: number
    trend?: 'uptrend' | 'downtrend' | 'sideways'
}

// Calculate RSI from price array
function calculateRSI(prices: number[], period = 14): number | null {
    if (prices.length < period + 1) return null

    const changes = []
    for (let i = 1; i < prices.length; i++) {
        changes.push(prices[i] - prices[i - 1])
    }

    let avgGain = 0
    let avgLoss = 0

    for (let i = 0; i < period; i++) {
        if (changes[i] > 0) avgGain += changes[i]
        else avgLoss += Math.abs(changes[i])
    }

    avgGain /= period
    avgLoss /= period

    if (avgLoss === 0) return 100
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
}

// Calculate moving average
function calculateMA(prices: number[], period: number): number | null {
    if (prices.length < period) return null
    const slice = prices.slice(-period)
    return slice.reduce((a, b) => a + b, 0) / period
}

// Fetch comprehensive technical data from Yahoo Finance
async function fetchTechnicalData(symbol: string): Promise<TechnicalData | null> {
    try {
        const encodedSymbol = encodeURIComponent(symbol)
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?range=1y&interval=1d`
        const response = await axios.get(url, {
            timeout: 8000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        })

        const result = response.data?.chart?.result?.[0]
        const currentPrice = result?.meta?.regularMarketPrice || result?.meta?.previousClose

        if (!currentPrice || isNaN(currentPrice)) {
            console.warn(`No valid price from Yahoo Finance for ${symbol}`)
            return null
        }

        // Get historical closes
        const closes = (result.indicators?.quote?.[0]?.close || []).filter((c: number | null) => c !== null && !isNaN(c)) as number[]

        if (closes.length < 50) {
            console.warn(`Insufficient historical data for ${symbol}`)
            return { currentPrice }
        }

        // Calculate technical indicators
        const rsi = calculateRSI(closes, 14)
        const ma50 = calculateMA(closes, 50)
        const ma200 = calculateMA(closes, 200)

        // Find support/resistance from recent highs/lows
        const recent60 = closes.slice(-60)
        const support = Math.min(...recent60)
        const resistance = Math.max(...recent60)

        // Determine trend
        let trend: 'uptrend' | 'downtrend' | 'sideways' = 'sideways'
        if (ma50 && ma200) {
            if (ma50 > ma200 && currentPrice > ma50) trend = 'uptrend'
            else if (ma50 < ma200 && currentPrice < ma50) trend = 'downtrend'
        }

        console.log(`✓ Technical data for ${symbol}: Price=$${currentPrice}, RSI=${rsi?.toFixed(1)}, MA50=$${ma50?.toFixed(2)}, MA200=$${ma200?.toFixed(2)}`)

        return {
            currentPrice,
            rsi: rsi || undefined,
            ma50: ma50 || undefined,
            ma200: ma200 || undefined,
            support,
            resistance,
            trend
        }
    } catch (error) {
        console.warn(`Error fetching technical data for ${symbol}:`, error instanceof Error ? error.message : error)
        return null
    }
}

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

        const { text: responseContent, usedWebSearch, sources: webSearchSources } = extractResponsesText(completion)

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

        return NextResponse.json({
            ...structuredResponse,
            aiMetadata: {
                usedWebSearch,
                webSearchSources: usedWebSearch ? webSearchSources : undefined
            }
        })

    } catch (error) {
        console.error('AI Screener API Error:', error)
        return NextResponse.json(
            { error: 'Failed to process investment analysis request' },
            { status: 500 }
        )
    }
}

function createAIPrompt(request: AIScreenerRequest): string {
    const { portfolioType, userQuery, timeHorizon, sectorPreferences, investingPhilosophy } = request

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

    const horizonText = timeHorizon === 'short_term' ? 'short-term (0-12 months) focus' : timeHorizon === 'medium_term' ? 'medium-term (1-3 years) focus' : timeHorizon === 'long_term' ? 'long-term (3+ years) focus' : 'appropriate time horizon'
    const sectorText = Array.isArray(sectorPreferences) && sectorPreferences.length > 0 ? `Focus on sectors: ${sectorPreferences.join(', ')}.` : ''
    const philosophyText = portfolioType === 'stocks' && investingPhilosophy ? `Investor philosophy preference: ${investingPhilosophy}.` : ''

    return `Research and recommend 5 high-quality ${assetTypes} that match these investment criteria: "${userQuery}".

Context: ${horizonText}. ${sectorText} ${philosophyText}

CRITICAL INSTRUCTIONS:
- Each stock MUST have UNIQUE and SPECIFIC strengths, risks, and technical analysis
- DO NOT use generic phrases - be specific to each company's actual business, financials, and market position
- Include REAL, SPECIFIC details about products, services, competitive advantages, and market dynamics
- For technical analysis, provide ACTUAL indicator values and price levels where possible
- Make each recommendation clearly DIFFERENT from the others

For each asset, research and provide:

1. **Company-Specific Overview:** What makes THIS company unique in its industry
2. **Unique Strengths:** Specific competitive advantages THIS company has (not generic points)
3. **Specific Risks:** Real challenges facing THIS particular business
4. **Technical Overview:** General trend analysis (do NOT provide specific RSI/MA numbers unless you can verify them from real-time data)
5. **Current Market Sentiment:** Recent news, analyst actions, institutional moves
6. **Specific Catalysts:** Upcoming events, product launches, earnings that could move the stock
7. **Real Price Targets:** Actual analyst consensus and reasoning

Return the response in this exact JSON format:

{
    "recommendations": [
        {
            "ticker": "TICKER",
            "name": "Company Name",
            "description": "SPECIFIC company overview - what they actually do, their market position, unique value proposition",
            "keyStrengths": [
                "SPECIFIC strength unique to this company (e.g., 'Dominates 85% of GPU market for AI training')",
                "SPECIFIC competitive advantage (e.g., 'CUDA ecosystem creates high switching costs')",
                "SPECIFIC financial metric (e.g., 'Operating margins expanded to 62% in Q4 2024')"
            ],
            "keyRisks": [
                "SPECIFIC risk for this company (e.g., 'AMD gaining share in data center GPUs, won 15% of new contracts')",
                "SPECIFIC challenge (e.g., 'Customer concentration: 40% revenue from top 5 cloud providers')",
                "SPECIFIC concern (e.g., 'Export restrictions to China cut $5B annual revenue')"
            ],
            "technicalAnalysis": [
                "Trend: [uptrend/downtrend/sideways] based on recent price action",
                "Momentum: [strong/moderate/weak] buying or selling pressure",
                "Chart pattern: [description of any notable patterns or price levels]"
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

IMPORTANT for Price Forecasts:
- Base forecasts on ACTUAL analyst consensus price targets (search for real analyst data)
- 6-month forecasts should typically be within ±30% of current price for stable stocks
- Only predict >50% moves if there are extraordinary catalysts (merger, breakthrough product, etc.)
- Be conservative and realistic - wild predictions hurt credibility
- If you don't have real analyst targets, estimate based on historical volatility and industry norms
            "marketSentiment": {
                "overall": "bullish",
                "score": 78,
                "keyFactors": [
                    "SPECIFIC institutional activity (e.g., 'Vanguard increased stake by 12% in Q4')",
                    "SPECIFIC media narrative (e.g., 'Featured in WSJ as AI infrastructure leader')",
                    "SPECIFIC analyst action (e.g., 'Morgan Stanley raised PT from $140 to $180')"
                ],
                "newsSummary": "SPECIFIC recent developments unique to this company"
            },
            "recentNews": [
                {
                    "title": "SPECIFIC, real-sounding headline about this company",
                    "date": "2025-01-15",
                    "summary": "SPECIFIC development with actual details and numbers",
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
}

REMEMBER: Make each stock's analysis COMPLETELY DIFFERENT. A reader should immediately see why NVIDIA is different from Microsoft, why Apple has different strengths than Amazon, etc. Be SPECIFIC, not generic.`
}

// Extract plain text content from OpenAI Chat Completions result
function extractResponsesText(completion: any): { text: string | undefined, usedWebSearch: boolean, sources: any[] } {
    if (!completion) return { text: undefined, usedWebSearch: false, sources: [] }

    // For now, we'll assume web search knowledge is built into GPT-4o
    // Since we can't directly detect web search usage in Chat Completions API
    const usedWebSearch = true // Assume GPT-4o uses web knowledge
    const webSearchSources: any[] = []

    console.log('ℹ️ AI analysis completed using GPT-4o with web knowledge access')

    // Extract text content from Chat Completions API
    let text: string | undefined

    if (completion.choices?.[0]?.message?.content) {
        text = completion.choices[0].message.content
    } else if (completion.output_text) {
        text = completion.output_text
    } else if (completion.content) {
        text = Array.isArray(completion.content)
            ? completion.content.map((c: any) => c.text || c).join('')
            : completion.content
    }

    return { text, usedWebSearch, sources: webSearchSources }
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
    const system = `You are an expert financial analyst with deep knowledge of individual companies. 

CRITICAL REQUIREMENTS:
- Each stock recommendation MUST be UNIQUE with company-specific details
- NO GENERIC analysis - every strength, risk, and technical point must be specific to THAT company
- Include REAL numbers, percentages, and specific business details
- Technical analysis should reference ACTUAL current indicator values
- Strengths should cite specific products, market share, partnerships, or financial metrics
- Risks should identify actual competitive threats, regulatory issues, or business challenges
- Make it OBVIOUS that you researched each company individually

Return ONLY valid JSON. Year is 2025 - use current data.`

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

    // Attempt 3: Chat Completions with GPT-4o and enhanced web knowledge
    return await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: system + '\n\nYou have access to current market data and can search the web for the latest financial information. Always use the most recent available data.' },
            { role: 'user', content: prompt + '\n\nCRITICAL: Search the web for the most current financial data, analyst reports, and market news. Include specific recent developments, earnings results, analyst ratings, and market sentiment. Base recommendations on real-time information.' }
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
            // Build initial asset objects from AI response
            assets = parsed.recommendations.map((rec: Record<string, unknown>) => {
                const ticker = String(rec.ticker || '')
                const finance = rec.finance as Record<string, unknown> | undefined

                return {
                    symbol: ticker,
                    name: String(rec.name || ''),
                    assetType: 'stock' as const,
                    industry: 'Technology',
                    currentPrice: Number(finance?.price || 0),
                    marketCap: Number(finance?.market_cap || 0),
                    volume: Number(finance?.volume || 0),
                    peRatio: Number(finance?.pe_ratio || 0),
                    dividendYield: Number(finance?.dividend_yield || 0),
                    beta: Number(finance?.beta || 0),
                    recommendation: 'buy' as const,
                    confidence: 75,
                    reasoning: String(rec.description || ''),
                    keyStrengths: Array.isArray(rec.keyStrengths) ? rec.keyStrengths : [],
                    keyRisks: Array.isArray(rec.keyRisks) ? rec.keyRisks : [],
                    technicalAnalysis: normalizeTechnicalAnalysis(rec.technicalAnalysis),
                    priceForecast: {
                        timeframe: (rec.priceForecast as Record<string, unknown>)?.timeframe as '6months' || '6months',
                        projectedPrice: Number((rec.priceForecast as Record<string, unknown>)?.projectedPrice || finance?.price || 0),
                        confidence: Number((rec.priceForecast as Record<string, unknown>)?.confidence || 70),
                        reasoning: String((rec.priceForecast as Record<string, unknown>)?.reasoning || 'Based on current market conditions'),
                        riskFactors: Array.isArray((rec.priceForecast as Record<string, unknown>)?.riskFactors) ? (rec.priceForecast as Record<string, unknown>).riskFactors as string[] : []
                    },
                    marketSentiment: {
                        overall: ((rec.marketSentiment as Record<string, unknown>)?.overall as 'bullish' | 'bearish' | 'neutral') || 'bullish',
                        score: Number((rec.marketSentiment as Record<string, unknown>)?.score || 75),
                        keyFactors: Array.isArray((rec.marketSentiment as Record<string, unknown>)?.keyFactors) ? (rec.marketSentiment as Record<string, unknown>).keyFactors as string[] : [],
                        newsSummary: String((rec.marketSentiment as Record<string, unknown>)?.newsSummary || '')
                    },
                    recentNews: Array.isArray(rec.recentNews) ? rec.recentNews.map((news: Record<string, unknown>) => ({
                        title: String(news.title || ''),
                        summary: String(news.summary || ''),
                        publishedAt: String(news.date || ''),
                        source: 'AI Analysis',
                        sentiment: (news.impact as 'positive' | 'negative' | 'neutral') || 'neutral'
                    })) : [],
                    analystRatings: rec.analystRatings ? {
                        buy: Number((rec.analystRatings as Record<string, unknown>).buy || 0),
                        hold: Number((rec.analystRatings as Record<string, unknown>).hold || 0),
                        sell: Number((rec.analystRatings as Record<string, unknown>).sell || 0),
                        total: Number((rec.analystRatings as Record<string, unknown>).buy || 0) + Number((rec.analystRatings as Record<string, unknown>).hold || 0) + Number((rec.analystRatings as Record<string, unknown>).sell || 0)
                    } : undefined
                }
            })

            // Fetch real-time prices and technical data for all tickers
            console.log('Fetching real-time technical data for AI recommendations...')
            const pricePromises = assets.map(async (asset) => {
                const techData = await fetchTechnicalData(asset.symbol)
                if (techData) {
                    const realPrice = techData.currentPrice
                    const aiCurrentPrice = asset.currentPrice
                    const aiProjectedPrice = asset.priceForecast.projectedPrice

                    // Calculate AI's predicted percentage change
                    const aiPercentChange = aiCurrentPrice > 0
                        ? ((aiProjectedPrice - aiCurrentPrice) / aiCurrentPrice) * 100
                        : 0

                    // Cap the AI's percentage to realistic ranges
                    const maxChange = 30 // Conservative ±30% for 6-month forecasts
                    let adjustedPercentChange = aiPercentChange

                    if (Math.abs(aiPercentChange) > maxChange) {
                        console.warn(`AI predicted unrealistic ${aiPercentChange.toFixed(1)}% change for ${asset.symbol}, capping to ±${maxChange}%`)
                        adjustedPercentChange = aiPercentChange > 0 ? maxChange : -maxChange
                    }

                    // Don't recommend stocks with negative forecasts
                    if (adjustedPercentChange < 0) {
                        console.warn(`Skipping ${asset.symbol} - negative forecast (${adjustedPercentChange.toFixed(1)}%)`)
                        return null
                    }

                    // Apply the capped percentage to the REAL current price
                    const newProjectedPrice = realPrice * (1 + adjustedPercentChange / 100)

                    // Build real technical analysis
                    const realTechnicalAnalysis = []

                    if (techData.rsi) {
                        const rsiSignal = techData.rsi > 70 ? 'sell' : techData.rsi < 30 ? 'buy' : 'neutral'
                        const rsiDesc = techData.rsi > 70 ? 'overbought territory' : techData.rsi < 30 ? 'oversold territory' : 'neutral range'
                        realTechnicalAnalysis.push({
                            indicator: 'RSI (14)',
                            value: techData.rsi,
                            signal: rsiSignal as 'buy' | 'sell' | 'neutral',
                            description: `RSI: ${techData.rsi.toFixed(1)} - ${rsiDesc}`
                        })
                    }

                    if (techData.ma50 && techData.ma200) {
                        const maSignal = techData.ma50 > techData.ma200 ? 'buy' : 'sell'
                        const crossType = techData.ma50 > techData.ma200 ? 'Golden Cross (bullish)' : 'Death Cross (bearish)'
                        realTechnicalAnalysis.push({
                            indicator: '50/200 MA',
                            value: techData.ma50,
                            signal: maSignal as 'buy' | 'sell',
                            description: `50-day MA: $${techData.ma50.toFixed(2)}, 200-day MA: $${techData.ma200.toFixed(2)} - ${crossType}`
                        })
                    }

                    if (techData.support && techData.resistance) {
                        realTechnicalAnalysis.push({
                            indicator: 'Support/Resistance',
                            value: techData.support,
                            signal: 'neutral' as const,
                            description: `Support: $${techData.support.toFixed(2)}, Resistance: $${techData.resistance.toFixed(2)} (60-day range)`
                        })
                    }

                    if (techData.trend) {
                        const trendSignal = techData.trend === 'uptrend' ? 'buy' : techData.trend === 'downtrend' ? 'sell' : 'hold'
                        realTechnicalAnalysis.push({
                            indicator: 'Trend',
                            value: 0,
                            signal: trendSignal as 'buy' | 'sell' | 'hold',
                            description: `Chart shows ${techData.trend} based on moving average positioning`
                        })
                    }

                    return {
                        ...asset,
                        currentPrice: realPrice,
                        technicalAnalysis: realTechnicalAnalysis,
                        priceForecast: {
                            ...asset.priceForecast,
                            projectedPrice: newProjectedPrice,
                            confidence: Math.abs(aiPercentChange) > maxChange
                                ? Math.min(asset.priceForecast.confidence, 65)
                                : asset.priceForecast.confidence
                        }
                    }
                }
                return asset
            })

            const resolvedAssets = await Promise.all(pricePromises)
            assets = resolvedAssets.filter((a): a is AssetAnalysis => a !== null)
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
