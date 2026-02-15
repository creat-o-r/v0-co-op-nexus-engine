import { NextResponse } from 'next/server'
import { getAuthContext, apiError } from '@/lib/api/helpers'

export async function GET() {
  try {
    const { supabase, user } = await getAuthContext()
    if (!user) return apiError('Unauthorized', 401)

    const { data, error } = await supabase
      .from('order_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) return apiError(error.message, 500)

    return NextResponse.json(data)
  } catch {
    return apiError('Internal server error', 500)
  }
}

export async function PUT(request: Request) {
  try {
    const { supabase, user } = await getAuthContext()
    if (!user) return apiError('Unauthorized', 401)

    const body = await request.json()

    const { data, error } = await supabase
      .from('order_preferences')
      .upsert({
        user_id: user.id,
        allow_swaps: body.allow_swaps ?? true,
        allow_money: body.allow_money ?? true,
        allow_mixed: body.allow_mixed ?? true,
        min_trust_points: body.min_trust_points ?? 0,
        auto_accept: body.auto_accept ?? false,
        accepted_hubs: body.accepted_hubs ?? [],
        blacklisted_items: body.blacklisted_items ?? [],
        notes: body.notes ?? null,
        default_orders_private: body.default_orders_private ?? false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) return apiError(error.message, 500)
    return NextResponse.json(data)
  } catch {
    return apiError('Internal server error', 500)
  }
}
