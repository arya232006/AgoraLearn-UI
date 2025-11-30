
"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@components/ui/button"
import { supabase } from "@app/supabaseClient"
import DarkVeil from "@components/ui/DarkVeil"

export default function RegisterPage() {
    const router = useRouter();

    useEffect(() => {
      const checkUser = async () => {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          router.push("/dashboard");
        }
      };
      checkUser();
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          router.push("/dashboard");
        }
      });
      return () => {
        listener?.subscription?.unsubscribe();
      };
    }, [router]);
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }
      })
      if (error) {
        setError(error.message)
      } else {
        setError(null)
        // Optionally redirect or show success message
      }
    } catch (err) {
      setError("Registration failed")
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
        <h1 className="text-2xl font-semibold mb-2">Create your account</h1>
        <p className="text-white/80 mb-6">Join AgoraLearn to upload documents and get AI-powered answers.</p>

        <div className="space-y-3 mb-4">
          <Button
            variant="outline"
            size="lg"
            className="w-full bg-transparent text-white"
            onClick={async () => {
              setOauthLoading(true)
              await supabase.auth.signInWithOAuth({ provider: "google" })
              setOauthLoading(false)
            }}
            disabled={oauthLoading}
          >
            Continue with Google
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full bg-transparent text-white"
            onClick={async () => {
              setOauthLoading(true)
              await supabase.auth.signInWithOAuth({ provider: "github" })
              setOauthLoading(false)
            }}
            disabled={oauthLoading}
          >
            Continue with GitHub
          </Button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm mb-1">Full name</label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/20 rounded px-3 py-2 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
              placeholder="Your name"
            />
          </div>

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

          <div>
            <label htmlFor="password" className="block text-sm mb-1">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/20 rounded px-3 py-2 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
              placeholder="Create a password"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm mb-1">Confirm password</label>
            <input
              id="confirm"
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full bg-white/5 border border-white/20 rounded px-3 py-2 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
              placeholder="Confirm password"
            />
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p className="text-sm mt-4 text-white/70">
          Already have an account? <Link href="/sign-up" className="underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}