"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
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

  useEffect(() => {
    console.log('AuthContext: useEffect running')
    
    // Check for existing Supabase session
    const checkSession = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (currentUser) {
          console.log('AuthContext: Supabase user found:', currentUser)
          setUser(currentUser)
        } else {
          // Fallback to demo user if no Supabase session
          const storedUser = getStoredUser()
          console.log('AuthContext: Stored demo user found:', storedUser)
          if (storedUser) {
            setUser(storedUser)
          }
        }
      } catch (error) {
        console.error('AuthContext: Error checking session:', error)
        // Fallback to demo user
        const storedUser = getStoredUser()
        if (storedUser) {
          setUser(storedUser)
        }
      }
      
      console.log('AuthContext: Setting isLoading to false')
      setIsLoading(false)
    }

    checkSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: Auth state changed:', event, session)
        
        if (event === 'SIGNED_IN' && session?.user) {
          const userProfile = await createOrGetUserProfile(session.user)
          if (userProfile) {
            setUser(userProfile)
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          clearStoredUser()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
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
  }

  const logout = async () => {
    console.log('AuthContext: Logging out')
    try {
      await logoutUser()
    } catch (error) {
      console.error('Logout error:', error)
    }
    setUser(null)
    clearStoredUser()
  }

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
  }

  console.log('AuthContext: Current state:', { user, isLoading })

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 