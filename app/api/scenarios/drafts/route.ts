import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, apiError } from '@/lib/api/helpers'

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthContext()
    if (!user) return apiError('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const feedItemId = searchParams.get('feedItemId')
    const agreementId = searchParams.get('agreementId')

    let query = supabase
      .from('feed_item_drafts')
      .select('*')
      .order('created_at', { ascending: false })

    if (feedItemId) {
      query = query.eq('feed_item_id', feedItemId)
    } else if (agreementId) {
      query = query.eq('agreement_id', agreementId)
    } else {
      return apiError('feedItemId or agreementId required', 400)
    }

    const { data: drafts, error } = await query
    if (error) return apiError(error.message, 500)

    if (drafts && drafts.length > 0) {
      const proposerIds = [...new Set(drafts.map(d => d.proposed_by))]
      const draftIds = drafts.map(d => d.id)

      const [profilesRes, approvalsRes] = await Promise.all([
        supabase.from('profiles').select('id, display_name, neighborhood_hub, avatar_url').in('id', proposerIds),
        supabase.from('draft_approvals').select('*').in('draft_id', draftIds),
      ])

      const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p]))

      const approverIds = [...new Set((approvalsRes.data || []).map(a => a.user_id))]
      const approverProfilesRes = approverIds.length > 0
        ? await supabase.from('profiles').select('id, display_name, neighborhood_hub, avatar_url').in('id', approverIds)
        : { data: [] }
      const approverMap = new Map((approverProfilesRes.data || []).map(p => [p.id, p]))

      const enriched = drafts.map(draft => ({
        ...draft,
        proposed_by_profile: profileMap.get(draft.proposed_by) || null,
        approvals: (approvalsRes.data || [])
          .filter(a => a.draft_id === draft.id)
          .map(a => ({ ...a, profile: approverMap.get(a.user_id) || null })),
      }))

      return NextResponse.json({ drafts: enriched })
    }

    return NextResponse.json({ drafts: drafts || [] })
  } catch {
    return apiError('Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthContext()
    if (!user) return apiError('Unauthorized', 401)

    const body = await request.json()
    const {
      feedItemId, agreementId, title, content, question,
      options, taggedProducts, taggedHubs, imageUrl, changeSummary,
    } = body

    if (!agreementId || !title) {
      return apiError('agreementId and title required', 400)
    }

    // Verify user is a collaborator
    const { data: collab } = await supabase
      .from('agreement_collaborators')
      .select('id')
      .eq('agreement_id', agreementId)
      .eq('user_id', user.id)
      .single()

    if (!collab) return apiError('Not a collaborator on this agreement', 403)

    // Count collaborators (excluding proposer) for approvals_needed
    const { count } = await supabase
      .from('agreement_collaborators')
      .select('id', { count: 'exact', head: true })
      .eq('agreement_id', agreementId)
      .neq('user_id', user.id)

    const { data: draft, error } = await supabase
      .from('feed_item_drafts')
      .insert({
        feed_item_id: feedItemId || null,
        agreement_id: agreementId,
        proposed_by: user.id,
        draft_title: title,
        draft_content: content || null,
        draft_question: question || null,
        draft_options: options || null,
        draft_tagged_products: taggedProducts || [],
        draft_tagged_hubs: taggedHubs || [],
        draft_image_url: imageUrl || null,
        status: 'pending',
        approvals_needed: count || 0,
        change_summary: changeSummary || null,
      })
      .select()
      .single()

    if (error) return apiError(error.message, 500)

    return NextResponse.json({ draft })
  } catch {
    return apiError('Internal server error', 500)
  }
}
