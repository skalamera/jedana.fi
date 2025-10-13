'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import { Cairo_Play } from 'next/font/google'

const cairoPlay = Cairo_Play({ subsets: ['latin'], weight: ['700'] })

export default function AuthPage() {
    const router = useRouter()
    const { signIn, signUp, user, isLoading: isAuthLoading } = useAuthStore()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    // Redirect if already authenticated
    useEffect(() => {
        if (user && !isAuthLoading) {
            console.log('🔄 User already authenticated, redirecting to home...')
            router.push('/')
        }
    }, [user, isAuthLoading, router])

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault()
        console.log('🚀 Sign In attempt:', { email, password: '***' })
        setIsLoading(true)
        setError(null)

        try {
            const result = await signIn(email, password)
            console.log('🔐 Sign In result:', result)

            if (result.error) {
                console.error('❌ Sign In error:', result.error)
                setError(result.error)
                setIsLoading(false)
            } else {
                console.log('✅ Sign In successful, redirecting...')
                setIsLoading(false)
                // Use Next.js router for client-side navigation
                router.push('/')
            }
        } catch (error) {
            console.error('💥 Sign In exception:', error)
            setError('An unexpected error occurred')
            setIsLoading(false)
        }
    }

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        console.log('🚀 Sign Up attempt:', { email, password: '***' })
        setIsLoading(true)
        setError(null)

        try {
            const result = await signUp(email, password)
            console.log('🔐 Sign Up result:', result)

            if (result.error) {
                console.error('❌ Sign Up error:', result.error)
                setError(result.error)
                setIsLoading(false)
            } else {
                console.log('✅ Sign Up successful')
                setError('Please check your email to confirm your account.')
                setIsLoading(false)
            }
        } catch (error) {
            console.error('💥 Sign Up exception:', error)
            setError('An unexpected error occurred during sign up')
            setIsLoading(false)
        }
    }

    // Show loading while checking authentication
    if (isAuthLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className={`mt-6 text-center text-4xl font-extrabold text-gray-900 dark:text-white ${cairoPlay.className}`}>
                    jedana.fi
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                    Manage your portfolio with AI insights
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <Card className="shadow-lg">
                    <CardHeader className="text-center">
                        <CardDescription className="text-gray-600 dark:text-gray-400">
                            Sign in to your account or create a new one
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-6 py-4">
                        <Tabs defaultValue="signin" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-6 h-10">
                                <TabsTrigger value="signin" className="text-sm font-medium px-6">Sign In</TabsTrigger>
                                <TabsTrigger value="signup" className="text-sm font-medium px-6">Sign Up</TabsTrigger>
                            </TabsList>

                            <TabsContent value="signin" className="space-y-6 mt-0">
                                <form onSubmit={handleSignIn} className="space-y-4">
                                    <div className="space-y-2">
                                        <Input
                                            type="email"
                                            placeholder="Enter your email address"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            autoComplete="email"
                                            className="h-12 text-base"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Input
                                            type="password"
                                            placeholder="Enter your password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            autoComplete="current-password"
                                            className="h-12 text-base"
                                            required
                                        />
                                    </div>
                                    <Button type="submit" className="w-full h-12 text-base font-medium" disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                        Sign In
                                    </Button>
                                </form>
                            </TabsContent>

                            <TabsContent value="signup" className="space-y-6 mt-0">
                                <form onSubmit={handleSignUp} className="space-y-4">
                                    <div className="space-y-2">
                                        <Input
                                            type="email"
                                            placeholder="Enter your email address"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            autoComplete="email"
                                            className="h-12 text-base"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Input
                                            type="password"
                                            placeholder="Create a password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            autoComplete="new-password"
                                            className="h-12 text-base"
                                            required
                                        />
                                    </div>
                                    <Button type="submit" className="w-full h-12 text-base font-medium" disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                        Sign Up
                                    </Button>
                                </form>
                            </TabsContent>
                        </Tabs>

                        {error && (
                            <Alert className="mt-4">
                                <AlertDescription className="text-red-600 dark:text-red-400">{error}</AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
