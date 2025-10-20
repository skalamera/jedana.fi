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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Plus, ArrowLeft, Search, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import Papa from 'papaparse'

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

    // CSV Upload State
    const [csvFile, setCsvFile] = useState<File | null>(null)
    const [csvData, setCsvData] = useState<any[]>([])
    const [csvHeaders, setCsvHeaders] = useState<string[]>([])
    const [csvErrors, setCsvErrors] = useState<string[]>([])
    const [isParsingCsv, setIsParsingCsv] = useState(false)
    const [showCsvPreview, setShowCsvPreview] = useState(false)
    const [isAddingCsvAssets, setIsAddingCsvAssets] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

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

    // CSV Upload Functions
    const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!file.name.endsWith('.csv')) {
            setCsvErrors(['Please select a CSV file'])
            return
        }

        setCsvFile(file)
        setCsvErrors([])
        setCsvData([])
        setCsvHeaders([])
        setShowCsvPreview(false)
        parseCsvFile(file)
    }

    const parseCsvFile = (file: File) => {
        setIsParsingCsv(true)
        setCsvErrors([])

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header: string) => header.trim().toLowerCase(),
            complete: (results) => {
                setIsParsingCsv(false)

                if (results.errors.length > 0) {
                    setCsvErrors(results.errors.map(err => err.message))
                    return
                }

                if (!results.data || results.data.length === 0) {
                    setCsvErrors(['No data found in CSV file'])
                    return
                }

                // Validate required columns
                const data = results.data as any[]
                const headers = results.meta.fields || []

                const requiredColumns = ['symbol', 'name', 'asset_type', 'quantity', 'cost_basis']
                const missingColumns = requiredColumns.filter(col => !headers.includes(col))

                if (missingColumns.length > 0) {
                    setCsvErrors([`Missing required columns: ${missingColumns.join(', ')}`])
                    return
                }

                // Validate and clean data
                const validData: any[] = []
                const validationErrors: string[] = []

                data.forEach((row, index) => {
                    const errors: string[] = []

                    // Validate symbol
                    if (!row.symbol || typeof row.symbol !== 'string' || row.symbol.trim() === '') {
                        errors.push(`Row ${index + 1}: Missing or invalid symbol`)
                    }

                    // Validate name
                    if (!row.name || typeof row.name !== 'string' || row.name.trim() === '') {
                        errors.push(`Row ${index + 1}: Missing or invalid name`)
                    }

                    // Validate asset_type
                    const validTypes = ['crypto', 'equity', 'manual']
                    if (!row.asset_type || !validTypes.includes(row.asset_type.toLowerCase())) {
                        errors.push(`Row ${index + 1}: Invalid asset_type. Must be: ${validTypes.join(', ')}`)
                    }

                    // Validate quantity
                    const quantity = parseFloat(row.quantity)
                    if (isNaN(quantity) || quantity <= 0) {
                        errors.push(`Row ${index + 1}: Invalid quantity. Must be a positive number`)
                    }

                    // Validate cost_basis
                    const costBasis = parseFloat(row.cost_basis)
                    if (isNaN(costBasis) || costBasis < 0) {
                        errors.push(`Row ${index + 1}: Invalid cost_basis. Must be a non-negative number`)
                    }

                    if (errors.length === 0) {
                        validData.push({
                            symbol: row.symbol.trim().toUpperCase(),
                            name: row.name.trim(),
                            asset_type: row.asset_type.toLowerCase(),
                            quantity: quantity,
                            cost_basis: costBasis,
                            rowNumber: index + 1
                        })
                    } else {
                        validationErrors.push(...errors)
                    }
                })

                if (validationErrors.length > 0) {
                    setCsvErrors(validationErrors.slice(0, 10)) // Show first 10 errors
                    if (validationErrors.length > 10) {
                        setCsvErrors(prev => [...prev, `... and ${validationErrors.length - 10} more errors`])
                    }
                } else if (validData.length === 0) {
                    setCsvErrors(['No valid data rows found after validation'])
                } else {
                    setCsvData(validData)
                    setCsvHeaders(headers)
                    setShowCsvPreview(true)
                }
            },
            error: (error) => {
                setIsParsingCsv(false)
                setCsvErrors([`Failed to parse CSV: ${error.message}`])
            }
        })
    }

    const handleAddCsvAssets = async () => {
        if (csvData.length === 0) return

        setIsAddingCsvAssets(true)
        setCsvErrors([])

        try {
            let successCount = 0
            let errorCount = 0
            const errors: string[] = []

            for (const asset of csvData) {
                try {
                    await addManualAsset({
                        symbol: asset.symbol,
                        name: asset.name,
                        asset_type: asset.asset_type as 'crypto' | 'equity' | 'manual',
                        quantity: asset.quantity,
                        cost_basis: asset.cost_basis,
                    })
                    successCount++
                } catch (error) {
                    errorCount++
                    errors.push(`Failed to add ${asset.name} (${asset.symbol}): ${error instanceof Error ? error.message : 'Unknown error'}`)
                }
            }

            if (errorCount === 0) {
                setSuccess(`Successfully added ${successCount} assets from CSV!`)
                setCsvFile(null)
                setCsvData([])
                setCsvHeaders([])
                setShowCsvPreview(false)
                setTimeout(() => {
                    router.push('/')
                }, 2000)
            } else {
                setCsvErrors(errors.slice(0, 5)) // Show first 5 errors
                if (errors.length > 5) {
                    setCsvErrors(prev => [...prev, `... and ${errors.length - 5} more errors`])
                }
                setSuccess(`${successCount} assets added successfully, ${errorCount} failed`)
            }
        } catch (error) {
            setCsvErrors([`Bulk operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`])
        } finally {
            setIsAddingCsvAssets(false)
        }
    }

    const resetCsvUpload = () => {
        setCsvFile(null)
        setCsvData([])
        setCsvHeaders([])
        setCsvErrors([])
        setShowCsvPreview(false)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
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
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add Manual Assets</h2>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                        Add cryptocurrencies or assets that aren&apos;t held on Kraken - individually or via CSV upload
                    </p>
                </div>

                {/* CSV Upload Section */}
                <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Upload className="w-5 h-5" />
                            <span>Bulk Upload via CSV</span>
                        </CardTitle>
                        <CardDescription className="text-gray-700 dark:text-gray-300">
                            Upload a CSV file to add multiple assets at once. The CSV must include columns: symbol, name, asset_type, quantity, cost_basis
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* File Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-2">
                                CSV File
                            </label>
                            <div className="flex items-center space-x-4">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    onChange={handleCsvUpload}
                                    className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                                />
                                {csvFile && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={resetCsvUpload}
                                    >
                                        Clear
                                    </Button>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">
                                Select a CSV file with columns: symbol, name, asset_type, quantity, cost_basis
                            </p>
                        </div>

                        {/* CSV Processing Status */}
                        {isParsingCsv && (
                            <div className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Parsing CSV file...</span>
                            </div>
                        )}

                        {/* CSV Errors */}
                        {csvErrors.length > 0 && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                <div className="flex items-center space-x-2 text-red-800 dark:text-red-200 mb-2">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="font-medium">CSV Validation Errors</span>
                                </div>
                                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                                    {csvErrors.map((error, index) => (
                                        <li key={index}>• {error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* CSV Preview */}
                        {showCsvPreview && csvData.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                                        <CheckCircle className="w-4 h-4" />
                                        <span className="font-medium">Ready to Add {csvData.length} Assets</span>
                                    </div>
                                    <Button
                                        onClick={handleAddCsvAssets}
                                        disabled={isAddingCsvAssets}
                                        className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                                    >
                                        {isAddingCsvAssets && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Add All Assets
                                    </Button>
                                </div>

                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                    <div className="max-h-96 overflow-y-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-gray-50 dark:bg-gray-800">
                                                    <TableHead className="text-xs font-medium">Symbol</TableHead>
                                                    <TableHead className="text-xs font-medium">Name</TableHead>
                                                    <TableHead className="text-xs font-medium">Type</TableHead>
                                                    <TableHead className="text-xs font-medium">Quantity</TableHead>
                                                    <TableHead className="text-xs font-medium">Cost Basis</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {csvData.slice(0, 10).map((asset, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell className="font-mono text-sm">{asset.symbol}</TableCell>
                                                        <TableCell className="text-sm">{asset.name}</TableCell>
                                                        <TableCell>
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${asset.asset_type === 'crypto'
                                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                                : asset.asset_type === 'equity'
                                                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                                                                }`}>
                                                                {asset.asset_type}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-sm">{asset.quantity.toLocaleString()}</TableCell>
                                                        <TableCell className="text-sm">${asset.cost_basis.toLocaleString()}</TableCell>
                                                    </TableRow>
                                                ))}
                                                {csvData.length > 10 && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center text-sm text-gray-500 dark:text-gray-400 py-2">
                                                            ... and {csvData.length - 10} more assets
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* CSV Template Download */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                            <div className="flex items-start space-x-2">
                                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                                <div className="flex-1">
                                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">CSV Format Requirements</h4>
                                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                        Download a template or ensure your CSV has these exact column headers (case-insensitive):
                                    </p>
                                    <div className="mt-2 text-xs font-mono text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/30 p-2 rounded">
                                        symbol, name, asset_type, quantity, cost_basis
                                    </div>
                                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                                        • <strong>asset_type</strong>: crypto, equity, or manual<br />
                                        • <strong>quantity</strong>: positive number<br />
                                        • <strong>cost_basis</strong>: non-negative number
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

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
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                                            <Input
                                                type="text"
                                                placeholder="Search for Bitcoin, Apple, SPY, etc..."
                                                value={searchTerm}
                                                onChange={(e) => {
                                                    setSearchTerm(e.target.value)
                                                    setShowSuggestions(true)
                                                }}
                                                onFocus={() => setShowSuggestions(true)}
                                                className="pl-10 pr-4 h-12 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 border-gray-300 dark:border-gray-600"
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
