"use client"

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { User, AuthContextType, loginUser, logoutUser, getCurrentUser, createOrGetUserProfile, getStoredUser, storeUser, clearStoredUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasInitialized, setHasInitialized] = useState(false)

  useEffect(() => {
    console.log('AuthContext: useEffect running')
    
    // Check for existing Supabase session immediately
    const checkSession = async () => {
      try {
        // First check if there's an existing session
        const { data: { session } } = await supabase.auth.getSession()
        console.log('AuthContext: Initial session check:', session ? 'found' : 'not found')
        
        if (session?.user) {
          console.log('AuthContext: Found existing session for user:', session.user.id)
          const currentUser = await getCurrentUser()
          console.log('AuthContext: getCurrentUser result:', currentUser)
          
          if (currentUser) {
            console.log('AuthContext: Setting user from existing session:', currentUser)
            setUser(currentUser)
            setIsLoading(false)
            setHasInitialized(true)
            return
          }
        }
        
        // Fallback to demo user if no Supabase session
        const storedUser = getStoredUser()
        console.log('AuthContext: Stored demo user found:', storedUser)
        if (storedUser) {
          setUser(storedUser)
        }
      } catch (error) {
        console.error('AuthContext: Error checking session:', error)
        // Fallback to demo user
        const storedUser = getStoredUser()
        if (storedUser) {
          setUser(storedUser)
        }
      }
      
      console.log('AuthContext: Setting isLoading to false (checkSession)')
      setIsLoading(false)
      setHasInitialized(true)
    }

    checkSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: Auth state changed:', event, session)
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('AuthContext: Processing SIGNED_IN event for user:', session.user.id)
          try {
            const userProfile = await createOrGetUserProfile(session.user)
            console.log('AuthContext: createOrGetUserProfile result:', userProfile)
            if (userProfile) {
              setUser(userProfile)
              console.log('AuthContext: User set after SIGNED_IN:', userProfile)
            }
          } catch (error) {
            console.error('AuthContext: Error in createOrGetUserProfile:', error)
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          clearStoredUser()
          console.log('AuthContext: User set to null after SIGNED_OUT')
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('AuthContext: Token refreshed, session extended')
        }
        
        // Only set loading to false if we haven't already initialized
        if (!hasInitialized) {
          console.log('AuthContext: Setting isLoading to false (onAuthStateChange)')
          setIsLoading(false)
          setHasInitialized(true)
        }
      }
    )

    // Fallback: always set isLoading to false after 2 seconds
    const timeout = setTimeout(() => {
      if (!hasInitialized) {
        console.log('AuthContext: Fallback timeout - setting isLoading to false')
        setIsLoading(false)
        setHasInitialized(true)
      }
    }, 2000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [hasInitialized])

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    console.log('AuthContext: Attempting login with:', email)
    try {
      const user = await loginUser(email, password)
      console.log('AuthContext: Login result:', user)
      if (user) {
        setUser(user)
        // Only store demo user in localStorage
        if (user.id === '00000000-0000-0000-0000-000000000001') {
          storeUser(user)
        }
        console.log('AuthContext: User set successfully')
        return true
      }
      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }, [])

  const logout = useCallback(async () => {
    console.log('AuthContext: Logging out')
    try {
      await logoutUser()
    } catch (error) {
      console.error('Logout error:', error)
    }
    setUser(null)
    clearStoredUser()
  }, [])

  const value = useMemo<AuthContextType>(() => ({
    user,
    login,
    logout,
    isLoading,
  }), [user, login, logout, isLoading])

  console.log('AuthContext: Current state:', { user, isLoading, hasInitialized })
  console.log('AuthContext: User details:', user ? { id: user.id, name: user.name, email: user.email } : 'null')

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 