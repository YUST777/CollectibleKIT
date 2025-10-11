'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAppState } from '@/lib/state'
import { getCollectionData } from '@/lib/api'
import { toast } from 'sonner'

export function PerformanceToggle() {
  const { state, dispatch } = useAppState()
  const [isToggling, setIsToggling] = useState(false)

  const togglePerformanceMode = async () => {
    // Prevent multiple rapid toggles
    if (isToggling) return

    setIsToggling(true)

    try {
      // Toggle the performance mode state
      const newPerformanceMode = !state.performanceMode
      dispatch({ type: 'SET_PERFORMANCE_MODE', payload: newPerformanceMode })

      // If we have collection data, perform a smart refresh
      if (state.collectionData?.giftName) {
        // Use optimized endpoint to get all data in one request
        const result = await getCollectionData(
          state.collectionData.giftName,
          state.currentPage,
          state.itemsPerPage,
          state.filters,
          state.sortOption,
          true // Include attributes to refresh percentages
        )

        // Update the collection data
        dispatch({
          type: 'SET_COLLECTION_DATA',
          payload: result.collectionData,
        })

        // Update attributes with percentages if available
        if (Object.keys(result.attributes).length > 0) {
          dispatch({
            type: 'SET_ATTRIBUTES_WITH_PERCENTAGES',
            payload: result.attributes,
          })
        }

        toast.success(`${newPerformanceMode ? 'Enabled' : 'Disabled'} performance mode`)
      }
    } catch (error) {
      console.error('Error refreshing items after performance toggle:', error)
      toast.error(`Failed to refresh items: ${(error as Error).message}`)
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={togglePerformanceMode}
      disabled={isToggling}
      className={`w-8 h-8 p-0 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 hover:from-indigo-200 hover:to-purple-200 text-indigo-700 transition-all duration-300 shadow-sm ${
        state.performanceMode ? 'ring-2 ring-purple-400' : ''
      }`}
      title={`${state.performanceMode ? 'Disable' : 'Enable'} Performance Mode`}
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
          clipRule="evenodd"
        />
      </svg>
    </Button>
  )
}
