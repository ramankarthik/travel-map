import { supabase } from './supabase'


export interface User {
  id: string
  email: string
  name: string
}

export interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

// Mock user for demo purposes (you can remove this later)
const DEMO_USER: User = {
  id: '00000000-0000-0000-0000-000000000001', // Use a proper UUID
  email: 'demo@example.com',
  name: 'Demo User'
}

// Function to ensure demo user exists in database
const ensureDemoUserExists = async (): Promise<boolean> => {
  try {
    // First, try to get existing demo user
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', DEMO_USER.id)
      .single()

    if (existingUser) {
      return true // Demo user already exists
    }

    // Create demo user if it doesn't exist
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: DEMO_USER.id,
        email: DEMO_USER.email,
        name: DEMO_USER.name
      })

    if (insertError) {
      console.error('Error creating demo user:', insertError)
      return false
    }

    return true
  } catch (error) {
    console.error('Error ensuring demo user exists:', error)
    return false
  }
}

export const loginUser = async (email: string, password: string): Promise<User | null> => {
  try {
    // For demo purposes, allow login with demo credentials
    if (email === 'demo@example.com' && password === 'demo123') {
      // For demo user, just return the demo user without database interaction
      console.log('Demo user login successful')
      return DEMO_USER
    }

    // Real Supabase authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.error('Login error:', error)
      return null
    }

    if (data.user) {
      // Create or get user profile
      const userProfile = await createOrGetUserProfile(data.user)
      return userProfile
    }

    return null
  } catch (error) {
    console.error('Login error:', error)
    return null
  }
}

export const createOrGetUserProfile = async (supabaseUser: Record<string, unknown>): Promise<User | null> => {
  try {
    // First, try to get existing user profile
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', supabaseUser.id)
      .single()

    if (existingUser) {
      return {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name
      }
    }

    // If user doesn't exist, create a new profile
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: supabaseUser.user_metadata?.name || supabaseUser.email || ''
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating user profile:', insertError)
      return null
    }

    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name
    }
  } catch (error) {
    console.error('Error in createOrGetUserProfile:', error)
    return null
  }
}

export const logoutUser = async (): Promise<void> => {
  try {
    await supabase.auth.signOut()
  } catch (error) {
    console.error('Logout error:', error)
  }
}

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }

    return {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || user.email || ''
    }
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}

// Local storage helpers for demo mode
export const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem('demo-user')
    return stored ? JSON.parse(stored) : null
  } catch (error) {
    console.error('Error getting stored user:', error)
    return null
  }
}

export const storeUser = (user: User): void => {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem('demo-user', JSON.stringify(user))
  } catch (error) {
    console.error('Error storing user:', error)
  }
}

export const clearStoredUser = (): void => {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem('demo-user')
  } catch (error) {
    console.error('Error clearing stored user:', error)
  }
} 