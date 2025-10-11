'use client'

import { useEffect } from 'react'
import { useAppState } from '@/lib/state'

export function ClientStyleEffects() {
  const { state } = useAppState()

  useEffect(() => {
    // Apply dark mode class to html element
    if (state.darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // Add theme transition class after initial render
    const timeoutId = setTimeout(() => {
      document.documentElement.classList.add('theme-transition-ready')
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [state.darkMode])

  return null
} 