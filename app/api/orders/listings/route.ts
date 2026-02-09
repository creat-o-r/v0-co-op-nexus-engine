import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') // 'needs' | 'offers'
  const supabase = await createClient()

  if (type === 'needs') {
    const { data, error } = await supabase
      .from('user_needs')
      .select('id, user_id, product_id, product_name, quantity, unit, frequency, max_price_per_unit, priority, notes, is_active, created_at, updated_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const userIds = [...new Set((data || []).map((n: { user_id: string }) => n.user_id))]
    if (userIds.length === 0) return NextResponse.json([])
    const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id, display_name, neighborhood_hub, trust_points, avatar_url').in('id', userIds)
    if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 })
    const profileMap = Object.fromEntries((profiles || []).map((p: { id: string }) => [p.id, p]))

    return NextResponse.json((data || []).map((n: { user_id: string }) => ({
      ...n,
      profile: profileMap[n.user_id] || null,
    })))
  }

  if (type === 'offers') {
    const { data, error } = await supabase
      .from('user_surplus')
      .select('id, user_id, product_id, product_name, quantity_available, unit, price_per_unit, verification_status, notes, is_active, created_at, updated_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const userIds = [...new Set((data || []).map((s: { user_id: string }) => s.user_id))]
    if (userIds.length === 0) return NextResponse.json([])
    const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id, display_name, neighborhood_hub, trust_points, avatar_url').in('id', userIds)
    if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 })
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

  if (type !== 'need' && type !== 'offer') {
    return NextResponse.json({ error: 'type required: need or offer' }, { status: 400 })
  }

  if (!body.product_name || typeof body.product_name !== 'string' || body.product_name.trim().length === 0) {
    return NextResponse.json({ error: 'product_name is required' }, { status: 400 })
  }

  if (type === 'need') {
    const payload = {
      product_name: body.product_name.trim(),
      product_id: body.product_id || null,
      quantity: body.quantity || 1,
      unit: body.unit || 'unit',
      frequency: body.frequency || 'one_time',
      max_price_per_unit: body.max_price_per_unit || null,
      priority: body.priority || 'normal',
      notes: body.notes || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    }

    let data, error
    if (body.id) {
      // Edit existing
      const res = await supabase.from('user_needs').update(payload).eq('id', body.id).eq('user_id', user.id).select().single()
      data = res.data; error = res.error
    } else {
      // Create new
      const res = await supabase.from('user_needs').insert({ ...payload, user_id: user.id }).select().single()
      data = res.data; error = res.error
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (type === 'offer') {
    const payload = {
      product_name: body.product_name.trim(),
      product_id: body.product_id || null,
      quantity_available: body.quantity_available || 1,
      unit: body.unit || 'unit',
      price_per_unit: body.price_per_unit || null,
      available_from: body.available_from || new Date().toISOString().split('T')[0],
      available_until: body.available_until || null,
      notes: body.notes || null,
      is_active: true,
      verification_status: body.id ? undefined : 'self_reported',
      updated_at: new Date().toISOString(),
    }

    let data, error
    if (body.id) {
      const res = await supabase.from('user_surplus').update(payload).eq('id', body.id).eq('user_id', user.id).select().single()
      data = res.data; error = res.error
    } else {
      const res = await supabase.from('user_surplus').insert({ ...payload, user_id: user.id, verification_status: 'self_reported' }).select().single()
      data = res.data; error = res.error
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'type required: need or offer' }, { status: 400 })
}
