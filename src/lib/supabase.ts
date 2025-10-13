import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if we're in development and provide helpful setup instructions
const isDevelopment = process.env.NODE_ENV === 'development'

// Basic validation - just check if variables exist (less strict for development)
if (!supabaseUrl || !supabaseAnonKey) {
    if (isDevelopment) {
        console.warn(
            '⚠️  Supabase environment variables not configured.\n' +
            '📝 Please ensure .env.local contains:\n' +
            '   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co\n' +
            '   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here\n' +
            '🔧 Run the database migration after setting up Supabase.'
        )
    }
    // Don't throw error - allow the app to load and show auth page
}

export const supabase = (() => {
    // Check if we have valid credentials
    if (supabaseUrl && supabaseAnonKey &&
        supabaseUrl !== 'https://your-project-id.supabase.co' &&
        supabaseAnonKey !== 'your-anon-key-here') {
        return createClient(supabaseUrl, supabaseAnonKey)
    }

    // Return a mock client for development/testing
    console.warn('Using placeholder Supabase client - authentication may not work properly')
    return createClient('https://placeholder.supabase.co', 'placeholder-key')
})()

// Types for better TypeScript support
export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    email: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    created_at?: string
                    updated_at?: string
                }
            }
            api_keys: {
                Row: {
                    id: string
                    user_id: string
                    kraken_api_key: string
                    kraken_api_secret: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    kraken_api_key: string
                    kraken_api_secret: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    kraken_api_key?: string
                    kraken_api_secret?: string
                    created_at?: string
                    updated_at?: string
                }
            }
            manual_assets: {
                Row: {
                    id: string
                    user_id: string
                    symbol: string
                    name: string
                    quantity: number
                    cost_basis: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    symbol: string
                    name: string
                    quantity: number
                    cost_basis: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    symbol?: string
                    name?: string
                    quantity?: number
                    cost_basis?: number
                    created_at?: string
                    updated_at?: string
                }
            }
        }
    }
}
