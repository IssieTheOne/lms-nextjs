"use client"

import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/en/auth/login')
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
          router.push('/en/dashboard/admin')
          break
        case 'teacher':
          router.push('/en/dashboard/teacher')
          break
        case 'parent':
          router.push('/en/dashboard/parent')
          break
        default:
          router.push('/en/dashboard/student')
          break
      }
    }

    fetchProfile()
  }, [router])

  return <div>Redirecting...</div>
}