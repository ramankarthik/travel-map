import { supabase } from './supabase'

export interface User {
  id: string
  email: string
  name: string
  created_at: string
}

export interface UserProfile {
  id: string
  email: string
  name: string
  created_at: string
  updated_at: string
}

// Demo user data for testing
const DEMO_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'demo@example.com',
  name: 'Demo User',
  created_at: new Date().toISOString()
}

export const loginUser = async (email: string, password: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.error('Login error:', error.message)
      return null
    }

    if (!data.user) {
      console.error('No user data returned')
      return null
    }

    // Special handling for demo user
    if (data.user.email === 'demo@example.com') {
      // Store demo user in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('demo-user', JSON.stringify(DEMO_USER))
      }
      return DEMO_USER
    }

    // For real users, get their profile
    const userProfile = await createOrGetUserProfile(data.user)
    return userProfile
  } catch (error) {
    console.error('Login error:', error)
    return null
  }
}

export const signUpUser = async (email: string, password: string, name: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name
        }
      }
    })

    if (error) {
      console.error('Signup error:', error.message)
      return null
    }

    if (!data.user) {
      console.error('No user data returned from signup')
      return null
    }

    // Create user profile
    const userProfile = await createOrGetUserProfile(data.user)
    return userProfile
  } catch (error) {
    console.error('Signup error:', error)
    return null
  }
}

export const createOrGetUserProfile = async (supabaseUser: any): Promise<User | null> => {
  try {
    // Check if user profile already exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', supabaseUser.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', fetchError)
      return null
    }

    if (existingUser) {
      return {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        created_at: existingUser.created_at
      }
    }

    // Create new user profile
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User'
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
      name: newUser.name,
      created_at: newUser.created_at
    }
  } catch (error) {
    console.error('Error in createOrGetUserProfile:', error)
    return null
  }
}

export const logoutUser = async (): Promise<void> => {
  try {
    // Clear demo user from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('demo-user')
      localStorage.removeItem('demo-destinations')
    }

    // Sign out from Supabase
    await supabase.auth.signOut()
  } catch (error) {
    console.error('Logout error:', error)
  }
}

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      // Check for demo user in localStorage
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('demo-user')
        if (storedUser) {
          return JSON.parse(storedUser)
        }
      }
      return null
    }

    // Special handling for demo user
    if (user.email === 'demo@example.com') {
      return DEMO_USER
    }

    // For real users, get their profile
    return await createOrGetUserProfile(user)
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
} 