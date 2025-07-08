import { supabase } from './supabase'

export interface User {
  id: string
  email: string
  name: string
  created_at: string
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
  
  // Special handling for demo user - bypass Supabase auth
  if (email === 'demo@example.com' && password === 'demo123') {
    console.log('loginUser: Demo user detected, bypassing Supabase auth');
    // Store demo user in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('demo-user', JSON.stringify(DEMO_USER))
    }
    return DEMO_USER
  }
  
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

    // Convert Supabase user to our User interface
    const user: User = {
      id: data.user.id,
      email: data.user.email || '',
      name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
      created_at: data.user.created_at
    }

    return user
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

    console.log('signUpUser: Auth signup successful');

    // Convert Supabase user to our User interface
    const user: User = {
      id: data.user.id,
      email: data.user.email || '',
      name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
      created_at: data.user.created_at
    }

    return user
  } catch (error) {
    console.error('signUpUser: Signup error:', error)
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

    // Convert Supabase user to our User interface
    const userObj: User = {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      created_at: user.created_at
    }

    console.log('getCurrentUser: Returning user:', userObj.name);
    return userObj
  } catch (error) {
    console.error('getCurrentUser: Error getting current user:', error)
    return null
  }
} 