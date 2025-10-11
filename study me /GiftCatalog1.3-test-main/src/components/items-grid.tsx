'use client'

import { useEffect, useState, useCallback, useRef, memo } from 'react'
import { useAppState } from '@/lib/state'
import { getItems, getCollectionData } from '@/lib/api'
import { Item } from '@/lib/db'
import { ItemCard } from '@/components/item-card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useCollectionData } from '@/hooks/use-collection-data'

// Memoize the ItemCard component to prevent unnecessary re-renders
const MemoizedItemCard = memo(ItemCard);

export function ItemsGrid() {
  const { state, dispatch } = useAppState()
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isFilterChange, setIsFilterChange] = useState(false)
  const prevFilters = useRef(state.filters)
  const prevSortOption = useRef(state.sortOption)

  // Use SWR for collection data
  const {
    data: swrData,
    error: swrError,
    isLoading: swrLoading,
    mutate: mutateCollectionData,
  } = useCollectionData({
    giftName: state.collectionData?.giftName || localStorage.getItem('lastGift') || undefined,
    page: state.currentPage,
    limit: state.itemsPerPage,
    filters: state.filters,
    sort: state.sortOption,
    includeAttributes: true,
    enabled: Boolean(state.collectionData?.giftName || localStorage.getItem('lastGift')),
  })

  // Update state when SWR data changes
  useEffect(() => {
    if (swrData) {
      dispatch({ type: 'SET_COLLECTION_DATA', payload: swrData.collectionData })
      if (Object.keys(swrData.attributes).length > 0) {
        dispatch({ type: 'SET_ATTRIBUTES_WITH_PERCENTAGES', payload: swrData.attributes })
      }
      setIsInitialLoad(false)
      setIsFilterChange(false)
    }
  }, [swrData, dispatch])

  // Handle errors
  useEffect(() => {
    if (swrError) {
      toast.error(`Failed to load items: ${swrError.message}`)
    }
  }, [swrError])

  // Detect changes in filters
  useEffect(() => {
    if (!isInitialLoad) {
      const currentFiltersJson = JSON.stringify(state.filters)
      const prevFiltersJson = JSON.stringify(prevFilters.current)
      if (currentFiltersJson !== prevFiltersJson) {
        setIsFilterChange(true)
        prevFilters.current = state.filters
      }
    }
  }, [state.filters, isInitialLoad])

  // Detect changes in sort option
  useEffect(() => {
    if (!isInitialLoad && state.sortOption !== prevSortOption.current) {
      setIsFilterChange(true)
      prevSortOption.current = state.sortOption
    }
  }, [state.sortOption, isInitialLoad])

  // Building the loading skeleton
  const renderLoadingSkeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {Array.from({ length: state.itemsPerPage }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <Skeleton className="aspect-square w-full" />
          <div className="p-4">
            <Skeleton className="h-4 w-3/4 mb-2" />
          </div>
        </div>
      ))}
    </div>
  )

  if (swrLoading) {
    return renderLoadingSkeleton()
  }

  if (!state.collectionData || state.collectionData.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-md backdrop-filter backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90">
        <p className="text-gray-700 dark:text-gray-200 text-base font-semibold">No items found</p>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {Object.keys(state.filters.attributes).length > 0
            ? "Try adjusting your filter criteria"
            : "Try selecting a different collection"}
        </p>
      </div>
    )
  }

  return (
    <div key={state.collectionData?.giftName || 'no-collection'} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {state.collectionData.items.map((item) => (
        <MemoizedItemCard key={`${item.id}-${state.collectionData?.giftName || 'no-collection'}`} item={item} />
      ))}
    </div>
  )
}
