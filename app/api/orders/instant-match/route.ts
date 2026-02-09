import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Search for instant matches as user types in a need or offer form
// GET /api/orders/instant-match?q=flour&for=need  (typing a need -> show matching offers)
// GET /api/orders/instant-match?q=flour&for=offer (typing an offer -> show matching needs)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const forType = searchParams.get('for') // 'need' | 'offer'

  if (!q || q.length < 2) return NextResponse.json([])

  const supabase = await createClient()

  if (forType === 'need') {
    // User is posting a need -> show matching surplus offers
    const { data, error } = await supabase
      .from('user_surplus')
      .select('id, user_id, product_id, product_name, quantity_available, unit, price_per_unit, verification_status, notes, is_active')
      .eq('is_active', true)
      .ilike('product_name', `%${q}%`)
      .order('quantity_available', { ascending: false })
      .limit(5)

    if (error) return NextResponse.json([])

    const userIds = [...new Set((data || []).map((s: { user_id: string }) => s.user_id))]
    if (userIds.length === 0) return NextResponse.json([])
    const { data: profiles } = await supabase.from('profiles').select('id, display_name, neighborhood_hub, trust_points, avatar_url').in('id', userIds)
    const profileMap = Object.fromEntries((profiles || []).map((p: { id: string }) => [p.id, p]))

    return NextResponse.json((data || []).map((s: { user_id: string }) => ({
      ...s,
      profile: profileMap[s.user_id] || null,
      match_type: 'surplus',
    })))
  }

  if (forType === 'offer') {
    // User is posting an offer -> show matching needs
    const { data, error } = await supabase
      .from('user_needs')
      .select('id, user_id, product_id, product_name, quantity, unit, frequency, max_price_per_unit, priority, notes, is_active')
      .eq('is_active', true)
      .ilike('product_name', `%${q}%`)
      .order('priority', { ascending: true }) // high priority first
      .limit(5)

    if (error) return NextResponse.json([])

    const userIds = [...new Set((data || []).map((n: { user_id: string }) => n.user_id))]
    if (userIds.length === 0) return NextResponse.json([])
    const { data: profiles } = await supabase.from('profiles').select('id, display_name, neighborhood_hub, trust_points, avatar_url').in('id', userIds)
    const profileMap = Object.fromEntries((profiles || []).map((p: { id: string }) => [p.id, p]))

    return NextResponse.json((data || []).map((n: { user_id: string }) => ({
      ...n,
      profile: profileMap[n.user_id] || null,
      match_type: 'need',
    })))
  }

  return NextResponse.json([])
}
