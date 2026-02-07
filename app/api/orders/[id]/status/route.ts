import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_TRANSITIONS: Record<string, { by: 'initiator' | 'counterparty' | 'either'; to: string[] }> = {
  proposed:   { by: 'counterparty', to: ['accepted', 'rejected'] },
  accepted:   { by: 'either',       to: ['in_transit', 'cancelled'] },
  in_transit: { by: 'either',       to: ['delivered', 'disputed'] },
  delivered:  { by: 'either',       to: ['completed', 'disputed'] },
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { status: newStatus } = await request.json()
  if (!newStatus) return NextResponse.json({ error: 'status required' }, { status: 400 })

  // Fetch current order
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  // Check user is a party
  const role = order.initiator_id === user.id ? 'initiator'
    : order.counterparty_id === user.id ? 'counterparty'
    : null
  if (!role) return NextResponse.json({ error: 'Not a party to this order' }, { status: 403 })

  // Validate transition
  const rule = VALID_TRANSITIONS[order.status]
  if (!rule) return NextResponse.json({ error: `Cannot transition from ${order.status}` }, { status: 400 })
  if (!rule.to.includes(newStatus)) return NextResponse.json({ error: `Invalid transition: ${order.status} -> ${newStatus}` }, { status: 400 })
  if (rule.by !== 'either' && rule.by !== role) {
    return NextResponse.json({ error: `Only ${rule.by} can perform this transition` }, { status: 403 })
  }

  // Special: initiator can also cancel their own proposed order
  if (order.status === 'proposed' && newStatus === 'cancelled' && role === 'initiator') {
    // allowed
  }

  const { data: updated, error: updateError } = await supabase
    .from('orders')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json(updated)
}
