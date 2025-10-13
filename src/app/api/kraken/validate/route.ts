import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import axios from 'axios'

interface KrakenBalanceResponse {
    error: string[]
    result: {
        [asset: string]: string
    }
}

interface KrakenTickerResponse {
    error: string[]
    result: {
        [pair: string]: {
            c: [string, string] // Last trade closed: price, lot volume
        }
    }
}

function generateNonce(): string {
    // Use simple timestamp-based nonce like the working Python script
    return Math.floor(Date.now()).toString()
}

function generateSignature(path: string, nonce: string, postData: string, apiSecret: string): string {
    const message = nonce + postData
    const secret = Buffer.from(apiSecret, 'base64')
    const sha256 = crypto.createHash('sha256').update(message).digest()
    const hmac = crypto.createHmac('sha512', secret)
    hmac.update(path)
    hmac.update(sha256)
    return hmac.digest('base64')
}

async function getKrakenBalance(apiKey: string, apiSecret: string): Promise<KrakenBalanceResponse> {
    // Add a small delay to prevent nonce issues
    await new Promise(resolve => setTimeout(resolve, 100))

    const nonce = generateNonce()
    const path = '/0/private/Balance'
    const url = `https://api.kraken.com${path}`
    const postData = new URLSearchParams({ nonce }).toString()

    const headers = {
        'API-Key': apiKey,
        'API-Sign': generateSignature(path, nonce, postData, apiSecret),
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'KrakenPortfolioTracker/1.0',
    }

    try {
        const response = await axios.post(url, postData, { headers, timeout: 10000 })
        return response.data
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            return error.response.data
        }
        throw error
    }
}

async function getKrakenPrice(pair: string): Promise<number> {
    const url = `https://api.kraken.com/0/public/Ticker?pair=${pair}`
    const response = await axios.get(url)
    const data: KrakenTickerResponse = response.data

    if (data.error && data.error.length > 0) {
        throw new Error(data.error.join(', '))
    }

    const ticker = Object.values(data.result)[0]
    return parseFloat(ticker.c[0])
}

export async function POST(request: NextRequest) {
    try {
        const { apiKey, apiSecret } = await request.json()

        if (!apiKey || !apiSecret) {
            return NextResponse.json(
                { isValid: false, error: 'API key and secret are required' },
                { status: 400 }
            )
        }

        // Get balance to validate credentials
        const balanceResponse = await getKrakenBalance(apiKey, apiSecret)

        if (balanceResponse.error && balanceResponse.error.length > 0) {
            const krakenError = balanceResponse.error.join(', ')

            // Provide more helpful error messages
            let userFriendlyError = krakenError

            if (krakenError.includes('EAPI:Bad request')) {
                userFriendlyError = 'Invalid API credentials or missing permissions. Please check:\n' +
                    '• API key and secret are correct\n' +
                    '• API key has "Query Funds" permission enabled\n' +
                    '• API key is active (not disabled)\n' +
                    '• No extra spaces or characters in credentials'
            } else if (krakenError.includes('EAPI:Invalid key')) {
                userFriendlyError = 'Invalid API key format. Please check your API key is correct.'
            } else if (krakenError.includes('EAPI:Invalid signature')) {
                userFriendlyError = 'Invalid API secret. Please check your API secret is correct.'
            } else if (krakenError.includes('EAPI:Invalid nonce')) {
                userFriendlyError = 'Invalid nonce. This usually indicates a time synchronization issue.'
            }

            return NextResponse.json({
                isValid: false,
                error: userFriendlyError
            })
        }

        // Calculate total balance in USD
        let totalUSD = 0
        const balances = balanceResponse.result

        for (const [asset, balance] of Object.entries(balances)) {
            const amount = parseFloat(balance)
            if (amount > 0) {
                if (asset === 'USD' || asset === 'ZUSD') {
                    totalUSD += amount
                } else {
                    try {
                        // Try common pairs
                        let price = 0
                        if (asset === 'BTC' || asset === 'XBT') {
                            price = await getKrakenPrice('XBTUSD')
                        } else if (asset === 'ETH') {
                            price = await getKrakenPrice('ETHUSD')
                        } else {
                            // Try generic pair
                            price = await getKrakenPrice(`${asset}USD`)
                        }
                        totalUSD += amount * price
                    } catch (error) {
                        console.warn(`Could not get price for ${asset}:`, error)
                    }
                }
            }
        }

        return NextResponse.json({
            isValid: true,
            balance: totalUSD
        })
    } catch (error) {
        console.error('Kraken API validation error:', error)
        return NextResponse.json({
            isValid: false,
            error: error instanceof Error ? error.message : 'Failed to validate credentials'
        })
    }
}
