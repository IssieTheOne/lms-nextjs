'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      router.push(`/${locale}/dashboard`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-7xl rounded-3xl shadow-2xl overflow-hidden bg-white">
        <div className="flex flex-col lg:flex-row min-h-[700px]">
          {/* Left Column - Login Form */}
          <div className="flex-1 bg-gradient-to-br from-[#fefce8] to-[#fff] p-8 lg:p-12 flex flex-col justify-between">
            {/* Logo */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">LMS SaaS</h1>
            </div>

            {/* Form Content */}
            <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
                <p className="text-gray-600">Continue your learning journey</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 rounded-2xl border-gray-200 focus:border-yellow-400 focus:ring-yellow-400 h-12"
                    placeholder="Enter your email"
                    autoComplete="email"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                  <div className="relative mt-2">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="rounded-2xl border-gray-200 focus:border-yellow-400 focus:ring-yellow-400 h-12 pr-12"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <Button
                  type="submit"
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-2xl h-12 text-lg transition-all duration-200 transform hover:scale-[1.02]"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              {/* Forgot Password Link */}
              <div className="mt-6 text-center">
                <a href={`/${locale}/auth/forgot-password`} className="text-gray-600 hover:text-gray-800 transition-colors">
                  Forgot your password?
                </a>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-center items-center text-sm text-gray-500 mt-8">
              <a href={`/${locale}/auth/signup`} className="hover:text-gray-700 transition-colors">
                Don't have an account? Sign up
              </a>
            </div>
          </div>

          {/* Right Column - Image with Floating Cards */}
          <div className="flex-1 relative bg-gray-900 min-h-[500px] lg:min-h-[700px]">
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop&crop=center')`
              }}
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/20" />

            {/* Floating Cards */}
            <div className="absolute inset-0 p-8 flex flex-col justify-between">
              {/* Top Cards */}
              <div className="space-y-4">
                {/* Progress Card */}
                <div className="bg-yellow-400 text-black p-4 rounded-2xl shadow-lg backdrop-blur-sm max-w-xs">
                  <h3 className="font-semibold text-sm mb-1">Course Progress</h3>
                  <p className="text-xs opacity-80">85% completed this week</p>
                </div>

                {/* Achievement Card */}
                <div className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-lg max-w-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                      <span className="text-black font-bold text-sm">🏆</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-900">Achievement Unlocked!</h3>
                      <p className="text-xs text-gray-600">First Course Completed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Card */}
              <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg max-w-xs">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full border-2 border-white"></div>
                    <div className="w-8 h-8 bg-green-500 rounded-full border-2 border-white"></div>
                    <div className="w-8 h-8 bg-purple-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900">Live Webinar</h3>
                    <p className="text-xs text-gray-600">7:00pm–08:00pm</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}