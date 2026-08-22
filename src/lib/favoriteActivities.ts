import { supabase } from './supabaseClient'

export interface FavoriteActivityRow {
  id: string
  activity_id: string
  activities: {
    id: string
    name: string
    category: string | null
    cost: number | null
    duration_minutes: number | null
    description: string | null
    cities: { name: string; country: string } | null
  } | null
}

export async function listFavoriteActivities(userId: string): Promise<FavoriteActivityRow[]> {
  const { data } = await supabase
    .from('favorite_activities')
    .select('id, activity_id, activities(id, name, category, cost, duration_minutes, description, cities(name, country))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data as unknown as FavoriteActivityRow[]) ?? []
}

export async function isActivityFavorited(userId: string, activityId: string): Promise<string | null> {
  const { data } = await supabase
    .from('favorite_activities')
    .select('id')
    .eq('user_id', userId)
    .eq('activity_id', activityId)
    .maybeSingle()
  return data?.id ?? null
}

export async function favoriteActivity(userId: string, activityId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('favorite_activities').insert({ user_id: userId, activity_id: activityId })
  return { error: error?.message ?? null }
}

export async function unfavoriteActivity(favoriteId: string): Promise<void> {
  await supabase.from('favorite_activities').delete().eq('id', favoriteId)
}
