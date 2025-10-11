'use client'

import { useEffect } from 'react'
import { getTelegramWebApp } from '@/lib/telegram'
import { useAppState } from '@/lib/state'
import { validateInitData } from '@/lib/api'
import { toast } from 'sonner'

interface ClientBodyProps {
  children: React.ReactNode
}

export function ClientBody({ children }: ClientBodyProps) {
  const { state, dispatch } = useAppState()
  const tg = getTelegramWebApp()

  useEffect(() => {
    // Initialize Telegram Web App
    tg.ready()
    tg.expand()

    // Validate Telegram user
    const validateTelegramUser = async () => {
      if (tg.initData) {
        try {
          const result = await validateInitData(tg.initData)
          if (result.valid) {
            dispatch({ type: 'SET_TELEGRAM_USER', payload: tg.initDataUnsafe.user || null })
            toast.success(`Welcome, ${tg.initDataUnsafe.user?.first_name || 'User'}!`)
          } else {
            toast.error('Failed to validate Telegram user')
          }
        } catch (error) {
          console.error('Error validating Telegram init data:', error)
          toast.error('Failed to validate Telegram user')
        }
      }
    }

    // Ignore Telegram theme parameters to keep site styling consistent

    // Apply dark mode if enabled in state
    if (state.darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    validateTelegramUser()
  }, [dispatch, tg, state.darkMode])

  return <>{children}</>
}
