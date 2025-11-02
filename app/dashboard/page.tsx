import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
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
      redirect('/dashboard/admin')
    case 'teacher':
      redirect('/dashboard/teacher')
    case 'parent':
      redirect('/dashboard/parent')
    default:
      redirect('/dashboard/student')
  }
}