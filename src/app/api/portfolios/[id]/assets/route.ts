import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const portfolioId = params.id

        // Get the authorization token from the request
        const authHeader = request.headers.get('authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Create Supabase client with the user's token
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        })

        // Verify the user owns this portfolio
        const { data: portfolio, error: portfolioError } = await supabase
            .from('portfolios')
            .select('*')
            .eq('id', portfolioId)
            .single()

        if (portfolioError || !portfolio) {
            return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })
        }

        // Get the asset data from the request body
        const assetData = await request.json()

        // Validate required fields
        if (!assetData.symbol || !assetData.name || !assetData.asset_type ||
            assetData.quantity === undefined || assetData.cost_basis === undefined) {
            return NextResponse.json({
                error: 'Missing required fields: symbol, name, asset_type, quantity, cost_basis'
            }, { status: 400 })
        }

        // Insert the asset into portfolio_assets
        const { data: asset, error: insertError } = await supabase
            .from('portfolio_assets')
            .insert({
                portfolio_id: portfolioId,
                symbol: assetData.symbol,
                name: assetData.name,
                asset_type: assetData.asset_type,
                quantity: assetData.quantity,
                cost_basis: assetData.cost_basis,
                notes: assetData.notes || null
            })
            .select()
            .single()

        if (insertError) {
            console.error('Error inserting asset:', insertError)
            return NextResponse.json({
                error: insertError.message
            }, { status: 500 })
        }

        return NextResponse.json({ asset }, { status: 201 })
    } catch (error) {
        console.error('Error adding asset to portfolio:', error)
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 })
    }
}

