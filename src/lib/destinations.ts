import { supabase } from './supabase'
import { User } from './auth'

export interface Destination {
  id: string
  user_id: string
  name: string
  country: string
  lat: number
  lng: number
  status: 'visited' | 'wishlist'
  date: string | null
  notes: string
  photos: string[]
  created_at: string
  updated_at: string
}

export interface CreateDestinationData {
  name: string
  country: string
  lat: number
  lng: number
  status: 'visited' | 'wishlist'
  date?: string | null
  notes?: string
  photos?: string[]
}

export interface UpdateDestinationData {
  name?: string
  country?: string
  lat?: number
  lng?: number
  status?: 'visited' | 'wishlist'
  date?: string | null
  notes?: string
  photos?: string[]
}

export class DestinationsService {
  static async getDestinations(user: User): Promise<Destination[]> {
    try {
      // Special handling for demo user
      if (user.id === '00000000-0000-0000-0000-000000000001') {
        // For demo user, load from localStorage
        if (typeof window !== 'undefined') {
          const demoDestinations = JSON.parse(localStorage.getItem('demo-destinations') || '[]')
          return demoDestinations
        }
        return []
      }

      console.log('Fetching destinations for user:', user.id)
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching destinations:', error)
        throw error
      }

      console.log('Fetched destinations from database:', data?.length || 0)
      
      // Transform the data to match our Destination interface
      // Preserve photos data instead of resetting to empty array
      return (data || []).map(location => ({
        ...location,
        photos: location.photos || [] // Use existing photos or empty array if null
      }))
    } catch (error) {
      console.error('Error in getDestinations:', error)
      // Return empty array instead of throwing to prevent infinite loading
      return []
    }
  }

  static async createDestination(user: User, destinationData: CreateDestinationData): Promise<Destination> {
    try {
      // Special handling for demo user
      if (user.id === '00000000-0000-0000-0000-000000000001') {
        // For demo user, create a mock destination with generated ID
        const mockDestination: Destination = {
          id: `demo-${Date.now()}`,
          user_id: user.id,
          name: destinationData.name,
          country: destinationData.country,
          lat: destinationData.lat,
          lng: destinationData.lng,
          status: destinationData.status,
          date: destinationData.date || null,
          notes: destinationData.notes || '',
          photos: destinationData.photos || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        // Store in localStorage for demo purposes
        if (typeof window !== 'undefined') {
          const existingDestinations = JSON.parse(localStorage.getItem('demo-destinations') || '[]')
          existingDestinations.push(mockDestination)
          localStorage.setItem('demo-destinations', JSON.stringify(existingDestinations))
        }
        
        return mockDestination
      }

      const { data, error } = await supabase
        .from('locations')
        .insert({
          user_id: user.id,
          name: destinationData.name,
          country: destinationData.country,
          lat: destinationData.lat,
          lng: destinationData.lng,
          status: destinationData.status,
          date: destinationData.date,
          notes: destinationData.notes || '',
          photos: destinationData.photos || []
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating destination:', error)
        throw error
      }

      return {
        ...data,
        photos: destinationData.photos || []
      }
    } catch (error) {
      console.error('Error in createDestination:', error)
      throw error
    }
  }

  static async updateDestination(user: User, id: string, destinationData: UpdateDestinationData): Promise<Destination> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .update({
          name: destinationData.name,
          country: destinationData.country,
          lat: destinationData.lat,
          lng: destinationData.lng,
          status: destinationData.status,
          date: destinationData.date,
          notes: destinationData.notes,
          photos: destinationData.photos
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating destination:', error)
        throw error
      }

      return {
        ...data,
        photos: destinationData.photos || []
      }
    } catch (error) {
      console.error('Error in updateDestination:', error)
      throw error
    }
  }

  static async deleteDestination(user: User, id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error deleting destination:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in deleteDestination:', error)
      throw error
    }
  }

  static async getDestinationById(user: User, id: string): Promise<Destination | null> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        console.error('Error fetching destination:', error)
        throw error
      }

      return {
        ...data,
        photos: data.photos || [] // Use existing photos or empty array if null
      }
    } catch (error) {
      console.error('Error in getDestinationById:', error)
      throw error
    }
  }
} 