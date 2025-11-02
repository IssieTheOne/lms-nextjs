"use client"

import { createClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardPage() {
  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        redirect('/en/auth/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const role = profile?.role || 'student'

      // Redirect to role-specific dashboard
      switch (role) {
        case 'admin':
          redirect('/en/dashboard/admin')
        case 'teacher':
          redirect('/en/dashboard/teacher')
        case 'parent':
          redirect('/en/dashboard/parent')
        default:
          redirect('/en/dashboard/student')
      }
    }

    fetchProfile()
  }, [])

  return <div>Redirecting...</div>
}