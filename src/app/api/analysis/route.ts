import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
    try {
        console.log('[Analysis API][GET] headers:', {
            hasAuth: !!request.headers.get('authorization'),
            cookiePreview: (request.headers.get('cookie') || '').slice(0, 80)
        })
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: request.headers.get('authorization') || '' } } }
        )

        const { data: { user }, error } = await supabase.auth.getUser()
        console.log('[Analysis API][GET] user:', { present: !!user, error })
        if (!user) return NextResponse.json([], { status: 200 })

        const { data, error: dbError } = await supabase
            .from('saved_analyses')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
        if (dbError) console.error('[Analysis API][GET] db error:', dbError)
        return NextResponse.json(data || [])
    } catch (e) {
        console.error('[Analysis API][GET] unexpected error:', e)
        return NextResponse.json([], { status: 200 })
    }
}

export async function POST(request: NextRequest) {
    try {
        console.log('[Analysis API][POST] headers:', {
            hasAuth: !!request.headers.get('authorization'),
            cookiePreview: (request.headers.get('cookie') || '').slice(0, 80)
        })
        const body = await request.json()
        const { symbol, name, payload } = body || {}
        if (!symbol || !name || !payload) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: request.headers.get('authorization') || '' } } }
        )

        const { data: { user }, error } = await supabase.auth.getUser()
        console.log('[Analysis API][POST] user:', { present: !!user, error })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data, error: insertError } = await supabase
            .from('saved_analyses')
            .insert({ user_id: user.id, symbol, name, payload })
            .select()
            .single()
        if (insertError) {
            console.error('[Analysis API][POST] insert error:', insertError)
            return NextResponse.json({ error: insertError.message }, { status: 500 })
        }
        return NextResponse.json(data)
    } catch (e) {
        console.error('[Analysis API][POST] unexpected error:', e)
        return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const url = new URL(request.url)
        const id = url.searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: request.headers.get('authorization') || '' } } }
        )

        const { data: { user }, error } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { error: delError } = await supabase
            .from('saved_analyses')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)

        if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })

        return NextResponse.json({ ok: true })
    } catch (e) {
        console.error('[Analysis API][DELETE] unexpected error:', e)
        return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
    }
}


