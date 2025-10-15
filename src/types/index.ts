// User and Authentication Types
export interface User {
    id: string
    email: string
    created_at: string
    updated_at: string
}

// API Keys Types
export interface ApiKeys {
    id: string
    user_id: string
    kraken_api_key: string
    kraken_api_secret: string
    created_at: string
    updated_at: string
}

// Manual Assets Types
export interface ManualAsset {
    id: string
    user_id: string
    symbol: string
    name: string
    asset_type: 'crypto' | 'equity' | 'manual'
    quantity: number
    cost_basis: number
    created_at: string
    updated_at: string
}

// Asset Cost Basis Types (for any asset type)
export interface AssetCostBasis {
    id: string
    user_id: string
    symbol: string
    asset_type: 'crypto' | 'equity' | 'manual'
    cost_basis: number
    notes?: string
    created_at: string
    updated_at: string
}

// Kraken API Response Types
export interface KrakenBalance {
    [key: string]: string // Symbol to balance mapping
}

export interface KrakenTicker {
    [pair: string]: {
        a: [string, string, string] // Ask: price, whole lot volume, lot volume
        b: [string, string, string] // Bid: price, whole lot volume, lot volume
        c: [string, string] // Last trade closed: price, lot volume
        v: [string, string] // Volume: today, last 24 hours
        p: [string, string] // Volume weighted average price: today, last 24 hours
        t: [number, number] // Number of trades: today, last 24 hours
        l: [string, string] // Low: today, last 24 hours
        h: [string, string] // High: today, last 24 hours
        o: [string, string] // Today's opening price, yesterday's closing price
    }
}

export interface KrakenTrade {
    [tradeId: string]: {
        price: string
        volume: string
        time: number
        side: 'buy' | 'sell'
        orderType: string
        misc: string
    }
}

// Portfolio Types
export interface PortfolioAsset {
    symbol: string
    name: string
    asset_type?: 'crypto' | 'equity' | 'manual'
    balance: number
    currentPrice: number
    costBasis: number
    value: number
    dailyPnL: number
    dailyPnLPercentage: number
    unrealizedPnL: number
    unrealizedPnLPercentage: number
    source: 'kraken' | 'manual'
    manualId?: string
    note?: string
}

export interface Portfolio {
    assets: PortfolioAsset[]
    totalValue: number
    totalDailyPnL: number
    totalDailyPnLPercentage: number
    totalCostBasis?: number
    totalUnrealizedPnL?: number
    totalUnrealizedPnLPercentage?: number
    lastUpdated: string
}

// UI State Types
export interface LoadingState {
    isLoading: boolean
    error: string | null
}

export interface AuthState {
    user: User | null
    isLoading: boolean
}

// Form Types
export interface ApiKeyForm {
    kraken_api_key: string
    kraken_api_secret: string
}

export interface ManualAssetForm {
    symbol: string
    name: string
    quantity: number
    cost_basis: number
}

// AI Screener Types
export type PortfolioType = 'stocks' | 'crypto' | 'both'

export type AssetType = 'stock' | 'etf' | 'crypto' | 'index'

export interface AIScreenerRequest {
    portfolioType: PortfolioType
    userQuery: string
    riskTolerance: number // 0-100
}

export interface TechnicalAnalysis {
    indicator: string
    value: number
    signal: 'buy' | 'sell' | 'hold' | 'neutral'
    description: string
}

export interface PriceForecast {
    timeframe: '6months'
    projectedPrice: number
    confidence: number // 0-100
    reasoning: string
    riskFactors: string[]
}

export interface MarketSentiment {
    overall: 'bullish' | 'bearish' | 'neutral'
    score: number // -100 to 100
    keyFactors: string[]
    newsSummary: string
}

export interface AssetAnalysis {
    symbol: string
    name: string
    assetType: AssetType
    industry: string
    currentPrice: number
    marketCap?: number
    volume?: number
    peRatio?: number
    dividendYield?: number
    beta?: number
    recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'
    confidence: number // 0-100
    reasoning: string
    keyStrengths: string[]
    keyRisks: string[]
    technicalAnalysis: TechnicalAnalysis[]
    priceForecast: PriceForecast
    marketSentiment: MarketSentiment
    recentNews: {
        title: string
        summary: string
        publishedAt: string
        source: string
        sentiment: 'positive' | 'negative' | 'neutral'
    }[]
    analystRatings?: {
        buy: number
        hold: number
        sell: number
        total: number
    }
}

export interface PlaygroundRecommendation {
    ticker: string
    name: string
    description: string
    finance: {
        price: number
        change: number
        percent_change: number
        intraday_high: number
        intraday_low: number
        open: number
        volume: number
    }
}

export interface AIScreenerResponse {
    requestId: string
    timestamp: string
    portfolioType: PortfolioType
    userQuery: string
    assets: AssetAnalysis[]
    summary: string
    methodology: string
    disclaimer: string
    marketConditions: {
        overall: 'bullish' | 'bearish' | 'neutral'
        keyTrends: string[]
        risks: string[]
    }
}

export interface AIScreenerForm {
    portfolioType: PortfolioType
    userQuery: string
    riskTolerance: number // 0-100
}

export interface AIScreenerState {
    isLoading: boolean
    error: string | null
    result: AIScreenerResponse | null
}
