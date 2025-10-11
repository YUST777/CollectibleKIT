'use client'

import { useState } from 'react'
import { useAppState } from '@/lib/state'
import { Button } from '@/components/ui/button'
import { getItems } from '@/lib/api'
import { toast } from 'sonner'

// Available sort options
type SortOption = { value: string; label: string }
const sortOptions: SortOption[] = [
  { value: 'id-asc', label: 'ID (Ascending)' },
  { value: 'id-desc', label: 'ID (Descending)' },
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
]

export function SortingOptions() {
  const { state, dispatch } = useAppState()
  const [isLoading, setIsLoading] = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  const handleSortChange = async (sortOption: string) => {
    if (!state.collectionData?.giftName) return

    setIsLoading(true)
    try {
      // Update sort option in state
      dispatch({ type: 'SET_SORT_OPTION', payload: sortOption })

      // Load items with the new sort option
      const result = await getItems(
        state.collectionData.giftName,
        state.currentPage,
        state.itemsPerPage,
        state.filters,
        sortOption
      )

      // Update the collection data
      dispatch({
        type: 'SET_COLLECTION_DATA',
        payload: {
          giftName: state.collectionData.giftName,
          items: result.items,
          totalItems: result.totalItems,
          totalPages: result.totalPages,
        },
      })

      // Hide the sort options dropdown
      setShowOptions(false)

      toast.success(`Sorted by: ${sortOptions.find(opt => opt.value === sortOption)?.label || sortOption}`)
    } catch (error) {
      console.error('Error applying sort:', error)
      toast.error(`Failed to sort: ${(error as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Since we removed all sorting options, we'll just return null
  return null
}
