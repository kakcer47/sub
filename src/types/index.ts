export interface User {
  id: number
  telegram_id: number
  name: string
  username: string
  avatar?: string
  created_at: string
}

export interface Entry {
  id: number
  title: string
  description: string
  city?: string
  type: string[]
  date?: string
  gender?: string
  creator_id: number
  liked_by: number[]
  created_at: string
  updated_at: string
  creator?: User
}

export interface UserPreferences {
  id: number
  user_id: number
  favorites: number[]
  hidden_entries: number[]
  created_at: string
  updated_at: string
}

export interface Filters {
  city: string
  type: string[]
  dateFrom?: string
  dateTo?: string
  gender: string
  search: string
}

export type SortType = 'new' | 'old' | 'rating' | 'my' | 'favorites' | 'hidden' | 'top'

export type Language = 'ru' | 'en'

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
}

export interface DataItem {
  id: string
  name: string
}