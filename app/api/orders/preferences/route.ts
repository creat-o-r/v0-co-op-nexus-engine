import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('order_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Upsert: create if not exists, update if exists
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
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
