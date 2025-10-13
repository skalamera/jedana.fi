import axios from 'axios'

interface KrakenApiCredentials {
    apiKey: string
    apiSecret: string
}

interface KrakenTickerResponse {
    error: string[]
    result: {
        [pair: string]: {
            a: [string, string, string] // Ask: price, whole lot volume, lot volume
            b: [string, string, string] // Bid: price, whole lot volume, lot volume
            c: [string, string] // Last trade closed: price, lot volume
            v: [string, string] // Volume: today, last 24 hours
            p: [string, string] // Volume weighted average price: today, last 24 hours
            t: [number, number] // Number of trades: today, last 24 hours
            l: [string, string] // Low: today, last 24 hours
            h: [string, string] // High: today, last 24 hours
            o: [string, string] // Today's opening price
        }
    }
}

interface KrakenBalanceResponse {
    error: string[]
    result: {
        [asset: string]: string // Asset symbol to balance
    }
}

export class KrakenApi {
    private apiKey: string
    private apiSecret: string
    private baseUrl = 'https://api.kraken.com'

    constructor(credentials: KrakenApiCredentials) {
        this.apiKey = credentials.apiKey
        this.apiSecret = credentials.apiSecret
    }

    private generateNonce(): string {
        return Date.now().toString()
    }

    private generateSignature(path: string, nonce: string, postData: string = ''): string {
        // This method is only used server-side now
        throw new Error('Direct API calls not supported in browser. Use API routes instead.')
    }

    private async makeRequest(method: string, path: string, params: Record<string, string> = {}): Promise<unknown> {
        const nonce = this.generateNonce()
        const url = `${this.baseUrl}${path}`

        const headers: Record<string, string> = {
            'API-Key': this.apiKey,
            'API-Sign': '',
            'User-Agent': 'KrakenPortfolioTracker/1.0',
        }

        let postData = ''
        if (method === 'POST') {
            postData = new URLSearchParams({ nonce, ...params }).toString()
            headers['Content-Type'] = 'application/x-www-form-urlencoded'
            headers['API-Sign'] = this.generateSignature(path, nonce, postData)
        } else {
            // GET request
            const queryString = new URLSearchParams(params).toString()
            const finalUrl = queryString ? `${url}?${queryString}` : url
            return axios.get(finalUrl)
        }

        return axios.post(url, postData, { headers })
    }

    async getTicker(pair: string = 'BTCUSD'): Promise<KrakenTickerResponse> {
        const response = await this.makeRequest('GET', '/0/public/Ticker', { pair })
        return response as KrakenTickerResponse
    }

    async getBalance(): Promise<KrakenBalanceResponse> {
        const response = await this.makeRequest('POST', '/0/private/Balance')
        return response as KrakenBalanceResponse
    }

    async getAccountBalance(): Promise<{ [asset: string]: number }> {
        try {
            const response = await this.getBalance()
            const balances: { [asset: string]: number } = {}

            for (const [asset, balance] of Object.entries(response.result)) {
                const numBalance = parseFloat(balance)
                if (numBalance > 0) {
                    balances[asset] = numBalance
                }
            }

            return balances
        } catch (error) {
            console.error('Failed to get account balance:', error)
            throw new Error('Failed to fetch account balance from Kraken')
        }
    }

    async getPrice(asset: string, quote: string = 'USD'): Promise<number> {
        try {
            const pair = `${asset}${quote}`
            const response = await this.getTicker(pair)

            if (response.error.length > 0) {
                throw new Error(response.error.join(', '))
            }

            const ticker = Object.values(response.result)[0]
            return parseFloat(ticker.c[0]) // Last trade closed price
        } catch (error) {
            console.error(`Failed to get price for ${asset}:`, error)
            throw new Error(`Failed to get price for ${asset}`)
        }
    }

    async validateCredentials(): Promise<boolean> {
        try {
            await this.getBalance()
            return true
        } catch (error) {
            console.error('Credential validation failed:', error)
            return false
        }
    }
}

// Exported helper function for validating Kraken credentials
export async function validateKrakenCredentials(apiKey: string, apiSecret: string): Promise<{
    isValid: boolean
    error?: string
    balance?: number
}> {
    try {
        const response = await fetch('/api/kraken/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ apiKey, apiSecret }),
        })

        const data = await response.json()
        return data
    } catch (error) {
        console.error('Credential validation error:', error)
        return {
            isValid: false,
            error: error instanceof Error ? error.message : 'Failed to validate credentials'
        }
    }
}