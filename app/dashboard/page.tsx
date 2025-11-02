import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/en/auth/login')
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