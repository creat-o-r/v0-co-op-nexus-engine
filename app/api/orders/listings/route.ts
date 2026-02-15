import { NextResponse } from 'next/server'
import { getAuthContext, apiError, fetchProfileMap } from '@/lib/api/helpers'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const { supabase } = await getAuthContext()

    if (type === 'needs') {
      const { data, error } = await supabase
        .from('user_needs')
        .select('id, user_id, product_id, product_name, quantity, unit, frequency, max_price_per_unit, priority, notes, is_active, created_at, updated_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) return apiError(error.message, 500)
      if (!data || data.length === 0) return NextResponse.json([])

      const userIds = [...new Set(data.map(n => n.user_id))]
      const profileMap = await fetchProfileMap(supabase, userIds)

      return NextResponse.json(data.map(n => ({
        ...n,
        profile: profileMap.get(n.user_id) || null,
      })))
    }

    if (type === 'offers') {
      const { data, error } = await supabase
        .from('user_surplus')
        .select('id, user_id, product_id, product_name, quantity_available, unit, price_per_unit, verification_status, notes, is_active, created_at, updated_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) return apiError(error.message, 500)
      if (!data || data.length === 0) return NextResponse.json([])

      const userIds = [...new Set(data.map(s => s.user_id))]
      const profileMap = await fetchProfileMap(supabase, userIds)

      return NextResponse.json(data.map(s => ({
        ...s,
        profile: profileMap.get(s.user_id) || null,
      })))
    }

    return apiError('type param required: needs or offers', 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return apiError(message, 500)
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthContext()
    if (!user) return apiError('Unauthorized', 401)

    const body = await request.json()
    const type = body.type

    if (type !== 'need' && type !== 'offer') {
      return apiError('type required: need or offer', 400)
    }

    if (!body.product_name || typeof body.product_name !== 'string' || body.product_name.trim().length === 0) {
      return apiError('product_name is required', 400)
    }

    if (type === 'need') {
      const payload = {
        product_name: body.product_name.trim(),
        product_id: body.product_id || null,
        quantity: body.quantity || 1,
        unit: body.unit || 'unit',
        frequency: body.frequency || 'once',
        max_price_per_unit: body.max_price_per_unit || null,
        priority: body.priority || 'normal',
        notes: body.notes || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      }

      let data, error
      if (body.id) {
        const res = await supabase.from('user_needs').update(payload).eq('id', body.id).eq('user_id', user.id).select().single()
        data = res.data; error = res.error
      } else {
        const res = await supabase.from('user_needs').insert({ ...payload, user_id: user.id }).select().single()
        data = res.data; error = res.error
      }

      if (error) return apiError(error.message, 500)
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

      if (error) return apiError(error.message, 500)
      return NextResponse.json(data)
    }

    return apiError('type required: need or offer', 400)
  } catch {
    return apiError('Internal server error', 500)
  }
}
