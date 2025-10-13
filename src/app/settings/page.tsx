'use client'

import { useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { MainLayout } from '@/components/layout/main-layout'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, AlertCircle, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { validateKrakenCredentials } from '@/lib/kraken-api'

export default function SettingsPage() {
    const { user, isLoading: authLoading } = useAuthStore()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [apiKey, setApiKey] = useState('')
    const [apiSecret, setApiSecret] = useState('')
    const [isConnected, setIsConnected] = useState(false)
    const [portfolioValue, setPortfolioValue] = useState<string | null>(null)

    // Check for existing API keys on mount
    useEffect(() => {
        const checkKeys = async () => {
            if (user) {
                try {
                    console.log('Checking for existing API keys for user:', user.id)
                    const { data, error } = await supabase
                        .from('api_keys')
                        .select('*')
                        .eq('user_id', user.id)
                        .single()

                    if (error) {
                        console.log('API keys query error:', error.message)
                        if (error.code === 'PGRST116') { // No rows found
                            console.log('No existing API keys found in database')
                        }
                        setIsConnected(false)
                    } else if (data) {
                        console.log('Found existing API keys in database')
                        setIsConnected(true)
                        // Don't show the actual keys for security
                    }
                } catch (error) {
                    console.error('Error checking API keys:', error)
                    setIsConnected(false)
                }
            }
        }

        checkKeys()
    }, [user])

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth')
        }
    }, [user, authLoading, router])

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

    const handleSaveApiKeys = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)
        setSuccess(null)

        try {
            // Trim whitespace from API credentials
            const trimmedApiKey = apiKey.trim()
            const trimmedApiSecret = apiSecret.trim()

            // Basic validation
            if (!trimmedApiKey || !trimmedApiSecret) {
                throw new Error('Both API key and secret are required')
            }

            if (trimmedApiKey.length < 10) {
                throw new Error('API key appears to be too short. Please check your API key.')
            }

            if (trimmedApiSecret.length < 50) {
                throw new Error('API secret appears to be too short. Please check your API secret.')
            }

            // Validate API keys with Kraken
            console.log('Validating Kraken credentials...')
            console.log('API Key length:', trimmedApiKey.length, 'Secret length:', trimmedApiSecret.length)
            const validation = await validateKrakenCredentials(trimmedApiKey, trimmedApiSecret)

            if (!validation.isValid) {
                throw new Error(validation.error || 'Invalid API credentials')
            }

            // Update portfolio value if available
            if (validation.balance !== undefined) {
                setPortfolioValue(validation.balance.toFixed(2))
            }

            // Check if API keys already exist
            const { data: existingKeys } = await supabase
                .from('api_keys')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (existingKeys) {
                // Update existing keys
                const { error: updateError } = await supabase
                    .from('api_keys')
                    .update({
                        kraken_api_key: trimmedApiKey,
                        kraken_api_secret: trimmedApiSecret,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', user.id)

                if (updateError) throw updateError
            } else {
                // Insert new keys
                const { error: insertError } = await supabase
                    .from('api_keys')
                    .insert({
                        user_id: user.id,
                        kraken_api_key: trimmedApiKey,
                        kraken_api_secret: trimmedApiSecret
                    })

                if (insertError) throw insertError
            }

            setIsConnected(true)
            setSuccess('API keys saved and validated successfully!')
            setApiKey('')
            setApiSecret('')
        } catch (error) {
            console.error('Error saving API keys:', error)
            setError(error instanceof Error ? error.message : 'Failed to save API keys')
        } finally {
            setIsLoading(false)
        }
    }

    const handleTestConnection = async () => {
        setIsLoading(true)
        setError(null)

        try {
            console.log('Testing connection for user:', user.id)
            // Get API keys from database
            const { data: apiKeysData, error: fetchError } = await supabase
                .from('api_keys')
                .select('kraken_api_key, kraken_api_secret')
                .eq('user_id', user.id)
                .single()

            if (fetchError) {
                console.error('Error fetching API keys:', fetchError)
                if (fetchError.code === 'PGRST116') {
                    throw new Error('No API keys found. Please save your API keys first.')
                }
                throw new Error(`Database error: ${fetchError.message}`)
            }

            if (!apiKeysData) {
                throw new Error('No API keys found. Please save your API keys first.')
            }

            console.log('API keys retrieved from database:', {
                hasKey: !!apiKeysData.kraken_api_key,
                hasSecret: !!apiKeysData.kraken_api_secret,
                keyLength: apiKeysData.kraken_api_key?.length,
                secretLength: apiKeysData.kraken_api_secret?.length
            })

            // Test connection with stored keys
            const validation = await validateKrakenCredentials(
                apiKeysData.kraken_api_key,
                apiKeysData.kraken_api_secret
            )

            if (!validation.isValid) {
                console.error('API validation failed:', validation.error)
                throw new Error(validation.error || 'Failed to connect to Kraken API')
            }

            // Update portfolio value if available
            if (validation.balance !== undefined) {
                setPortfolioValue(validation.balance.toFixed(2))
            }

            setIsConnected(true)
            setSuccess('Connection to Kraken API successful!')
        } catch (error) {
            console.error('Test connection error:', error)
            setError(error instanceof Error ? error.message : 'Failed to connect to Kraken API')
            setIsConnected(false)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDeleteApiKeys = async () => {
        setIsLoading(true)
        setError(null)

        try {
            const { error: deleteError } = await supabase
                .from('api_keys')
                .delete()
                .eq('user_id', user.id)

            if (deleteError) throw deleteError

            setIsConnected(false)
            setPortfolioValue(null)
            setSuccess('API keys deleted successfully!')
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to delete API keys')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <MainLayout>
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                        Settings
                    </h2>
                    <p className="mt-2 text-base md:text-lg text-gray-700 dark:text-gray-300 max-w-2xl">
                        Manage your Kraken API credentials and account settings
                    </p>
                </div>

                <div className="space-y-6">
                    {/* API Key Management */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <span className="text-xl font-bold">Kraken API Keys</span>
                                {isConnected && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 w-fit">
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Connected
                                    </span>
                                )}
                            </CardTitle>
                            <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                                Enter your Kraken API credentials to connect your account
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <form onSubmit={handleSaveApiKeys} className="space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="apiKey" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            API Key
                                        </label>
                                        <Input
                                            id="apiKey"
                                            type="password"
                                            placeholder="HHbafVgQgIIeKwcM93GHVWDIwk7ulO6Z7JWEbNjbbp0hmcfGOXVN17x7"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            className="h-12 text-base"
                                            required
                                        />
                                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                            Usually starts with &apos;HH&apos; and is 56 characters long
                                        </p>
                                    </div>
                                    <div>
                                        <label htmlFor="apiSecret" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            API Secret
                                        </label>
                                        <Input
                                            id="apiSecret"
                                            type="password"
                                            placeholder="prSDxIM+fhlcXOlhD5ok5gjDTe4zUWvXL5xa4HXpoA/jnHh3zzRF1Z5W465dVpl9JYgTw8Ml+qrKfqDGOVxPPA=="
                                            value={apiSecret}
                                            onChange={(e) => setApiSecret(e.target.value)}
                                            className="h-12 text-base"
                                            required
                                        />
                                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                            Usually 88+ characters long
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Button
                                        type="submit"
                                        disabled={isLoading || !apiKey || !apiSecret}
                                        className="flex-1 h-12 text-base font-semibold"
                                    >
                                        {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                        Save Keys
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleTestConnection}
                                        disabled={isLoading}
                                        className="flex-1 h-12 text-base"
                                    >
                                        {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                        Test Connection
                                    </Button>
                                </div>
                            </form>

                            {isConnected && (
                                <div className="pt-4 border-t">
                                    <Button
                                        variant="destructive"
                                        onClick={handleDeleteApiKeys}
                                        disabled={isLoading}
                                        className="w-full"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete API Keys
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Connection Status */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center justify-between text-xl font-bold">
                                <span>Connection Status</span>
                                {isConnected ? (
                                    <CheckCircle className="w-6 h-6 text-green-500" />
                                ) : (
                                    <AlertCircle className="w-6 h-6 text-red-500" />
                                )}
                            </CardTitle>
                            <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                                Current status of your Kraken API connection
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">API Connection</div>
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${isConnected
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                        {isConnected ? 'Connected' : 'Not Connected'}
                                    </span>
                                </div>
                                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Last Sync</div>
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {isConnected ? 'Just now' : 'Never'}
                                    </div>
                                </div>
                                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg sm:col-span-2 lg:col-span-1">
                                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Portfolio Value</div>
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {portfolioValue ? `$${portfolioValue}` : (isConnected ? 'Click "Test" to update' : 'N/A')}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Alerts */}
                {error && (
                    <Alert variant="destructive" className="border-red-200 dark:border-red-800">
                        <AlertCircle className="h-5 w-5" />
                        <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
                    </Alert>
                )}

                {success && (
                    <Alert className="border-green-200 dark:border-green-800">
                        <CheckCircle className="h-5 w-5" />
                        <AlertDescription className="text-sm font-medium">{success}</AlertDescription>
                    </Alert>
                )}
            </div>
        </MainLayout>
    )
}
