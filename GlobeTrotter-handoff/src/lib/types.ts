export interface Trip {
  id: string
  user_id: string
  name: string
  start_date: string | null
  end_date: string | null
  description: string | null
  cover_photo_url: string | null
  is_public: boolean
  status: string
  budget: number | null
  trip_vibe: string | null
  created_at: string
}

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  language: string
  created_at: string
}

export interface City {
  id: string
  name: string
  state: string | null
  country: string
  cost_index: number | null
  popularity: number
  image_url: string | null
}
