"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { supabase } from "@/app/supabaseClient"
import DarkVeil from "@/components/ui/DarkVeil"

export default function SignUpPage() {
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
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) {
        // Optionally show error message
        console.error(error.message)
      } else {
        // Optionally redirect or show success message
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
        <h1 className="text-3xl font-semibold mb-2">Sign in to AgoraLearn</h1>
        <p className="text-white/80 mb-6">Upload documents, ask questions, and get instant AI-powered answers</p>

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
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden>
              <path fill="currentColor" d="M12.48 10.45v3.68h6.84c-.29 1.45-1.01 2.48-2.58 3.2v3.06h4.54c2.16-1.48 3.74-3.78 3.74-6.55 0-.5-.05-.98-.15-1.39H12.48z" />
              <path fill="currentColor" d="M9 18.9c.34 0 .68-.03 1.01-.1v-3.17H5.07v-3.68h4.93v-2.59c0-2.08.45-3.92 1.3-5.36H9c-3.35 0-6.3 2.57-6.3 5.76 0 3.19 2.95 5.76 6.3 5.76v3.38z" />
              <path fill="currentColor" d="M9 5.02v3.17h4.93V5.02c-.33-.07-.67-.1-1.01-.1-1.87 0-3.51.93-4.52 2.33-.32.5-.58 1.05-.79 1.63-.21.58-.35 1.2-.4 1.85v3.68h6.84v-3.68H9z" />
            </svg>
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
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Continue with GitHub
          </Button>
        </div>

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

          <div>
            <label htmlFor="password" className="block text-sm mb-1">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/20 rounded px-3 py-2 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
              placeholder="Your password"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="accent-white" />
              <span className="text-white/80">Remember me</span>
            </label>
            <Link href="/forgot-password" className="text-white/80 hover:underline">Forgot?</Link>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="text-sm mt-4 text-white/70">
          New here? <Link href="/register" className="underline">Create an account</Link>
        </p>
      </div>
    </div>
  )
}
