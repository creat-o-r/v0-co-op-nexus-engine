import { NextResponse } from 'next/server'
import { getAuthContext, apiError, fetchProfileMap } from '@/lib/api/helpers'

const ORDER_FIELDS = 'id, initiator_id, counterparty_id, order_type, status, money_amount, money_direction, related_agreement_id, related_route_id, related_need_id, related_surplus_id, pickup_hub, dropoff_hub, notes, created_at, updated_at'

async function enrichOrders(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  orders: Array<{ id: string; initiator_id: string; counterparty_id: string }>
) {
  if (orders.length === 0) return []

  const orderIds = orders.map(o => o.id)
  const userIds = [...new Set(orders.flatMap(o => [o.initiator_id, o.counterparty_id]))]

  const [{ data: items, error: itemsError }, profileMap] = await Promise.all([
    supabase.from('order_items')
      .select('id, order_id, product_id, product_type_id, surplus_id, product_name, quantity, unit, direction, price_per_unit, created_at')
      .in('order_id', orderIds),
    fetchProfileMap(supabase, userIds),
  ])

  if (itemsError) throw new Error(itemsError.message)

  const itemMap: Record<string, typeof items> = {}
  for (const item of items || []) {
    if (!itemMap[item.order_id]) itemMap[item.order_id] = []
    itemMap[item.order_id].push(item)
  }

  return orders.map(o => ({
    ...o,
    initiator_profile: profileMap.get(o.initiator_id) || null,
    counterparty_profile: profileMap.get(o.counterparty_id) || null,
    items: itemMap[o.id] || [],
  }))
}

export async function GET() {
  try {
    const { supabase, user } = await getAuthContext()

    let query = supabase
      .from('orders')
      .select(ORDER_FIELDS)
      .order('created_at', { ascending: false })

    // Authenticated: scope to user's orders using parameterized filter
    if (user) {
      query = query.or(`initiator_id.eq.${user.id},counterparty_id.eq.${user.id}`)
    }

    const { data, error } = await query

    if (error) return apiError(error.message, 500)
    if (!data || data.length === 0) return NextResponse.json([])

    const enriched = await enrichOrders(supabase, data)
    return NextResponse.json(enriched)
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
    const {
      counterparty_id, order_type, money_amount, money_direction,
      related_agreement_id, related_route_id, related_need_id, related_surplus_id,
      pickup_hub, dropoff_hub, notes, items,
    } = body

    if (!counterparty_id || !order_type) {
      return apiError('counterparty_id and order_type required', 400)
    }

    if (counterparty_id === user.id) {
      return apiError('Cannot create order with yourself', 400)
    }

    const validTypes = ['purchase', 'swap', 'mixed']
    if (!validTypes.includes(order_type)) {
      return apiError('Invalid order_type', 400)
    }

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

    if (error) return apiError(error.message, 500)

    if (items && Array.isArray(items) && items.length > 0) {
      const orderItems = items.map((item: {
        product_name: string
        quantity: number
        unit: string
        direction: string
        product_id?: string
        product_type_id?: string
        surplus_id?: string
        price_per_unit?: number
      }) => ({
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
      if (itemsError) return apiError(itemsError.message, 500)
    }

    return NextResponse.json(order, { status: 201 })
  } catch {
    return apiError('Internal server error', 500)
  }
}
