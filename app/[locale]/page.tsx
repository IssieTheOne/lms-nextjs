import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

interface HomePageProps {
  params: Promise<{ locale: string }>
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // This should be handled by middleware, but just in case
    redirect(`/${locale}/auth/login`)
  }

  // Redirect authenticated users to their dashboard
  redirect(`/${locale}/dashboard`)
}
