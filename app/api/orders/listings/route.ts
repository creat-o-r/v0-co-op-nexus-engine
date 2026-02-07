import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') // 'needs' | 'offers'
  const supabase = await createClient()

  if (type === 'needs') {
    const { data, error } = await supabase
      .from('user_needs')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const userIds = [...new Set((data || []).map((n: { user_id: string }) => n.user_id))]
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds.length ? userIds : ['none'])
    const profileMap = Object.fromEntries((profiles || []).map((p: { id: string }) => [p.id, p]))

    return NextResponse.json((data || []).map((n: { user_id: string }) => ({
      ...n,
      profile: profileMap[n.user_id] || null,
    })))
  }

  if (type === 'offers') {
    const { data, error } = await supabase
      .from('user_surplus')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const userIds = [...new Set((data || []).map((s: { user_id: string }) => s.user_id))]
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds.length ? userIds : ['none'])
    const profileMap = Object.fromEntries((profiles || []).map((p: { id: string }) => [p.id, p]))

    return NextResponse.json((data || []).map((s: { user_id: string }) => ({
      ...s,
      profile: profileMap[s.user_id] || null,
    })))
  }

  return NextResponse.json({ error: 'type param required: needs or offers' }, { status: 400 })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const type = body.type // 'need' | 'offer'

  if (type === 'need') {
    const { data, error } = await supabase.from('user_needs').insert({
      user_id: user.id,
      product_name: body.product_name,
      quantity: body.quantity || 1,
      unit: body.unit || 'unit',
      frequency: body.frequency || 'one_time',
      max_price_per_unit: body.max_price_per_unit || null,
      priority: body.priority || 'normal',
      notes: body.notes || null,
      is_active: true,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (type === 'offer') {
    const { data, error } = await supabase.from('user_surplus').insert({
      user_id: user.id,
      product_name: body.product_name,
      quantity_available: body.quantity_available || 1,
      unit: body.unit || 'unit',
      price_per_unit: body.price_per_unit || null,
      available_from: body.available_from || new Date().toISOString().split('T')[0],
      available_until: body.available_until || null,
      notes: body.notes || null,
      is_active: true,
      verification_status: 'self_reported',
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'type required: need or offer' }, { status: 400 })
}
