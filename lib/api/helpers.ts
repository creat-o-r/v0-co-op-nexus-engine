import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Standard JSON error response.
 */
export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Authenticate the request and return the Supabase client + user.
 * Returns null user when not authenticated (caller decides if that's an error).
 */
export async function getAuthContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

/**
 * Require authentication — returns 401 if not logged in.
 * Throws a NextResponse so callers can `return requireAuth()` early.
 */
export async function requireAuth() {
  const { supabase, user } = await getAuthContext()
  if (!user) {
    return { supabase, user: null, unauthorized: true as const }
  }
  return { supabase, user, unauthorized: false as const }
}

/**
 * Build a profile lookup map from an array of user IDs.
 */
export async function fetchProfileMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[]
) {
  if (userIds.length === 0) return new Map<string, ProfileRow>()

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, display_name, neighborhood_hub, trust_points, avatar_url')
    .in('id', userIds)

  if (error) throw new Error(error.message)

  return new Map((profiles || []).map(p => [p.id, p]))
}

type ProfileRow = {
  id: string
  display_name: string | null
  neighborhood_hub: string | null
  trust_points: number
  avatar_url: string | null
}

/**
 * Sanitize user-submitted text: trim + truncate to maxLength.
 */
export function sanitizeText(input: string, maxLength: number): string {
  return input.trim().slice(0, maxLength)
}

/**
 * Parse a positive integer from a string, with a default and a max.
 */
export function parsePositiveInt(value: string | null, defaultVal: number, max: number): number {
  if (!value) return defaultVal
  const n = parseInt(value, 10)
  if (isNaN(n) || n < 1) return defaultVal
  return Math.min(n, max)
}
