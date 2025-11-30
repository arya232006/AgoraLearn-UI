"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import DarkVeil from "@/components/ui/DarkVeil"
import { supabase } from "@/app/supabaseClient"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (!email) {
      setError("Please enter your email address.")
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) {
        setError("Failed to send reset email. Please try again.")
        console.error("Supabase password reset error:", error)
      } else {
        setMessage("If an account exists for that email, a password reset link has been sent.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <div className="absolute inset-0 -z-10">
        <DarkVeil />
      </div>

      <div className="w-full max-w-md p-8 rounded-lg relative z-10 text-white">
        <h1 className="text-2xl font-semibold mb-2">Reset your password</h1>
        <p className="text-white/80 mb-6">
          Enter your email and we'll send a link to reset your password.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm mb-1">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/20 rounded px-3 py-2 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
              placeholder="you@example.com"
            />
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}
          {message && <p className="text-sm text-emerald-300">{message}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>
        </form>

        <p className="text-sm mt-4 text-white/70">
          Remembered your password? <Link href="/sign-up" className="underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
