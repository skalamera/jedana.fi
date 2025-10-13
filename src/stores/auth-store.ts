import { create } from 'zustand'
import type { User, AuthState } from '@/types'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthStore extends AuthState {
    signIn: (email: string, password: string) => Promise<{ error: string | null }>
    signUp: (email: string, password: string) => Promise<{ error: string | null }>
    signOut: () => Promise<void>
    resetPassword: (email: string) => Promise<{ error: string | null }>
    clearSession: () => Promise<void>
}

// Helper function to check if supabase is properly configured
const isSupabaseConfigured = () => {
    return supabase &&
        typeof supabase.auth !== 'undefined' &&
        typeof supabase.from === 'function'
}

export const useAuthStore = create<AuthStore>((set) => ({
    user: null,
    isLoading: true, // Start with true to prevent premature redirects

    signIn: async (email: string, password: string) => {
        console.log('🔑 signIn called with:', { email, password: '***' })

        if (!isSupabaseConfigured()) {
            console.error('❌ Supabase not configured')
            return { error: 'Authentication service not configured. Please check your Supabase setup.' }
        }

        console.log('🔗 Supabase configured, attempting sign in...')
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            console.error('❌ Sign in error:', error.message)
            return { error: error.message }
        }

        console.log('✅ Sign in successful, user data:', {
            id: data.user?.id,
            email: data.user?.email,
            email_confirmed: data.user?.email_confirmed_at
        })

        if (data.user) {
            // Create a basic user object immediately - the auth state listener will handle profile lookup
            const userData: User = {
                id: data.user.id,
                email: data.user.email || '',
                created_at: data.user.created_at || new Date().toISOString(),
                updated_at: data.user.updated_at || new Date().toISOString()
            }

            console.log('👤 Setting initial user state:', userData)
            set({ user: userData })
        }

        console.log('🎉 Sign in process completed')
        return { error: null }
    },

    signUp: async (email: string, password: string) => {
        console.log('🔑 signUp called with:', { email, password: '***' })

        if (!isSupabaseConfigured()) {
            console.error('❌ Supabase not configured for signUp')
            return { error: 'Authentication service not configured. Please check your Supabase setup.' }
        }

        console.log('🔗 Supabase configured, attempting sign up...')
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        })

        if (error) {
            console.error('❌ Sign up error:', error.message)
            return { error: error.message }
        }

        console.log('✅ Sign up successful, user data:', {
            id: data.user?.id,
            email: data.user?.email,
            email_confirmed: data.user?.email_confirmed_at
        })

        if (data.user) {
            // Profile will be created by the auth state listener
            console.log('👤 User signed up, profile will be created by auth state listener')
        }

        console.log('🎉 Sign up process completed')
        return { error: null }
    },

    signOut: async () => {
        if (isSupabaseConfigured()) {
            await supabase.auth.signOut()
        }
        set({ user: null })
    },

    resetPassword: async (email: string) => {
        if (!isSupabaseConfigured()) {
            return { error: 'Authentication service not configured. Please check your Supabase setup.' }
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email)

        if (error) {
            return { error: error.message }
        }

        return { error: null }
    },

    clearSession: async () => {
        console.log('🧹 Clearing session and local storage...')
        try {
            // Clear Supabase session
            if (isSupabaseConfigured()) {
                await supabase.auth.signOut()
            }

            // Clear all auth-related local storage
            if (typeof window !== 'undefined') {
                const keysToRemove = Object.keys(localStorage).filter(key =>
                    key.includes('supabase') || key.includes('auth')
                )
                keysToRemove.forEach(key => localStorage.removeItem(key))
            }

            set({ user: null, isLoading: false })
            console.log('✅ Session cleared successfully')
        } catch (error) {
            console.error('❌ Error clearing session:', error)
            set({ user: null, isLoading: false })
        }
    },
}))

// Initialize auth state - run this after the store is created
console.log('🔧 Setting up auth state listener...')

// Check for existing session immediately
supabase.auth.getSession().then(({ data: { session }, error }) => {
    console.log('🔍 Initial session check:', { hasSession: !!session, error })

    // Handle refresh token errors specifically
    if (error && error.message.includes('Refresh Token')) {
        console.warn('🔄 Refresh token invalid, clearing session...')
        // Clear the session to force re-authentication
        supabase.auth.signOut().then(() => {
            console.log('✅ Session cleared due to invalid refresh token')
            useAuthStore.setState({ user: null, isLoading: false })
        })
        return
    }

    if (session?.user) {
        const userData: User = {
            id: session.user.id,
            email: session.user.email || '',
            created_at: session.user.created_at || new Date().toISOString(),
            updated_at: session.user.updated_at || new Date().toISOString()
        }
        console.log('👤 Found existing session, setting user:', userData)
        useAuthStore.setState({ user: userData, isLoading: false })
    } else {
        console.log('🚪 No existing session found')
        useAuthStore.setState({ user: null, isLoading: false })
    }
}).catch((error) => {
    console.error('❌ Error checking initial session:', error)

    // If it's a refresh token error, clear the session
    if (error?.message?.includes('Refresh Token')) {
        console.warn('🔄 Clearing session due to refresh token error')
        supabase.auth.signOut()
    }

    useAuthStore.setState({ user: null, isLoading: false })
})

supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
    console.log('🔄 Auth state changed:', event, {
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email
    })

    // Handle token refresh errors
    if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('🔄 Token refresh failed, clearing session...')
        useAuthStore.getState().clearSession()
        return
    }

    if (session?.user) {
        // Create user object immediately with session data
        const userData: User = {
            id: session.user.id,
            email: session.user.email || '',
            created_at: session.user.created_at || new Date().toISOString(),
            updated_at: session.user.updated_at || new Date().toISOString()
        }

        console.log('👤 Setting user state from session:', userData)
        useAuthStore.setState({ user: userData, isLoading: false })

        // Try to look up and update profile in background (with timeout)
        setTimeout(async () => {
            try {
                console.log('🔍 Looking up user profile (background)...')
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single()

                if (profileError && profileError.code === 'PGRST116') {
                    // Profile doesn't exist, try to create it
                    console.log('🔨 Profile not found, creating it...')
                    const { error: createError } = await supabase
                        .from('profiles')
                        .insert({
                            id: session.user.id,
                            email: session.user.email!,
                        })

                    if (createError) {
                        console.error('❌ Failed to create profile:', createError)
                    } else {
                        console.log('✅ Profile created successfully')
                    }
                } else if (profile) {
                    console.log('✅ Profile found, updating user state:', profile)
                    useAuthStore.setState({ user: profile as User })
                }
            } catch (error) {
                console.error('💥 Error during background profile operations:', error)
            }
        }, 100) // Small delay to ensure UI updates first
    } else {
        console.log('🚪 User signed out or session ended')
        useAuthStore.setState({ user: null, isLoading: false })
    }
})
console.log('✅ Auth state listener initialized')
