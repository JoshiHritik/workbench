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
  travelers: number | null
  created_at: string
}

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  language: string
  bio: string | null
  default_public: boolean
  is_admin: boolean
  created_at: string
}

export interface ActivityReview {
  id: string
  user_id: string
  activity_key: string
  activity_name: string
  city: string
  rating: number
  comment: string | null
  created_at: string
}

export interface SavedCity {
  id: string
  user_id: string
  city_name: string
  city_state: string | null
  city_country: string | null
  image_url: string | null
  created_at: string
}

export interface FavoriteActivity {
  id: string
  user_id: string
  activity_id: string
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

export interface TripStop {
  id: string
  trip_id: string
  city_id: string
  arrival_date: string | null
  departure_date: string | null
  order_index: number
}
