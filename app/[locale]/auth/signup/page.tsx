'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Apple, Chrome } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) throw error

      // Redirect to login or show message to check email
      router.push(`/${locale}/auth/login?message=Check your email for confirmation`)
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
          {/* Left Column - Signup Form */}
          <div className="flex-1 bg-gradient-to-br from-[#fefce8] to-[#fff] p-8 lg:p-12 flex flex-col justify-between">
            {/* Logo */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">LMS SaaS</h1>
            </div>

            {/* Form Content */}
            <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Create an account</h2>
                <p className="text-gray-600">Join thousands of learners and start your educational journey</p>
              </div>

              <form onSubmit={handleSignup} className="space-y-6">
                <div>
                  <Label htmlFor="fullName" className="text-gray-700 font-medium">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-2 rounded-2xl border-gray-200 focus:border-yellow-400 focus:ring-yellow-400 h-12"
                    placeholder="Enter your full name"
                    autoComplete="off"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 rounded-2xl border-gray-200 focus:border-yellow-400 focus:ring-yellow-400 h-12"
                    placeholder="Enter your email"
                    autoComplete="off"
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
                      autoComplete="new-password"
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
                  {loading ? 'Creating account...' : 'Submit'}
                </Button>
              </form>

              {/* Social Sign Up */}
              <div className="mt-8">
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-2xl border-gray-200 h-12 hover:bg-gray-50"
                  >
                    <Apple className="w-5 h-5 mr-2" />
                    Apple
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-2xl border-gray-200 h-12 hover:bg-gray-50"
                  >
                    <Chrome className="w-5 h-5 mr-2" />
                    Google
                  </Button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-center items-center text-sm text-gray-500 mt-8">
              <a href={`/${locale}/auth/login`} className="hover:text-gray-700 transition-colors">
                Have any account? Sign in
              </a>
            </div>
          </div>

          {/* Right Column - Image with Floating Cards */}
          <div className="flex-1 relative bg-gray-900 min-h-[500px] lg:min-h-[700px]">
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop&crop=center')`
              }}
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/20" />

            {/* Floating Cards */}
            <div className="absolute inset-0 p-8 flex flex-col justify-between">
              {/* Top Cards */}
              <div className="space-y-4">
                {/* Task Card */}
                <div className="bg-yellow-400 text-black p-4 rounded-2xl shadow-lg backdrop-blur-sm max-w-xs">
                  <h3 className="font-semibold text-sm mb-1">Complete Course Module</h3>
                  <p className="text-xs opacity-80">Advanced JavaScript Fundamentals</p>
                </div>

                {/* Calendar Bar */}
                <div className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-lg max-w-xs">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-gray-700">Weekly Calendar</span>
                  </div>
                  <div className="flex gap-1">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                      <div
                        key={day}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                          index === 2 || index === 4
                            ? 'bg-yellow-400 text-black'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {day}
                      </div>
                    ))}
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
                    <h3 className="font-semibold text-sm text-gray-900">Study Group Session</h3>
                    <p className="text-xs text-gray-600">3:00pm–04:00pm</p>
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