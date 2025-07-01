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

// Simple user storage - in production, you'd use a proper database
const USERS = [
  { id: '1', email: 'demo@example.com', password: 'demo123', name: 'Demo User' },
  { id: '2', email: 'family@example.com', password: 'family123', name: 'Family Account' },
]

export const loginUser = async (email: string, password: string): Promise<User | null> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  const user = USERS.find(u => u.email === email && u.password === password)
  
  if (user) {
    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword
  }
  
  return null
}

export const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null
  
  const stored = localStorage.getItem('travel-app-user')
  return stored ? JSON.parse(stored) : null
}

export const storeUser = (user: User): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem('travel-app-user', JSON.stringify(user))
}

export const clearStoredUser = (): void => {
  if (typeof window === 'undefined') return
  localStorage.removeItem('travel-app-user')
} 