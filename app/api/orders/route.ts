import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Public: return all orders for demo
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Enrich with profiles and items
    const orderIds = (data || []).map((o: { id: string }) => o.id)
    const userIds = [...new Set((data || []).flatMap((o: { initiator_id: string; counterparty_id: string }) => [o.initiator_id, o.counterparty_id]))]

    const [{ data: items }, { data: profiles }] = await Promise.all([
      supabase.from('order_items').select('*').in('order_id', orderIds),
      supabase.from('profiles').select('*').in('id', userIds),
    ])

    const profileMap = Object.fromEntries((profiles || []).map((p: { id: string }) => [p.id, p]))
    const itemMap: Record<string, typeof items> = {}
    for (const item of items || []) {
      if (!itemMap[item.order_id]) itemMap[item.order_id] = []
      itemMap[item.order_id].push(item)
    }

    const enriched = (data || []).map((o: { id: string; initiator_id: string; counterparty_id: string }) => ({
      ...o,
      initiator_profile: profileMap[o.initiator_id] || null,
      counterparty_profile: profileMap[o.counterparty_id] || null,
      items: itemMap[o.id] || [],
    }))

    return NextResponse.json(enriched)
  }

  // Authenticated: return user's orders
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .or(`initiator_id.eq.${user.id},counterparty_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const orderIds = (data || []).map((o: { id: string }) => o.id)
  const userIds = [...new Set((data || []).flatMap((o: { initiator_id: string; counterparty_id: string }) => [o.initiator_id, o.counterparty_id]))]

  const [{ data: items }, { data: profiles }] = await Promise.all([
    supabase.from('order_items').select('*').in('order_id', orderIds.length ? orderIds : ['none']),
    supabase.from('profiles').select('*').in('id', userIds.length ? userIds : ['none']),
  ])

  const profileMap = Object.fromEntries((profiles || []).map((p: { id: string }) => [p.id, p]))
  const itemMap: Record<string, typeof items> = {}
  for (const item of items || []) {
    if (!itemMap[item.order_id]) itemMap[item.order_id] = []
    itemMap[item.order_id].push(item)
  }

  const enriched = (data || []).map((o: { id: string; initiator_id: string; counterparty_id: string }) => ({
    ...o,
    initiator_profile: profileMap[o.initiator_id] || null,
    counterparty_profile: profileMap[o.counterparty_id] || null,
    items: itemMap[o.id] || [],
  }))

  return NextResponse.json(enriched)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    counterparty_id, order_type, money_amount, money_direction,
    related_agreement_id, related_route_id, related_need_id, related_surplus_id,
    pickup_hub, dropoff_hub, notes, items,
  } = body

  if (!counterparty_id || !order_type) {
    return NextResponse.json({ error: 'counterparty_id and order_type required' }, { status: 400 })
  }

  if (counterparty_id === user.id) {
    return NextResponse.json({ error: 'Cannot create order with yourself' }, { status: 400 })
  }

  // Create order
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      initiator_id: user.id,
      counterparty_id,
      order_type,
      money_amount: money_amount || 0,
      money_direction: money_direction || null,
      related_agreement_id: related_agreement_id || null,
      related_route_id: related_route_id || null,
      related_need_id: related_need_id || null,
      related_surplus_id: related_surplus_id || null,
      pickup_hub: pickup_hub || null,
      dropoff_hub: dropoff_hub || null,
      notes: notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Insert items if provided
  if (items && Array.isArray(items) && items.length > 0) {
    const orderItems = items.map((item: { product_name: string; quantity: number; unit: string; direction: string; product_id?: string; product_type_id?: string; surplus_id?: string; price_per_unit?: number }) => ({
      order_id: order.id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit: item.unit,
      direction: item.direction,
      product_id: item.product_id || null,
      product_type_id: item.product_type_id || null,
      surplus_id: item.surplus_id || null,
      price_per_unit: item.price_per_unit || null,
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
    if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  return NextResponse.json(order, { status: 201 })
}
