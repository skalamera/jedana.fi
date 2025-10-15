'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { usePortfolioStore } from '@/stores/portfolio-store'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Plus, ArrowLeft, Search } from 'lucide-react'

// Popular tickers with their display names and types
const POPULAR_TICKERS = [
    // Major Cryptocurrencies
    { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' },
    { symbol: 'ETH', name: 'Ethereum', type: 'crypto' },
    { symbol: 'ADA', name: 'Cardano', type: 'crypto' },
    { symbol: 'SOL', name: 'Solana', type: 'crypto' },
    { symbol: 'DOT', name: 'Polkadot', type: 'crypto' },
    { symbol: 'AVAX', name: 'Avalanche', type: 'crypto' },
    { symbol: 'MATIC', name: 'Polygon', type: 'crypto' },
    { symbol: 'LINK', name: 'Chainlink', type: 'crypto' },
    { symbol: 'UNI', name: 'Uniswap', type: 'crypto' },
    { symbol: 'AAVE', name: 'Aave', type: 'crypto' },
    { symbol: 'LTC', name: 'Litecoin', type: 'crypto' },
    { symbol: 'XRP', name: 'Ripple', type: 'crypto' },
    { symbol: 'BCH', name: 'Bitcoin Cash', type: 'crypto' },
    { symbol: 'ATOM', name: 'Cosmos', type: 'crypto' },
    { symbol: 'ALGO', name: 'Algorand', type: 'crypto' },
    { symbol: 'FTT', name: 'FTX Token', type: 'crypto' },
    { symbol: 'NEAR', name: 'NEAR Protocol', type: 'crypto' },
    { symbol: 'FLOW', name: 'Flow', type: 'crypto' },
    { symbol: 'APE', name: 'ApeCoin', type: 'crypto' },
    { symbol: 'MANA', name: 'Decentraland', type: 'crypto' },
    { symbol: 'SAND', name: 'The Sandbox', type: 'crypto' },
    { symbol: 'GALA', name: 'Gala', type: 'crypto' },
    { symbol: 'ENJ', name: 'Enjin Coin', type: 'crypto' },
    { symbol: 'CRV', name: 'Curve DAO Token', type: 'crypto' },
    { symbol: 'SUSHI', name: 'SushiSwap', type: 'crypto' },

    // Major Stocks & ETFs
    { symbol: 'AAPL', name: 'Apple Inc.', type: 'equity' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'equity' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'equity' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'equity' },
    { symbol: 'TSLA', name: 'Tesla Inc.', type: 'equity' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'equity' },
    { symbol: 'META', name: 'Meta Platforms Inc.', type: 'equity' },
    { symbol: 'NFLX', name: 'Netflix Inc.', type: 'equity' },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', type: 'equity' },
    { symbol: 'QQQ', name: 'Invesco QQQ Trust', type: 'equity' },
    { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', type: 'equity' },
    { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', type: 'equity' },
    { symbol: 'VXUS', name: 'Vanguard Total International Stock ETF', type: 'equity' },
    { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', type: 'equity' },
    { symbol: 'GLD', name: 'SPDR Gold Shares', type: 'equity' },
    { symbol: 'SLV', name: 'iShares Silver Trust', type: 'equity' },
    { symbol: 'ARKK', name: 'ARK Innovation ETF', type: 'equity' },
    { symbol: 'TQQQ', name: 'ProShares UltraPro QQQ', type: 'equity' },
    { symbol: 'SQQQ', name: 'ProShares UltraPro Short QQQ', type: 'equity' },
]

export default function AddAssetPage() {
    const router = useRouter()
    const { user, isLoading: authLoading } = useAuthStore()
    const { addManualAsset, isLoading, error } = usePortfolioStore()

    // Move all hooks to the top, before any conditional returns
    const [formData, setFormData] = useState({
        symbol: '',
        name: '',
        asset_type: 'crypto' as 'crypto' | 'equity' | 'manual',
        quantity: '',
        cost_basis: '',
    })
    const [success, setSuccess] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [showSuggestions, setShowSuggestions] = useState(false)
    const searchRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth')
        }
    }, [user, authLoading, router])

    // Handle click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSuggestions(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return null // Will redirect via useEffect
    }

    // Filter popular tickers based on search term
    const filteredTickers = POPULAR_TICKERS.filter(ticker =>
        ticker.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticker.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10) // Limit to 10 suggestions

    const handleTickerSelect = (ticker: typeof POPULAR_TICKERS[0]) => {
        setFormData(prev => ({
            ...prev,
            symbol: ticker.symbol,
            name: ticker.name
        }))
        setSearchTerm('')
        setShowSuggestions(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const quantity = parseFloat(formData.quantity)
        const costBasis = parseFloat(formData.cost_basis)

        if (isNaN(quantity) || isNaN(costBasis) || quantity <= 0 || costBasis < 0) {
            return
        }

        try {
            await addManualAsset({
                symbol: formData.symbol.toUpperCase(),
                name: formData.name,
                asset_type: formData.asset_type,
                quantity,
                cost_basis: costBasis,
            })

            setSuccess(`Successfully added ${formData.name} (${formData.symbol}) to your portfolio!`)
            setFormData({
                symbol: '',
                name: '',
                asset_type: 'crypto',
                quantity: '',
                cost_basis: '',
            })

            // Redirect back to portfolio after 2 seconds
            setTimeout(() => {
                router.push('/')
            }, 2000)
        } catch {
            // Error is handled by the store
        }
    }

    const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [field]: e.target.value
        }))
    }

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex items-center space-x-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/')}
                        className="flex items-center space-x-2 text-gray-900 dark:text-white hover:text-gray-900 dark:hover:text-white hover:bg-transparent"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Portfolio</span>
                    </Button>
                </div>

                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add Manual Asset</h2>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                        Add cryptocurrencies or assets that aren&apos;t held on Kraken
                    </p>
                </div>

                <div className="max-w-2xl">
                    <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Plus className="w-5 h-5" />
                                <span>Asset Details</span>
                            </CardTitle>
                            <CardDescription className="text-gray-700 dark:text-gray-300">
                                Enter the details of the asset you want to add to your portfolio
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Popular Tickers Search */}
                                <div ref={searchRef}>
                                    <label className="block text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
                                        Search Popular Assets
                                    </label>
                                    <div className="relative">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-300" />
                                            <Input
                                                type="text"
                                                placeholder="Search for Bitcoin, Apple, SPY, etc..."
                                                value={searchTerm}
                                                onChange={(e) => {
                                                    setSearchTerm(e.target.value)
                                                    setShowSuggestions(true)
                                                }}
                                                onFocus={() => setShowSuggestions(true)}
                                                className="pl-10 pr-4 h-12 text-base text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                                            />
                                        </div>

                                        {/* Suggestions Dropdown */}
                                        {showSuggestions && searchTerm && (
                                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                {filteredTickers.length > 0 ? (
                                                    filteredTickers.map((ticker) => (
                                                        <button
                                                            key={ticker.symbol}
                                                            type="button"
                                                            onClick={() => handleTickerSelect(ticker)}
                                                            className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3"
                                                        >
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ticker.type === 'crypto'
                                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                                                }`}>
                                                                {ticker.type === 'crypto' ? 'Crypto' : 'Stock'}
                                                            </span>
                                                            <div>
                                                                <div className="font-medium text-gray-900 dark:text-white">{ticker.name}</div>
                                                                <div className="text-sm text-gray-500 dark:text-gray-400">{ticker.symbol}</div>
                                                            </div>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                        No assets found matching &quot;{searchTerm}&quot;
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <p className="mt-2 text-xs text-gray-700 dark:text-gray-300">
                                        Search for popular cryptocurrencies and stocks/ETFs, or enter custom symbols below
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="symbol" className="block text-sm font-medium text-gray-800 dark:text-gray-100">
                                            Symbol *
                                        </label>
                                        <Input
                                            id="symbol"
                                            type="text"
                                            placeholder="e.g., BTC, ETH, AAPL"
                                            value={formData.symbol}
                                            onChange={handleInputChange('symbol')}
                                            required
                                            className="uppercase"
                                        />
                                        <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">
                                            Trading symbol (e.g., BTC for Bitcoin)
                                        </p>
                                    </div>

                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-800 dark:text-gray-100">
                                            Name *
                                        </label>
                                        <Input
                                            id="name"
                                            type="text"
                                            placeholder="e.g., Bitcoin, Ethereum, Apple Inc."
                                            value={formData.name}
                                            onChange={handleInputChange('name')}
                                            required
                                        />
                                        <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">
                                            Full name of the asset
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="asset_type" className="block text-sm font-medium text-gray-800 dark:text-gray-100">
                                        Asset Type *
                                    </label>
                                    <select
                                        id="asset_type"
                                        value={formData.asset_type}
                                        onChange={(e) => setFormData(prev => ({ ...prev, asset_type: e.target.value as 'crypto' | 'equity' | 'manual' }))}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    >
                                        <option value="crypto">Cryptocurrency</option>
                                        <option value="equity">Stock/ETF</option>
                                        <option value="manual">Other</option>
                                    </select>
                                    <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">
                                        Select the type of asset you're adding
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-800 dark:text-gray-100">
                                            Quantity *
                                        </label>
                                        <Input
                                            id="quantity"
                                            type="number"
                                            step="any"
                                            min="0"
                                            placeholder="0.00"
                                            value={formData.quantity}
                                            onChange={handleInputChange('quantity')}
                                            required
                                        />
                                        <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">
                                            Amount of this asset you hold
                                        </p>
                                    </div>

                                    <div>
                                        <label htmlFor="cost_basis" className="block text-sm font-medium text-gray-800 dark:text-gray-100">
                                            Cost Basis (USD) *
                                        </label>
                                        <Input
                                            id="cost_basis"
                                            type="number"
                                            step="any"
                                            min="0"
                                            placeholder="0.00"
                                            value={formData.cost_basis}
                                            onChange={handleInputChange('cost_basis')}
                                            required
                                        />
                                        <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">
                                            Total amount you paid for this quantity of the asset
                                        </p>
                                    </div>
                                </div>

                                <div className="flex space-x-2 pt-4">
                                    <Button type="submit" disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Add Asset
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => router.push('/')}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Success Alert */}
                {success && (
                    <Alert>
                        <AlertDescription>{success}</AlertDescription>
                    </Alert>
                )}

                {/* Error Alert */}
                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Manual Assets Info */}
                <Card className="border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">About Manual Assets</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
                        <p>
                            Manual assets allow you to track cryptocurrencies and other investments that aren&apos;t held on your Kraken account. This is useful for:
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Assets held on other exchanges</li>
                            <li>Cold storage or hardware wallets</li>
                            <li>Assets purchased outside of Kraken</li>
                            <li>Any other investments you want to track</li>
                        </ul>
                        <p>
                            Manual assets will be included in your total portfolio value and performance calculations, but won&apos;t receive real-time price updates unless they&apos;re also available on Kraken.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    )
}
