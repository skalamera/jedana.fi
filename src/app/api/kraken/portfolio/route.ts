import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import axios from 'axios'
import { createClient } from '@supabase/supabase-js'

// Equity prices function with historical data
async function fetchEquityPrices(symbols: string[]): Promise<{
    [symbol: string]: {
        currentPrice: number
        previousClose: number
    }
}> {
    try {
        const prices: { [symbol: string]: { currentPrice: number; previousClose: number } } = {}

        for (const symbol of symbols) {
            try {
                // Normalize symbol for Yahoo Finance (convert dots to hyphens)
                const yahooSymbol = symbol.replace(/\./g, '-')
                console.log(`Fetching Yahoo Finance data for ${symbol} (normalized: ${yahooSymbol})`)

                // Get current price and historical data
                const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=2d&interval=1d`

                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                })

                if (!response.ok) {
                    console.warn(`Failed to fetch data for ${symbol}: HTTP ${response.status}`)
                    continue
                }

                const data = await response.json()

                if (!data.chart?.result?.[0]) {
                    console.warn(`No chart data found for ${symbol}`)
                    continue
                }

                const result = data.chart.result[0]
                const currentPrice = result.meta?.regularMarketPrice
                const timestamps = result.timestamp || []
                const closes = result.indicators?.quote?.[0]?.close || []

                if (!currentPrice || timestamps.length < 2 || closes.length < 2) {
                    console.warn(`Insufficient data for ${symbol}`)
                    continue
                }

                // Find the most recent trading day with actual price movement
                // Yahoo Finance returns data points even for non-trading days, but with same prices
                let lastTradingPrice = currentPrice
                let previousTradingPrice = closes[closes.length - 2]

                // Check if there's been actual price movement (indicating real trading)
                // If the last two data points are the same, we might be looking at weekend data
                const recentCloses = closes.slice(-5) // Check last 5 data points
                const hasRecentMovement = recentCloses.some((close: number, index: number) => {
                    if (index === 0) return false
                    return Math.abs(close - recentCloses[index - 1]) > 0.01 // More than 1 cent movement
                })

                if (!hasRecentMovement) {
                    console.log(`${symbol}: No recent price movement detected - market may be closed`)
                    // Use the current price as both current and "previous" since no trading occurred
                    prices[symbol] = {
                        currentPrice,
                        previousClose: currentPrice // No P&L if no trading
                    }
                } else {
                    // Normal case: use actual previous close for P&L calculation
                    prices[symbol] = {
                        currentPrice,
                        previousClose: previousTradingPrice
                    }
                }

                console.log(`${symbol} (Yahoo: ${yahooSymbol}): Current $${currentPrice}, Previous $${previousTradingPrice}, Movement: ${hasRecentMovement ? 'Yes' : 'No'}`)
            } catch (error) {
                console.warn(`Error fetching data for ${symbol}:`, error)
            }
        }

        return prices
    } catch (error) {
        console.error('Error fetching equity prices:', error)
        return {}
    }
}

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
            o: string // Today's opening price
        }
    }
}

// Track last nonce in-process to guarantee strictly increasing values
let lastNonce = 0
function nextNonce(): string {
    const now = Date.now()
    if (now <= lastNonce) lastNonce = lastNonce + 1
    else lastNonce = now
    return String(lastNonce)
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
    const path = '/0/private/Balance'
    const url = `https://api.kraken.com${path}`

    // up to 3 attempts in case of nonce race
    let lastError: KrakenBalanceResponse | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
        // small backoff between attempts
        if (attempt > 0) await new Promise(r => setTimeout(r, 300 * attempt))

        // ensure strictly increasing nonce per process
        const nonce = nextNonce()
        console.log('Generated nonce:', nonce)

        const formData = new URLSearchParams()
        formData.append('nonce', nonce)
        const postData = formData.toString()

        const signature = generateSignature(path, nonce, postData, apiSecret)

        const headers = {
            'API-Key': apiKey,
            'API-Sign': signature,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'KrakenPortfolioTracker/1.0',
        }

        try {
            const response = await axios.post(url, postData, {
                headers,
                timeout: 15000,
                validateStatus: (status) => status < 500
            })
            const data: KrakenBalanceResponse = response.data
            if (data?.error && data.error.length > 0) {
                const errText = data.error.join(', ')
                console.warn('Kraken error:', errText)
                lastError = data
                if (errText.includes('EAPI:Invalid nonce')) {
                    // try another attempt with a strictly larger nonce
                    continue
                }
            }
            return data
        } catch (e) {
            console.error('Axios error on attempt', attempt + 1, e)
        }
    }
    return lastError || { error: ['Unknown error'], result: {} as any }
}

async function getAllKrakenPrices(): Promise<{ [pair: string]: { price: number; openPrice: number } }> {
    try {
        // Fetch all USD pairs that Kraken supports
        const url = `https://api.kraken.com/0/public/Ticker`
        const response = await axios.get(url, { timeout: 10000 })
        const data: KrakenTickerResponse = response.data

        if (data.error && data.error.length > 0) {
            console.warn(`Failed to fetch all tickers: ${data.error.join(', ')}`)
            return {}
        }

        const prices: { [pair: string]: { price: number; openPrice: number } } = {}

        // Process all ticker data
        for (const [pair, ticker] of Object.entries(data.result)) {
            // Only include USD pairs
            if (pair.endsWith('USD') || pair.endsWith('ZUSD')) {
                prices[pair] = {
                    price: parseFloat(ticker.c[0]),
                    openPrice: parseFloat(ticker.o)
                }
            }
        }

        console.log('Available crypto price pairs:', Object.keys(prices))
        return prices
    } catch (error) {
        console.error('Error fetching crypto prices:', error)
        return {}
    }
}

// Asset mapping for Kraken symbols - Note: Kraken uses specific prefixes
const assetMapping: { [key: string]: { name: string; pair?: string; stablecoin?: boolean } } = {
    // Cryptocurrencies - Kraken uses XX prefix for crypto pairs
    'XBT': { name: 'Bitcoin', pair: 'XXBTZUSD' },
    'BTC': { name: 'Bitcoin', pair: 'XXBTZUSD' },
    'ETH': { name: 'Ethereum', pair: 'XETHZUSD' },
    'XETH': { name: 'Ethereum', pair: 'XETHZUSD' },
    'ADA': { name: 'Cardano', pair: 'ADAUSD' },
    'DOT': { name: 'Polkadot', pair: 'DOTUSD' },
    'SOL': { name: 'Solana', pair: 'SOLUSD' },
    'MATIC': { name: 'Polygon', pair: 'MATICUSD' },
    'LINK': { name: 'Chainlink', pair: 'LINKUSD' },
    'XRP': { name: 'Ripple', pair: 'XXRPZUSD' },
    'XXRP': { name: 'Ripple', pair: 'XXRPZUSD' },
    'LTC': { name: 'Litecoin', pair: 'XLTCZUSD' },
    'XLTC': { name: 'Litecoin', pair: 'XLTCZUSD' },
    'BCH': { name: 'Bitcoin Cash', pair: 'BCHUSD' },
    'XLM': { name: 'Stellar', pair: 'XXLMZUSD' },
    'XXLM': { name: 'Stellar', pair: 'XXLMZUSD' },
    'ATOM': { name: 'Cosmos', pair: 'ATOMUSD' },
    'UNI': { name: 'Uniswap', pair: 'UNIUSD' },
    'AVAX': { name: 'Avalanche', pair: 'AVAXUSD' },
    'ALGO': { name: 'Algorand', pair: 'ALGOUSD' },
    'FIL': { name: 'Filecoin', pair: 'FILUSD' },
    'TRX': { name: 'TRON', pair: 'TRXUSD' },
    'MANA': { name: 'Decentraland', pair: 'MANAUSD' },
    'SAND': { name: 'The Sandbox', pair: 'SANDUSD' },
    'GRT': { name: 'The Graph', pair: 'GRTUSD' },
    'CRV': { name: 'Curve', pair: 'CRVUSD' },
    'AAVE': { name: 'Aave', pair: 'AAVEUSD' },
    'SNX': { name: 'Synthetix', pair: 'SNXUSD' },
    'COMP': { name: 'Compound', pair: 'COMPUSD' },
    'SUSHI': { name: 'SushiSwap', pair: 'SUSHIUSD' },
    'YFI': { name: 'Yearn Finance', pair: 'YFIUSD' },
    'MKR': { name: 'Maker', pair: 'MKRUSD' },
    'ENJ': { name: 'Enjin Coin', pair: 'ENJUSD' },
    'BAT': { name: 'Basic Attention Token', pair: 'BATUSD' },
    'ZEC': { name: 'Zcash', pair: 'XZECZUSD' },
    'XZEC': { name: 'Zcash', pair: 'XZECZUSD' },
    'DASH': { name: 'Dash', pair: 'DASHUSD' },
    'EOS': { name: 'EOS', pair: 'EOSUSD' },
    'XEOS': { name: 'EOS', pair: 'EOSUSD' },
    'KSM': { name: 'Kusama', pair: 'KSMUSD' },
    'WAVES': { name: 'Waves', pair: 'WAVESUSD' },
    'KAVA': { name: 'Kava', pair: 'KAVAUSD' },

    // Stablecoins
    'USDT': { name: 'Tether', stablecoin: true },
    'USDC': { name: 'USD Coin', stablecoin: true },
    'DAI': { name: 'Dai', stablecoin: true },
    'USD': { name: 'US Dollar', stablecoin: true },
    'ZUSD': { name: 'US Dollar', stablecoin: true },

    // Fiat
    'EUR': { name: 'Euro' },
    'ZEUR': { name: 'Euro' },
    'GBP': { name: 'British Pound' },
    'ZGBP': { name: 'British Pound' },
    'CAD': { name: 'Canadian Dollar' },
    'ZCAD': { name: 'Canadian Dollar' },
    'JPY': { name: 'Japanese Yen' },
    'ZJPY': { name: 'Japanese Yen' },
    'CHF': { name: 'Swiss Franc' },
    'ZCHF': { name: 'Swiss Franc' },
    'AUD': { name: 'Australian Dollar' },
    'ZAUD': { name: 'Australian Dollar' },
}

export async function GET(request: NextRequest) {
    try {
        console.log('Portfolio API called')
        console.log('Request method:', request.method)
        console.log('Request URL:', request.url)

        // Get authorization header
        const authHeader = request.headers.get('authorization')
        console.log('Auth header:', authHeader ? 'present' : 'missing')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('Missing or invalid auth header')
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const token = authHeader.replace('Bearer ', '')

        // Initialize Supabase client
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            }
        )

        // Get user from token
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get API keys from database
        console.log('Fetching API keys for user:', user.id)
        const { data: apiKeysData, error: fetchError } = await supabase
            .from('api_keys')
            .select('kraken_api_key, kraken_api_secret')
            .eq('user_id', user.id)
            .single()

        if (fetchError || !apiKeysData) {
            console.error('API keys fetch error:', fetchError)
            return NextResponse.json(
                { error: 'No API keys found. Please configure your Kraken API keys in settings.' },
                { status: 404 }
            )
        }

        const { kraken_api_key: apiKey, kraken_api_secret: apiSecret } = apiKeysData
        console.log('API Key retrieved:', apiKey ? 'present' : 'missing')
        console.log('API Secret retrieved:', apiSecret ? 'present' : 'missing')

        // Get balance from Kraken
        console.log('Fetching Kraken balance...')
        const balanceResponse = await getKrakenBalance(
            apiKey,
            apiSecret
        )
        console.log('Balance response:', balanceResponse)

        if (balanceResponse.error && balanceResponse.error.length > 0) {
            console.error('Kraken balance error:', balanceResponse.error)
            return NextResponse.json({
                error: balanceResponse.error.join(', ')
            }, { status: 400 })
        }

        console.log('Balance response:', Object.keys(balanceResponse.result))

        // Prepare assets and price pairs
        const assets = []
        const pricePairs = []

        for (const [asset, balance] of Object.entries(balanceResponse.result)) {
            const amount = parseFloat(balance)
            if (amount > 0.00001) { // Filter out dust

                // Check if this is an equity asset
                const isEquity = asset.endsWith('.EQ')
                const assetInfo = assetMapping[asset] || { name: asset }

                // Only try to get prices for known pairs (equity assets won't have Kraken pairs)
                let pair = assetInfo.pair
                if (isEquity) {
                    console.log(`Equity asset ${asset} found in Kraken balance - should be tracked manually`)
                    pair = undefined // Equity assets don't have Kraken pairs
                } else if (!pair && !assetInfo.stablecoin && asset !== 'USD' && asset !== 'EUR') {
                    // For unknown crypto assets, we'll skip price fetching
                    console.log(`Unknown crypto asset ${asset}, skipping price fetch`)
                }

                assets.push({
                    symbol: asset,
                    name: assetInfo.name,
                    balance: amount,
                    pair: pair,
                    isStablecoin: assetInfo.stablecoin
                })

                if (pair) {
                    pricePairs.push(pair)
                }
            }
        }

        // Get crypto prices from Kraken
        console.log('Fetching crypto prices from Kraken...')
        const cryptoPrices = await getAllKrakenPrices()

        // Get equity prices from Yahoo Finance API
        const equitySymbols = assets
            .filter(asset => asset.symbol.endsWith('.EQ'))
            .map(asset => asset.symbol.replace('.EQ', ''))

        console.log('Equity symbols to fetch:', equitySymbols)

        let equityPrices: { [symbol: string]: { currentPrice: number; previousClose: number } } = {}
        if (equitySymbols.length > 0) {
            console.log('Fetching equity prices for:', equitySymbols)
            equityPrices = await fetchEquityPrices(equitySymbols)
            console.log('Equity prices result:', equityPrices)

            // Log any missing symbols
            const missingSymbols = equitySymbols.filter(symbol => !equityPrices[symbol])
            if (missingSymbols.length > 0) {
                console.warn('Missing equity price data for symbols:', missingSymbols)
            }
        }

        // Fetch stored cost basis for all assets
        console.log('Fetching stored cost basis...')
        const { data: storedCostBasis } = await supabase
            .from('asset_cost_basis')
            .select('*')
            .eq('user_id', user.id)

        const costBasisMap = new Map<string, number>()
        if (storedCostBasis) {
            storedCostBasis.forEach((item: any) => {
                costBasisMap.set(`${item.symbol}:${item.asset_type}`, item.cost_basis)
            })
        }

        // Calculate portfolio values
        let totalValue = 0
        let totalDailyPnL = 0

        const portfolioAssets = assets.map(asset => {
            let currentPrice = 0
            let value = 0
            let dailyPnL = 0
            let dailyPnLPercentage = 0
            let costBasis = 0
            let unrealizedPnL = 0
            let unrealizedPnLPercentage = 0

            // Determine asset type and get stored cost basis
            let assetType = 'crypto'
            if (asset.symbol.endsWith('.EQ')) {
                assetType = 'equity'
            } else if (asset.symbol === 'USD' || asset.symbol === 'ZUSD' || asset.isStablecoin) {
                assetType = 'crypto' // Treat stablecoins as crypto for cost basis purposes
            }

            // Get stored cost basis, fallback to current price if not set
            const costBasisKey = `${asset.symbol}:${assetType}`
            costBasis = costBasisMap.get(costBasisKey) || 0

            // Handle USD and stablecoins
            if (asset.symbol === 'USD' || asset.symbol === 'ZUSD' || asset.isStablecoin) {
                currentPrice = 1
                value = asset.balance
            }
            // Handle known fiat currencies (rough estimates, should use forex rates in production)
            else if (asset.symbol === 'EUR' || asset.symbol === 'ZEUR') {
                currentPrice = 1.08 // Approximate EUR/USD rate
                value = asset.balance * currentPrice
            }
            else if (asset.symbol === 'GBP' || asset.symbol === 'ZGBP') {
                currentPrice = 1.27 // Approximate GBP/USD rate
                value = asset.balance * currentPrice
            }
            else if (asset.symbol === 'CAD' || asset.symbol === 'ZCAD') {
                currentPrice = 0.74 // Approximate CAD/USD rate
                value = asset.balance * currentPrice
            }
            else if (asset.symbol === 'AUD' || asset.symbol === 'ZAUD') {
                currentPrice = 0.66 // Approximate AUD/USD rate
                value = asset.balance * currentPrice
            }
            else if (asset.symbol === 'JPY' || asset.symbol === 'ZJPY') {
                currentPrice = 0.0067 // Approximate JPY/USD rate
                value = asset.balance * currentPrice
            }
            else if (asset.symbol === 'CHF' || asset.symbol === 'ZCHF') {
                currentPrice = 1.10 // Approximate CHF/USD rate
                value = asset.balance * currentPrice
            }
            // Handle equity assets with Yahoo Finance prices
            else if (asset.symbol.endsWith('.EQ')) {
                const ticker = asset.symbol.replace('.EQ', '')
                const equityData = equityPrices[ticker]

                if (equityData) {
                    currentPrice = equityData.currentPrice
                    value = asset.balance * currentPrice

                    // Calculate daily P&L using previous close (only if there was actual trading)
                    // Daily P&L should be based on price movements, not cost basis
                    if (equityData.previousClose < equityData.currentPrice) {
                        // There was price movement, calculate P&L normally
                        const previousValue = asset.balance * equityData.previousClose
                        dailyPnL = value - previousValue
                        dailyPnLPercentage = previousValue > 0 ? (dailyPnL / previousValue) * 100 : 0

                        console.log(`Found equity data for ${asset.symbol}: Current $${currentPrice}, Previous $${equityData.previousClose}, Daily P&L $${dailyPnL.toFixed(2)}`)
                    } else {
                        // No price movement (weekend/holiday), show 0 P&L
                        dailyPnL = 0
                        dailyPnLPercentage = 0

                        console.log(`No trading movement for ${asset.symbol} - market may be closed`)
                    }
                } else {
                    console.warn(`No equity price data found for ${asset.symbol}`)
                    value = 0
                }
            }
            // Handle crypto assets - try to find price in multiple ways
            else {
                // Try to find a matching price pair
                let priceData = null

                // First try the mapped pair
                if (asset.pair && cryptoPrices[asset.pair]) {
                    priceData = cryptoPrices[asset.pair]
                }
                // Try common variations
                else {
                    const variations: string[] = [
                        `${asset.symbol}USD`,
                        `${asset.symbol}ZUSD`,
                        `X${asset.symbol}USD`,
                        `X${asset.symbol}ZUSD`,
                        `XX${asset.symbol}USD`,
                        `XX${asset.symbol}ZUSD`,
                        asset.symbol === 'XBT' ? 'XXBTZUSD' : null,
                        asset.symbol === 'BTC' ? 'XXBTZUSD' : null,
                        asset.symbol === 'ETH' ? 'XETHZUSD' : null,
                    ].filter(Boolean) as string[]

                    for (const variant of variations) {
                        if (cryptoPrices[variant]) {
                            priceData = cryptoPrices[variant]
                            console.log(`Found crypto price for ${asset.symbol} using pair ${variant}`)
                            break
                        }
                    }
                }

                if (priceData) {
                    currentPrice = priceData.price
                    value = asset.balance * currentPrice

                    // Calculate daily P&L based on opening price (not cost basis)
                    // Daily P&L should always be based on price movements, not cost basis
                    const openValue = asset.balance * priceData.openPrice
                    dailyPnL = value - openValue
                    dailyPnLPercentage = openValue > 0 ? (dailyPnL / openValue) * 100 : 0
                } else {
                    console.warn(`No crypto price found for ${asset.symbol}`)
                    value = 0
                }
            }

            // Calculate unrealized P&L using stored cost basis
            // costBasis represents the TOTAL amount paid for this asset
            if (costBasis > 0 && value > 0) {
                unrealizedPnL = value - costBasis
                unrealizedPnLPercentage = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0
            }

            if (value > 0) {
                totalValue += value
                totalDailyPnL += dailyPnL
            }

            const assetIsEquity = asset.symbol.endsWith('.EQ')

            return {
                symbol: asset.symbol,
                name: asset.name,
                balance: asset.balance,
                currentPrice,
                costBasis: costBasis > 0 ? costBasis : currentPrice, // Use stored cost basis if available, otherwise current price
                value,
                dailyPnL,
                dailyPnLPercentage,
                unrealizedPnL,
                unrealizedPnLPercentage,
                source: 'kraken' as const,
                // Add appropriate notes for different asset types
                ...(currentPrice === 0 && !asset.isStablecoin && asset.symbol !== 'USD' && asset.symbol !== 'EUR' ? {
                    note: 'Price data unavailable - asset may not be tradeable on Kraken'
                } : {})
            }
        }).filter(asset => asset.balance > 0) // Only return assets with balance

        const totalDailyPnLPercentage = totalValue > 0 ? (totalDailyPnL / (totalValue - totalDailyPnL)) * 100 : 0

        return NextResponse.json({
            assets: portfolioAssets,
            totalValue,
            totalDailyPnL,
            totalDailyPnLPercentage,
            lastUpdated: new Date().toISOString()
        })
    } catch (error) {
        console.error('Portfolio API error:', error)
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to fetch portfolio'
        }, { status: 500 })
    }
}
