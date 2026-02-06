import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch agreement
  const { data: agreement, error } = await supabase
    .from("agreements")
    .select("id, title, description, status, agreement_type, required_talent, deadline, reward_trust_points, created_at")
    .eq("id", id)
    .single()

  if (error || !agreement) {
    return NextResponse.json({ error: "Agreement not found" }, { status: 404 })
  }

  // Fetch collaborators with profiles
  const { data: collaborators } = await supabase
    .from("agreement_collaborators")
    .select("id, user_id, role, profiles:user_id(display_name, neighborhood_hub, avatar_url)")
    .eq("agreement_id", id)
    .order("role", { ascending: true })

  // Count linked scenarios
  const { count: scenarioCount } = await supabase
    .from("feed_items")
    .select("id", { count: "exact", head: true })
    .eq("related_agreement_id", id)
    .eq("feed_type", "scenario")

  return NextResponse.json({
    ...agreement,
    collaborators: (collaborators || []).map((c) => ({
      id: c.id,
      user_id: c.user_id,
      role: c.role,
      profile: c.profiles,
    })),
    scenario_count: scenarioCount || 0,
  })
}
