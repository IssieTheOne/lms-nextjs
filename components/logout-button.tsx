'use client'

import { useRouter } from 'next/navigation'

interface LogoutButtonProps {
  locale: string
}

export function LogoutButton({ locale }: LogoutButtonProps) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const response = await fetch(`/api/logout?locale=${locale}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        // Force a hard refresh to clear all cached data
        window.location.href = `/${locale}/auth/login`
      } else {
        console.error('Logout failed')
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
    >
      Logout
    </button>
  )
}