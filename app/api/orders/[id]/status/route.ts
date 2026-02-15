import { NextResponse } from 'next/server'
import { getAuthContext, apiError } from '@/lib/api/helpers'
import { ORDER_STATUS_TRANSITIONS } from '@/lib/constants'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { supabase, user } = await getAuthContext()
    if (!user) return apiError('Unauthorized', 401)

    const body = await request.json()
    const newStatus = body.status
    if (!newStatus || typeof newStatus !== 'string') {
      return apiError('status required', 400)
    }

    // Fetch current order
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !order) return apiError('Order not found', 404)

    // Check user is a party
    const role = order.initiator_id === user.id ? 'initiator'
      : order.counterparty_id === user.id ? 'counterparty'
      : null
    if (!role) return apiError('Not a party to this order', 403)

    // Special: initiator can cancel their own proposed order
    if (order.status === 'proposed' && newStatus === 'cancelled' && role === 'initiator') {
      const { data: updated, error: updateError } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (updateError) return apiError(updateError.message, 500)
      return NextResponse.json(updated)
    }

    // Validate transition
    const rule = ORDER_STATUS_TRANSITIONS[order.status]
    if (!rule) return apiError(`Cannot transition from ${order.status}`, 400)
    if (!rule.to.includes(newStatus as typeof rule.to[number])) return apiError(`Invalid transition: ${order.status} -> ${newStatus}`, 400)
    if (rule.by !== 'either' && rule.by !== role) {
      return apiError(`Only ${rule.by} can perform this transition`, 403)
    }

    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (updateError) return apiError(updateError.message, 500)

    return NextResponse.json(updated)
  } catch {
    return apiError('Internal server error', 500)
  }
}
