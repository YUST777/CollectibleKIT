'use client'

import { Button } from '@/components/ui/button'
import { useAppState } from '@/lib/state'
import { getItems, getCollectionData } from '@/lib/api'
import { toast } from 'sonner'
import { useState, useRef } from 'react'
import { useCollectionData } from '@/hooks/use-collection-data'

export function Pagination() {
  const { state, dispatch } = useAppState()
  const [isLoading, setIsLoading] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Use SWR for collection data (must be before any return)
  const { mutate: mutateCollectionData } = useCollectionData({
    giftName: state.collectionData?.giftName,
    page: state.currentPage,
    limit: state.itemsPerPage,
    filters: state.filters,
    sort: state.sortOption,
    includeAttributes: false,
    enabled: Boolean(state.collectionData?.giftName),
  })

  // If there are no items or only one page, don't show pagination
  if (!state.collectionData || state.collectionData.totalItems <= state.itemsPerPage) {
    return null
  }

  const handlePageChange = async (newPage: number) => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: newPage })
    try {
      await mutateCollectionData()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      toast.error(`Failed to load page: ${(error as Error).message}`)
    }
  }

  const handlePrevPage = async () => {
    if (state.currentPage <= 1 || !state.collectionData?.giftName || isLoading) return

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create a new abort controller for this request
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    try {
      // Use optimized API
      const result = await getCollectionData(
        state.collectionData.giftName,
        state.currentPage - 1,
        state.itemsPerPage,
        state.filters,
        state.sortOption,
        false, // Don't need attributes on page change
        { signal: abortControllerRef.current.signal }
      )

      // Update collection data
      dispatch({
        type: 'SET_COLLECTION_DATA',
        payload: result.collectionData,
      })

      // Scroll to top on page change
      window.scrollTo({ top: 0, behavior: 'smooth' })

      // Update current page
      dispatch({ type: 'SET_CURRENT_PAGE', payload: state.currentPage - 1 })
    } catch (error) {
      // Only show error if it's not due to abortion
      if ((error as Error).name !== 'AbortError') {
        console.error(`Error loading previous page for ${state.collectionData.giftName}:`, error)
        toast.error(`Failed to load previous page: ${(error as Error).message}`)
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleNextPage = async () => {
    if (
      !state.collectionData ||
      state.currentPage >= state.collectionData.totalPages ||
      !state.collectionData.giftName ||
      isLoading
    ) {
      return
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create a new abort controller for this request
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    try {
      // Use optimized API
      const result = await getCollectionData(
        state.collectionData.giftName,
        state.currentPage + 1,
        state.itemsPerPage,
        state.filters,
        state.sortOption,
        false, // Don't need attributes on page change
        { signal: abortControllerRef.current.signal }
      )

      // Update collection data
      dispatch({
        type: 'SET_COLLECTION_DATA',
        payload: result.collectionData,
      })

      // Scroll to top on page change
      window.scrollTo({ top: 0, behavior: 'smooth' })

      // Update current page
      dispatch({ type: 'SET_CURRENT_PAGE', payload: state.currentPage + 1 })
    } catch (error) {
      // Only show error if it's not due to abortion
      if ((error as Error).name !== 'AbortError') {
        console.error(`Error loading next page for ${state.collectionData.giftName}:`, error)
        toast.error(`Failed to load next page: ${(error as Error).message}`)
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  return (
    <div className="flex justify-center items-center mt-6 bg-card dark:bg-muted/10 p-4 rounded-xl shadow-md border border-border dark:border-border/20 dark:shadow-card">
      <div className="flex items-center justify-center space-x-4">
        <Button
          variant="default"
          onClick={handlePrevPage}
          disabled={state.currentPage === 1 || isLoading}
          className="w-12 h-12 p-0 rounded-full bg-card text-foreground border border-border dark:border-border/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-sm hover-glow"
          aria-label="Previous page"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </Button>

        <div className="text-foreground dark:text-foreground text-sm font-medium px-4 py-2 bg-muted/10 dark:bg-muted/20 rounded-lg min-w-[100px] text-center">
          Page <span className="dark:gradient-text">{state.currentPage}</span> of <span className="dark:gradient-text">{state.collectionData.totalPages}</span>
        </div>

        <Button
          variant="default"
          onClick={handleNextPage}
          disabled={state.currentPage === state.collectionData.totalPages || isLoading}
          className="w-12 h-12 p-0 rounded-full bg-card text-foreground border border-border dark:border-border/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-sm hover-glow"
          aria-label="Next page"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </Button>
      </div>
    </div>
  )
}
