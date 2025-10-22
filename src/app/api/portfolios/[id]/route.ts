import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

        const portfolioId = params.id
        const { name, description, is_default } = await request.json()

        // Verify portfolio belongs to user
        const { data: existingPortfolio, error: fetchError } = await supabase
            .from('portfolios')
            .select('*')
            .eq('id', portfolioId)
            .eq('user_id', user.id)
            .single()

        if (fetchError || !existingPortfolio) {
            return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })
        }

        // Update portfolio
        const updateData: any = {}
        if (name !== undefined) updateData.name = name.trim()
        if (description !== undefined) updateData.description = description?.trim() || null
        if (is_default !== undefined) updateData.is_default = is_default

        const { data: portfolio, error: updateError } = await supabase
            .from('portfolios')
            .update(updateData)
            .eq('id', portfolioId)
            .eq('user_id', user.id)
            .select()
            .single()

        if (updateError) {
            console.error('Error updating portfolio:', updateError)
            return NextResponse.json({ error: 'Failed to update portfolio' }, { status: 500 })
        }

        return NextResponse.json({ portfolio })
    } catch (error) {
        console.error('Portfolio PUT error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

        const portfolioId = params.id

        // Verify portfolio belongs to user and is not the default
        const { data: portfolio, error: fetchError } = await supabase
            .from('portfolios')
            .select('*')
            .eq('id', portfolioId)
            .eq('user_id', user.id)
            .single()

        if (fetchError || !portfolio) {
            return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })
        }

        if (portfolio.is_default) {
            return NextResponse.json({ error: 'Cannot delete default portfolio' }, { status: 400 })
        }

        // Delete portfolio (cascade will handle portfolio_assets)
        const { error: deleteError } = await supabase
            .from('portfolios')
            .delete()
            .eq('id', portfolioId)
            .eq('user_id', user.id)

        if (deleteError) {
            console.error('Error deleting portfolio:', deleteError)
            return NextResponse.json({ error: 'Failed to delete portfolio' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Portfolio DELETE error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
