'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const params = useParams()
  const locale = params.locale as string
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/${locale}/auth/reset-password`,
      })

      if (error) throw error

      setMessage('Check your email for the password reset link')
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
          {/* Left Column - Reset Form */}
          <div className="flex-1 bg-gradient-to-br from-[#fefce8] to-[#fff] p-8 lg:p-12 flex flex-col justify-between">
            {/* Logo */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">LMS SaaS</h1>
            </div>

            {/* Form Content */}
            <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Reset your password</h2>
                <p className="text-gray-600">Enter your email and we'll send you a reset link</p>
              </div>

              <form onSubmit={handleReset} className="space-y-6">
                <div>
                  <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 rounded-2xl border-gray-200 focus:border-yellow-400 focus:ring-yellow-400 h-12"
                    placeholder="Enter your email address"
                    autoComplete="email"
                    required
                  />
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                {message && (
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="text-green-700 text-sm">{message}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-2xl h-12 text-lg transition-all duration-200 transform hover:scale-[1.02]"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>

              {/* Email Icon */}
              <div className="mt-8 flex justify-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Mail className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-center items-center text-sm text-gray-500 mt-8">
              <a href={`/${locale}/auth/login`} className="hover:text-gray-700 transition-colors">
                Back to sign in
              </a>
            </div>
          </div>

          {/* Right Column - Image with Floating Cards */}
          <div className="flex-1 relative bg-gray-900 min-h-[500px] lg:min-h-[700px]">
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=600&fit=crop&crop=center')`
              }}
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/20" />

            {/* Floating Cards */}
            <div className="absolute inset-0 p-8 flex flex-col justify-between">
              {/* Top Cards */}
              <div className="space-y-4">
                {/* Security Card */}
                <div className="bg-yellow-400 text-black p-4 rounded-2xl shadow-lg backdrop-blur-sm max-w-xs">
                  <h3 className="font-semibold text-sm mb-1">Secure & Safe</h3>
                  <p className="text-xs opacity-80">Your data is protected</p>
                </div>

                {/* Support Card */}
                <div className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-lg max-w-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">?</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-900">Need Help?</h3>
                      <p className="text-xs text-gray-600">Contact our support team</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Card */}
              <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg max-w-xs">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                      <span className="text-white text-xs font-bold">24</span>
                    </div>
                    <div className="w-8 h-8 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                      <span className="text-white text-xs font-bold">7</span>
                    </div>
                    <div className="w-8 h-8 bg-purple-500 rounded-full border-2 border-white flex items-center justify-center">
                      <span className="text-white text-xs font-bold">365</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900">Support Available</h3>
                    <p className="text-xs text-gray-600">24/7 customer service</p>
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