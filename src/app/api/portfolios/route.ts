import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
    try {
        // Get authorization header
        const authHeader = request.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const token = authHeader.replace('Bearer ', '')

        // Initialize Supabase client with user token
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            }
        )

        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get all portfolios for the user
        const { data: portfolios, error: portfoliosError } = await supabase
            .from('portfolios')
            .select('*')
            .eq('user_id', user.id)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false })

        if (portfoliosError) {
            console.error('Error fetching portfolios:', portfoliosError)
            return NextResponse.json({ error: 'Failed to fetch portfolios' }, { status: 500 })
        }

        return NextResponse.json({ portfolios })
    } catch (error) {
        console.error('Portfolios GET error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        // Get authorization header
        const authHeader = request.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const token = authHeader.replace('Bearer ', '')

        // Initialize Supabase client with user token
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            }
        )

        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { name, description } = await request.json()

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ error: 'Portfolio name is required' }, { status: 400 })
        }

        // Check if portfolio name already exists for this user
        const { data: existingPortfolio } = await supabase
            .from('portfolios')
            .select('id')
            .eq('user_id', user.id)
            .eq('name', name.trim())
            .single()

        if (existingPortfolio) {
            return NextResponse.json({ error: 'Portfolio name already exists' }, { status: 400 })
        }

        // Create new portfolio
        const { data: portfolio, error: createError } = await supabase
            .from('portfolios')
            .insert({
                user_id: user.id,
                name: name.trim(),
                description: description?.trim() || null,
                is_default: false // New portfolios are not default by default
            })
            .select()
            .single()

        if (createError) {
            console.error('Error creating portfolio:', createError)
            return NextResponse.json({ error: 'Failed to create portfolio' }, { status: 500 })
        }

        return NextResponse.json({ portfolio })
    } catch (error) {
        console.error('Portfolios POST error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
