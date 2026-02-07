import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') // 'needs' | 'offers'
  const supabase = await createClient()

  if (type === 'needs') {
    const { data, error } = await supabase
      .from('user_needs')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const userIds = [...new Set((data || []).map((n: { user_id: string }) => n.user_id))]
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds.length ? userIds : ['none'])
    const profileMap = Object.fromEntries((profiles || []).map((p: { id: string }) => [p.id, p]))

    return NextResponse.json((data || []).map((n: { user_id: string }) => ({
      ...n,
      profile: profileMap[n.user_id] || null,
    })))
  }

  if (type === 'offers') {
    const { data, error } = await supabase
      .from('user_surplus')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const userIds = [...new Set((data || []).map((s: { user_id: string }) => s.user_id))]
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds.length ? userIds : ['none'])
    const profileMap = Object.fromEntries((profiles || []).map((p: { id: string }) => [p.id, p]))

    return NextResponse.json((data || []).map((s: { user_id: string }) => ({
      ...s,
      profile: profileMap[s.user_id] || null,
    })))
  }

  return NextResponse.json({ error: 'type param required: needs or offers' }, { status: 400 })
}
