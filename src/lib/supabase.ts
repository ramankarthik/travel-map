import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      locations: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string
          latitude: number
          longitude: number
          type: 'visited' | 'wishlist'
          visited_at: string | null
          notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description: string
          latitude: number
          longitude: number
          type: 'visited' | 'wishlist'
          visited_at?: string | null
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string
          latitude?: number
          longitude?: number
          type?: 'visited' | 'wishlist'
          visited_at?: string | null
          notes?: string
          created_at?: string
          updated_at?: string
        }
      }
      photos: {
        Row: {
          id: string
          location_id: string
          url: string
          caption: string
          uploaded_at: string
        }
        Insert: {
          id?: string
          location_id: string
          url: string
          caption: string
          uploaded_at?: string
        }
        Update: {
          id?: string
          location_id?: string
          url?: string
          caption?: string
          uploaded_at?: string
        }
      }
    }
  }
} 