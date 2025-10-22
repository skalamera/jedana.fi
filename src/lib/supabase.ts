import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = (() => {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase environment variables are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
    }

    if (supabaseUrl === 'https://your-project-id.supabase.co' || supabaseAnonKey === 'your-anon-key-here') {
        throw new Error('Supabase environment variables are using placeholder values. Please update NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
    }

    return createClient(supabaseUrl, supabaseAnonKey)
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
