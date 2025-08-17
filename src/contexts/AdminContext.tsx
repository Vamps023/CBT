import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

interface AdminContextType {
  user: User | null
  isAdmin: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export const useAdmin = () => {
  const context = useContext(AdminContext)
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const checkAdminStatus = async (user: User | null) => {
    if (!user) {
      setIsAdmin(false)
      return
    }

    try {
      const { data, error } = await supabase.rpc('get_user_role')
      if (error) throw error
      setIsAdmin(data === 'admin')
    } catch (error) {
      console.error('Error checking admin status:', error)
      setIsAdmin(false)
    }
  }

  useEffect(() => {
    const initializeAuth = async () => {
      // Check active sessions and sets the user
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      await checkAdminStatus(session?.user ?? null)
      setLoading(false)

      // Listen for changes on auth state (logged in, signed out, etc.)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event: AuthChangeEvent, session: Session | null) => {
          setUser(session?.user ?? null)
          await checkAdminStatus(session?.user ?? null)
          setLoading(false)
        }
      )

      return () => {
        subscription.unsubscribe()
      }
    }

    initializeAuth()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      if (data.user) {
        // Verify admin role using RPC
        const { data: roleData, error: roleError } = await supabase.rpc('get_user_role')
        if (roleError) throw roleError

        if (roleData !== 'admin') {
          await supabase.auth.signOut()
          throw new Error('Access denied. Admin privileges required.')
        }
        
        setIsAdmin(true)
        setUser(data.user)
        toast.success('Successfully signed in as admin')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      const errorMessage = error.error_description || error.message || 'An error occurred during sign in'
      toast.error(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error(error.message)
      throw error
    }
    toast.success('Signed out successfully')
  }

  const value = {
    user,
    isAdmin,
    loading,
    signIn,
    signOut,
  }

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}