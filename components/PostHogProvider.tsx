'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client/client'
import { initPostHog } from '@/lib/posthog'
import { type User } from '@supabase/supabase-js'

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  useEffect(() => {
    const posthog = initPostHog()
    
    // Identify user when they're logged in
    if (user?.email) {
      posthog.identify(user.id, {
        email: user.email,
      })
    }
  }, [user])

  return <>{children}</>
} 