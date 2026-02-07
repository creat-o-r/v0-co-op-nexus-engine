import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Run the matching engine -- pass user_id to filter to their needs, or NULL for all
  const { data: rows, error } = await supabase.rpc('run_matching_engine', {
    p_user_id: user?.id ?? null,
  })

  if (error) {
    console.error('[v0] Matching engine error:', error)
    return NextResponse.json({ matches: [] })
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ matches: [] })
  }

  // Enrich with profile display names
  const userIds = new Set<string>()
  for (const r of rows) {
    if (r.need_user_id) userIds.add(r.need_user_id)
    if (r.surplus_user_id) userIds.add(r.surplus_user_id)
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, neighborhood_hub')
    .in('id', [...userIds])

  const profileMap = new Map(
    (profiles || []).map(p => [p.id, p])
  )

  const matches = rows.map((r: Record<string, unknown>, idx: number) => {
    const buyerProfile = profileMap.get(r.need_user_id as string)
    const sellerProfile = profileMap.get(r.surplus_user_id as string)

    return {
      match_id: `match-${r.need_id}-${r.surplus_id}-${idx}`,
      need_id: r.need_id,
      surplus_id: r.surplus_id,
      product_name: r.need_product || r.surplus_product,
      needed_qty: Number(r.need_quantity) || 0,
      available_qty: Number(r.surplus_qty) || 0,
      unit: r.need_unit || r.surplus_unit || 'each',
      max_price: r.need_max_price ?? null,
      offer_price: Number(r.surplus_price) || null,
      buyer_hub: r.need_hub || buyerProfile?.neighborhood_hub || null,
      seller_hub: r.surplus_hub || sellerProfile?.neighborhood_hub || null,
      route_id: r.route_id || null,
      route_name: r.route_name || null,
      score: Number(r.match_score) || 0,
      buyer_profile: buyerProfile
        ? { display_name: buyerProfile.display_name, avatar_url: buyerProfile.avatar_url }
        : null,
      seller_profile: sellerProfile
        ? { display_name: sellerProfile.display_name, avatar_url: sellerProfile.avatar_url }
        : null,
    }
  })

  return NextResponse.json({ matches })
}
