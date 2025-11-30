"use client"

import { Button } from "@components/ui/button"
import DarkVeil from '@components/ui/DarkVeil';
// import Supabase client if you want to use Supabase auth
// import { supabase } from "@/app/supabaseClient";
import Link from "next/link";

export default function LandingPage() {
  // Replace with Supabase auth hooks or logic if needed
  // Example: const user = supabase.auth.getUser();
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      {/* Full-viewport veil background */}
      <div className="absolute inset-0 -z-10">
        <DarkVeil />
      </div>

      <div className="max-w-md w-full text-center relative z-10 text-white">
        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Welcome to AgoraLearn</h1>
          <p className="text-lg mb-8 text-white/80">
            Upload documents, ask questions, and get instant AI-powered answers
          </p>
        </div>

        {/* Auth Buttons - Replace with Supabase auth UI or custom logic */}
        <div className="space-y-6 w-full">
          <Button variant="outline" size="lg" className="w-full bg-transparent" asChild>
            <Link href="/sign-up">Sign Up / Sign In</Link>
          </Button>
        </div>

        {/* Footer Note */}
        <p className="text-sm mt-8 text-white/70">Sign in to access your dashboard and upload files</p>
      </div>
    </div>
  )
}
