export interface Trip {
  id: string
  user_id: string
  name: string
  start_date: string | null
  end_date: string | null
  description: string | null
  cover_photo_url: string | null
  is_public: boolean
  created_at: string
}

export interface City {
  id: string
  name: string
  country: string
  cost_index: number | null
  popularity: number
  image_url: string | null
}
