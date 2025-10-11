'use client'

import { useEffect, useState } from 'react'
import { useAppState } from '@/lib/state'

interface DarkModeProviderProps {
  children: React.ReactNode
}

export function DarkModeProvider({ children }: DarkModeProviderProps) {
  const { state } = useAppState()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Prevent hydration mismatch and apply transitions only after mounting
    setMounted(true)
  }, [])

  useEffect(() => {
    // Apply dark mode class to html element
    if (state.darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [state.darkMode])

  // Add a class to prevent transition on page load
  useEffect(() => {
    if (mounted) {
      // Small delay to allow the initial render to complete
      const timeoutId = setTimeout(() => {
        document.documentElement.classList.add('theme-transition-ready')
      }, 100)

      return () => clearTimeout(timeoutId)
    }
  }, [mounted])

  return <>{children}</>
}
