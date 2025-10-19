import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: 'OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.' },
                { status: 500 }
            )
        }

        const body = await request.json()
        const { investor, investmentStyle } = body

        if (!investor || !investmentStyle) {
            return NextResponse.json(
                { error: 'Missing required fields: investor and investmentStyle' },
                { status: 400 }
            )
        }

        const prompt = `As ${investor}, recommend 10 stocks for the next 5 years using ${investmentStyle} principles.

Be concise. Return ONLY valid JSON in this format:
{
    "investor": "${investor}",
    "investmentStyle": "${investmentStyle}",
    "recommendations": [
        {
            "ticker": "AAPL",
            "name": "Apple Inc.",
            "description": "Company analysis from ${investor}'s perspective",
            "investmentPhilosophy": "How this aligns with ${investmentStyle}",
            "keyStrengths": ["Strength 1", "Strength 2", "Strength 3"],
            "keyRisks": ["Risk 1", "Risk 2", "Risk 3"],
            "finance": {
                "price": 150.25,
                "market_cap": 2500000000000,
                "pe_ratio": 25.5,
                "dividend_yield": 0.6
            },
            "priceForecast": {
                "projectedPrice": 250.00,
                "confidence": 85,
                "reasoning": "Strong fundamentals and growth potential"
            },
            "analystRatings": {
                "buy": 25,
                "hold": 5,
                "sell": 2,
                "average_target": 175.00
            }
        }
    ]
}`

        console.log('Making OpenAI API call for:', { investor, investmentStyle })
        console.log('Prompt length:', prompt.length)

        // Call OpenAI with error handling similar to the existing API
        let completion
        try {
            completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: prompt },
                ],
                response_format: { type: 'json_object' },
                max_tokens: 16000,
                temperature: 0.5,
            })
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

        console.log('OpenAI response received')

        const responseContent = completion.choices?.[0]?.message?.content || '{}'
        console.log('Response content length:', responseContent.length)
        console.log('Response content preview:', responseContent.substring(0, 200))

        if (!responseContent || responseContent === '{}') {
            return NextResponse.json(
                { error: 'No response received from AI service' },
                { status: 500 }
            )
        }

        let data
        try {
            data = JSON.parse(responseContent)
            console.log('Successfully parsed JSON response')
        } catch (parseError) {
            console.error('Failed to parse OpenAI response as JSON:', parseError)
            console.error('Raw response:', responseContent)
            return NextResponse.json(
                { error: 'Invalid response format from AI service' },
                { status: 500 }
            )
        }

        return NextResponse.json(data)

    } catch (error) {
        console.error('AI Investor Stocks API Error:', error)

        // Provide more detailed error information
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        const errorDetails = {
            message: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
        }

        console.error('Detailed error info:', errorDetails)

        return NextResponse.json(
            {
                error: 'Failed to generate investor-based stock recommendations',
                details: errorMessage,
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        )
    }
}
