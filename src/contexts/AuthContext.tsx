"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, loginUser, logoutUser, getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  hasInitialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      console.log('AuthContext: Starting session check');
      try {
        const currentUser = await getCurrentUser();
        console.log('AuthContext: getCurrentUser result:', currentUser);
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('AuthContext: Error checking session:', error);
      } finally {
        console.log('AuthContext: Setting isLoading to false');
        setIsLoading(false);
        setHasInitialized(true);
      }
    };

    checkSession();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    console.log('AuthContext: Setting up auth state listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        console.log('AuthContext: Auth state changed:', event, session?.user?.email);
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            console.log('AuthContext: About to call getCurrentUser with timeout');
            // Add timeout to getCurrentUser call
            const userProfile = await Promise.race([
              getCurrentUser(),
              new Promise<null>((resolve) => {
                setTimeout(() => {
                  console.error('AuthContext: getCurrentUser timeout, using session user');
                  resolve(null);
                }, 3000);
              })
            ]);
            
            console.log('AuthContext: getCurrentUser result:', userProfile);
            if (userProfile) {
              setUser(userProfile);
            } else {
              // Fallback: create user from session data
              console.log('AuthContext: Creating fallback user from session');
              const fallbackUser: User = {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
                created_at: session.user.created_at
              };
              setUser(fallbackUser);
            }
          } catch (error) {
            console.error('AuthContext: Error getting user profile after sign in:', error);
            // Fallback: create user from session data
            const fallbackUser: User = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
              created_at: session.user.created_at
            };
            setUser(fallbackUser);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('AuthContext: User signed out');
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('AuthContext: Token refreshed');
        }
        
        setIsLoading(false);
      }
    );

    // Fallback timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log('AuthContext: Fallback timeout - setting isLoading to false');
        setIsLoading(false);
      }
    }, 5000);

    return () => {
      console.log('AuthContext: Cleaning up auth listener');
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [isLoading]);

  const login = async (email: string, password: string): Promise<boolean> => {
    console.log('AuthContext: Login attempt for:', email);
    try {
      const user = await loginUser(email, password);
      console.log('AuthContext: Login result:', user);
      if (user) {
        setUser(user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    console.log('AuthContext: Logging out');
    try {
      await logoutUser();
      setUser(null);
    } catch (error) {
      console.error('AuthContext: Logout error:', error);
    }
  };

  console.log('AuthContext: Current state:', { user: !!user, isLoading, hasInitialized });

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, hasInitialized }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 