import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, apiError } from '@/lib/api/helpers'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { supabase } = await getAuthContext()

    const { data: agreement, error } = await supabase
      .from('agreements')
      .select('id, title, description, status, agreement_type, required_talent, deadline, reward_trust_points, created_at')
      .eq('id', id)
      .single()

    if (error || !agreement) return apiError('Agreement not found', 404)

    const { data: collaborators } = await supabase
      .from('agreement_collaborators')
      .select('id, user_id, role, profiles:user_id(display_name, neighborhood_hub, avatar_url)')
      .eq('agreement_id', id)
      .order('role', { ascending: true })

    const { count: scenarioCount } = await supabase
      .from('feed_items')
      .select('id', { count: 'exact', head: true })
      .eq('related_agreement_id', id)
      .eq('feed_type', 'scenario')

    return NextResponse.json({
      ...agreement,
      collaborators: (collaborators || []).map(c => ({
        id: c.id,
        user_id: c.user_id,
        role: c.role,
        profile: c.profiles,
      })),
      scenarioCount: scenarioCount || 0,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return apiError(message, 500)
  }
}
