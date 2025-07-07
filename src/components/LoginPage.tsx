"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Map, Globe, Loader2, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const { login, logout } = useAuth()

  // Clear any existing session when login page loads
  useEffect(() => {
    const clearSession = async () => {
      console.log('LoginPage: Clearing any existing session')
      try {
        await logout()
        console.log('LoginPage: Session cleared')
      } catch (error) {
        console.log('LoginPage: No session to clear or error:', error)
      }
    }
    clearSession()
  }, [logout])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Validate required fields
    if (!email.trim()) {
      setError('Email is required')
      return
    }
    
    if (!password.trim()) {
      setError('Password is required')
      return
    }
    
    if (isLoginMode) {
      setIsLoggingIn(true)
      console.log('LoginPage: Attempting login with:', email, password)
      const success = await login(email, password)
      console.log('LoginPage: Login result:', success)
      if (!success) {
        setError('Invalid email or password')
      }
      setIsLoggingIn(false)
    } else {
      // Sign up flow
      if (!name.trim()) {
        setError('Name is required')
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
      
      setIsSigningUp(true)
      try {
        console.log('Starting signup process for:', email)
        
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name.trim()
            }
          }
        })

        if (signUpError) {
          console.error('Signup error:', signUpError)
          setError(signUpError.message)
        } else if (data.user) {
          console.log('User created successfully:', data.user.id)
          
          // The database trigger should automatically create the user profile
          // Wait a moment for the trigger to execute
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          // Verify the profile was created
          const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single()

          if (profileError || !profileData) {
            console.error('Profile verification failed:', profileError)
            setError('Account created but profile setup failed. Please try logging in.')
          } else {
            console.log('Profile verified successfully')
            setError('Account created successfully! Please check your email to verify your account.')
            // Switch to login mode
            setIsLoginMode(true)
            setPassword('')
          }
        }
      } catch (error) {
        console.error('Sign up error:', error)
        setError('An error occurred during sign up. Please try again.')
      } finally {
        setIsSigningUp(false)
      }
    }
  }

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode)
    setError('')
    setEmail('')
    setPassword('')
    setName('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-blue-600 rounded-full">
              <Map className="w-8 h-8 text-white" />
            </div>
            <Globe className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Travel Map</h1>
          <p className="text-gray-600">Plan and remember your family adventures</p>
        </div>

        {/* Login/Signup Card */}
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {isLoginMode ? 'Welcome Back' : 'Create Account'}
            </CardTitle>
            <CardDescription>
              {isLoginMode 
                ? 'Sign in to access your travel memories and plans'
                : 'Join us to start planning your next adventure'
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLoginMode && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLoginMode}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoggingIn || isSigningUp || !email.trim() || !password.trim()}
              >
                {isLoggingIn || isSigningUp ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isLoginMode ? 'Signing In...' : 'Creating Account...'}
                  </>
                ) : (
                  isLoginMode ? 'Sign In' : 'Create Account'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={toggleMode}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {isLoginMode 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Sign in"
                }
              </button>
            </div>

            {/* Demo Accounts */}
            {isLoginMode && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Demo Accounts</h3>
                <div className="space-y-1 text-xs text-blue-700">
                  <p><strong>Demo User:</strong> demo@example.com / demo123</p>
                  <p><strong>Family Account:</strong> family@example.com / family123</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Perfect for families to plan and remember their travel adventures together
          </p>
        </div>
      </div>
    </div>
  )
} 