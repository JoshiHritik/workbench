import { supabase } from './supabaseClient'
import type { SavedCity } from './types'

export async function listSavedCities(userId: string): Promise<SavedCity[]> {
  const { data } = await supabase
    .from('saved_cities')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function isCitySaved(
  userId: string,
  cityName: string,
  cityCountry: string | null,
): Promise<string | null> {
  const { data } = await supabase
    .from('saved_cities')
    .select('id')
    .eq('user_id', userId)
    .eq('city_name', cityName)
    .eq('city_country', cityCountry)
    .maybeSingle()
  return data?.id ?? null
}

export async function saveCity(
  userId: string,
  city: { name: string; state: string | null; country: string | null; imageUrl: string | null },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('saved_cities').insert({
    user_id: userId,
    city_name: city.name,
    city_state: city.state,
    city_country: city.country,
    image_url: city.imageUrl,
  })
  return { error: error?.message ?? null }
}

export async function removeSavedCity(id: string): Promise<void> {
  await supabase.from('saved_cities').delete().eq('id', id)
}
