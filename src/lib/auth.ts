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
  // Special handling for demo user - bypass Supabase auth
  if (email === 'demo@example.com' && password === 'demo123') {
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
      console.error('Login error:', error.message)
      return null
    }

    if (!data.user) {
      console.error('No user data returned')
      return null
    }

    // Convert Supabase user to our User interface
    const user: User = {
      id: data.user.id,
      email: data.user.email || '',
      name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
      created_at: data.user.created_at
    }

    return user
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

    // Convert Supabase user to our User interface
    const user: User = {
      id: data.user.id,
      email: data.user.email || '',
      name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
      created_at: data.user.created_at
    }

    return user
  } catch (error) {
    console.error('Signup error:', error)
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
  // Add timeout to prevent infinite hanging
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, 5000); // 5 second timeout
  });

  const getUserPromise = async (): Promise<User | null> => {
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

      // Convert Supabase user to our User interface
      const userObj: User = {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        created_at: user.created_at
      }

      return userObj
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  };

  // Race between the actual function and the timeout
  return Promise.race([getUserPromise(), timeoutPromise]);
} 