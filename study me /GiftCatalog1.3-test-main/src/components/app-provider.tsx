'use client'

import { useReducer, useEffect, useState } from 'react'
import {
  AppStateContext,
  appReducer,
  initialState,
  loadPersistedState
} from '@/lib/state'
import React, { createContext, useContext } from 'react'

interface AppProviderProps {
  children: React.ReactNode
}

export const LanguageContext = createContext({
  language: 'en',
  setLanguage: (lang: string) => {},
})

export function useLanguage() {
  return useContext(LanguageContext)
}

export function AppProvider({ children }: AppProviderProps) {
  // This will store whether we're on the client side or not
  const [hydrated, setHydrated] = useState(false)

  // Initialize with the base initialState only
  const [state, dispatch] = useReducer(
    appReducer,
    initialState
  )

  const [language, setLanguage] = useState('en')

  // Handle client-side initialization and load persisted state after hydration
  useEffect(() => {
    // This runs on the client only, once
    const persistedState = loadPersistedState()

    // Apply each persisted state property individually to avoid race conditions
    if (persistedState.performanceMode !== undefined) {
      dispatch({ type: 'SET_PERFORMANCE_MODE', payload: persistedState.performanceMode })
    }

    if (persistedState.darkMode !== undefined) {
      dispatch({ type: 'SET_DARK_MODE', payload: persistedState.darkMode })
    }

    if (persistedState.filters) {
      dispatch({ type: 'SET_FILTERS', payload: persistedState.filters })
    }

    if (persistedState.itemsPerPage) {
      dispatch({ type: 'SET_ITEMS_PER_PAGE', payload: persistedState.itemsPerPage })
    }

    // Mark as hydrated
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lang = localStorage.getItem('language')
      if (lang) setLanguage(lang)
    }
  }, [])

  const handleSetLanguage = (lang: string) => {
    setLanguage(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang)
    }
  }

  // Fetch collections list after hydration
  useEffect(() => {
    if (!hydrated) return;
    (async () => {
      try {
        const result = await import('@/lib/api').then(mod => mod.listExports());
        if (result && result.db) {
          dispatch({ type: 'SET_GIFTS', payload: result.db });
        }
      } catch (error) {
        console.error('Failed to load collections list:', error);
      }
    })();
  }, [hydrated]);

  // This ensures that the UI doesn't flicker before the client-side state is loaded
  if (!hydrated) {
    // Return a placeholder or null while we wait for hydration
    return null
  }

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage }}>
        {children}
      </LanguageContext.Provider>
    </AppStateContext.Provider>
  )
}
