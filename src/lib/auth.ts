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
  console.log('loginUser: Starting login for:', email);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.error('loginUser: Login error:', error.message)
      return null
    }

    if (!data.user) {
      console.error('loginUser: No user data returned')
      return null
    }

    console.log('loginUser: Auth successful for:', data.user.email);

    // Special handling for demo user
    if (data.user.email === 'demo@example.com') {
      console.log('loginUser: Demo user detected, returning demo user');
      // Store demo user in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('demo-user', JSON.stringify(DEMO_USER))
      }
      return DEMO_USER
    }

    // For real users, get their profile
    console.log('loginUser: Getting user profile for real user');
    const userProfile = await createOrGetUserProfile(data.user)
    console.log('loginUser: User profile result:', userProfile);
    return userProfile
  } catch (error) {
    console.error('loginUser: Login error:', error)
    return null
  }
}

export const signUpUser = async (email: string, password: string, name: string): Promise<User | null> => {
  console.log('signUpUser: Starting signup for:', email);
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
      console.error('signUpUser: Signup error:', error.message)
      return null
    }

    if (!data.user) {
      console.error('signUpUser: No user data returned from signup')
      return null
    }

    console.log('signUpUser: Auth signup successful, creating profile');
    // Create user profile
    const userProfile = await createOrGetUserProfile(data.user)
    console.log('signUpUser: User profile created:', userProfile);
    return userProfile
  } catch (error) {
    console.error('signUpUser: Signup error:', error)
    return null
  }
}

export const createOrGetUserProfile = async (supabaseUser: any): Promise<User | null> => {
  console.log('createOrGetUserProfile: Starting for user:', supabaseUser.id);
  try {
    // Check if user profile already exists
    console.log('createOrGetUserProfile: Checking if user exists in users table');
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', supabaseUser.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('createOrGetUserProfile: Error fetching user profile:', fetchError)
      return null
    }

    if (existingUser) {
      console.log('createOrGetUserProfile: Found existing user:', existingUser.name);
      return {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        created_at: existingUser.created_at
      }
    }

    // Create new user profile
    console.log('createOrGetUserProfile: Creating new user profile');
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
      console.error('createOrGetUserProfile: Error creating user profile:', insertError)
      return null
    }

    console.log('createOrGetUserProfile: Created new user:', newUser.name);
    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      created_at: newUser.created_at
    }
  } catch (error) {
    console.error('createOrGetUserProfile: Error in createOrGetUserProfile:', error)
    return null
  }
}

export const logoutUser = async (): Promise<void> => {
  console.log('logoutUser: Starting logout');
  try {
    // Clear demo user from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('demo-user')
      localStorage.removeItem('demo-destinations')
    }

    // Sign out from Supabase
    await supabase.auth.signOut()
    console.log('logoutUser: Logout successful');
  } catch (error) {
    console.error('logoutUser: Logout error:', error)
  }
}

export const getCurrentUser = async (): Promise<User | null> => {
  console.log('getCurrentUser: Starting current user check');
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.log('getCurrentUser: No auth user found, checking localStorage');
      // Check for demo user in localStorage
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('demo-user')
        if (storedUser) {
          console.log('getCurrentUser: Found demo user in localStorage');
          return JSON.parse(storedUser)
        }
      }
      console.log('getCurrentUser: No user found');
      return null
    }

    console.log('getCurrentUser: Found auth user:', user.email);

    // Special handling for demo user
    if (user.email === 'demo@example.com') {
      console.log('getCurrentUser: Demo user detected');
      return DEMO_USER
    }

    // For real users, get their profile
    console.log('getCurrentUser: Getting profile for real user');
    return await createOrGetUserProfile(user)
  } catch (error) {
    console.error('getCurrentUser: Error getting current user:', error)
    return null
  }
} 