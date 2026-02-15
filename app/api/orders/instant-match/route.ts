import { NextResponse } from 'next/server'
import { getAuthContext, apiError, fetchProfileMap } from '@/lib/api/helpers'
import { INSTANT_MATCH_LIMIT } from '@/lib/constants'

// GET /api/orders/instant-match?q=flour&for=need  (typing a need -> show matching offers)
// GET /api/orders/instant-match?q=flour&for=offer (typing an offer -> show matching needs)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()
    const forType = searchParams.get('for')

    if (!q || q.length < 2) return NextResponse.json([])

    const { supabase } = await getAuthContext()

    if (forType === 'need') {
      const { data, error } = await supabase
        .from('user_surplus')
        .select('id, user_id, product_id, product_name, quantity_available, unit, price_per_unit, verification_status, notes, is_active')
        .eq('is_active', true)
        .ilike('product_name', `%${q}%`)
        .order('quantity_available', { ascending: false })
        .limit(INSTANT_MATCH_LIMIT)

      if (error) return NextResponse.json([])
      if (!data || data.length === 0) return NextResponse.json([])

      const userIds = [...new Set(data.map(s => s.user_id))]
      const profileMap = await fetchProfileMap(supabase, userIds)

      return NextResponse.json(data.map(s => ({
        ...s,
        profile: profileMap.get(s.user_id) || null,
        match_type: 'surplus',
      })))
    }

    if (forType === 'offer') {
      const { data, error } = await supabase
        .from('user_needs')
        .select('id, user_id, product_id, product_name, quantity, unit, frequency, max_price_per_unit, priority, notes, is_active')
        .eq('is_active', true)
        .ilike('product_name', `%${q}%`)
        .order('priority', { ascending: true })
        .limit(INSTANT_MATCH_LIMIT)

      if (error) return NextResponse.json([])
      if (!data || data.length === 0) return NextResponse.json([])

      const userIds = [...new Set(data.map(n => n.user_id))]
      const profileMap = await fetchProfileMap(supabase, userIds)

      return NextResponse.json(data.map(n => ({
        ...n,
        profile: profileMap.get(n.user_id) || null,
        match_type: 'need',
      })))
    }

    return NextResponse.json([])
  } catch {
    return apiError('Internal server error', 500)
  }
}
