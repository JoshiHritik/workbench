import { supabase } from './supabaseClient'
import type { ActivityReview } from './types'

export function activityKey(name: string, city: string): string {
  return `${name.trim().toLowerCase()}::${city.trim().toLowerCase()}`
}

export async function listReviews(name: string, city: string): Promise<ActivityReview[]> {
  const { data } = await supabase
    .from('activity_reviews')
    .select('*')
    .eq('activity_key', activityKey(name, city))
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function upsertReview(
  userId: string,
  name: string,
  city: string,
  rating: number,
  comment: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('activity_reviews').upsert(
    {
      user_id: userId,
      activity_key: activityKey(name, city),
      activity_name: name,
      city,
      rating,
      comment: comment.trim() || null,
    },
    { onConflict: 'user_id,activity_key' },
  )
  return { error: error?.message ?? null }
}

export async function deleteReview(id: string): Promise<void> {
  await supabase.from('activity_reviews').delete().eq('id', id)
}
