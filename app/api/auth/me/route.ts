import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/api/helpers'

export async function GET() {
  try {
    const { supabase, user } = await getAuthContext()

    if (!user) {
      return NextResponse.json({ id: null })
    }

    // Fetch profile data alongside auth info
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, neighborhood_hub, trust_points, avatar_url, talents')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      id: user.id,
      email: user.email,
      profile: profile || null,
    })
  } catch {
    return NextResponse.json({ id: null })
  }
}
