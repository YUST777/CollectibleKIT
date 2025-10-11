'use client'

import { useState, useEffect } from 'react'
import { useAppState } from '@/lib/state'
import { Button } from '@/components/ui/button'
import { CollectionSelector } from '@/components/collection-selector'
import { ItemsPerPage } from '@/components/items-per-page'
import { ItemsGrid } from '@/components/items-grid'
import { getItems, getAttributes, getStats, getCollectionData } from '@/lib/api'
import { toast } from 'sonner'
import { FilterDialog } from '@/components/filter-dialog'
import { useCollectionData } from '@/hooks/use-collection-data'

export function CatalogSection() {
  const { state, dispatch } = useAppState()
  const [isLoading, setIsLoading] = useState(false)
  const [filterDialogOpen, setFilterDialogOpen] = useState(false)

  // Check if any filters are active
  const hasActiveFilters = Object.keys(state.filters.attributes).length > 0

  // Get the total number of selected filter values
  const totalFilterValues = Object.values(state.filters.attributes).reduce(
    (total, values) => total + values.length,
    0
  )

  // Flatten the active filters for display
  const activeFiltersList = Object.entries(state.filters.attributes).flatMap(
    ([trait, values]) => values.map(value => ({ trait, value }))
  )

  // Use SWR for collection data
  const { mutate: mutateCollectionData } = useCollectionData({
    giftName: state.collectionData?.giftName,
    page: 1,
    limit: state.itemsPerPage,
    filters: { attributes: {} },
    sort: state.sortOption,
    includeAttributes: true,
    enabled: Boolean(state.collectionData?.giftName),
  })

  const handleRefresh = async () => {
    if (!state.collectionData?.giftName) return
    try {
      await mutateCollectionData()
      toast.success(`Refreshed items for "${state.collectionData.giftName}"`)
    } catch (error) {
      console.error(`Error refreshing items for ${state.collectionData?.giftName}:`, error)
      toast.error(`Failed to refresh items: ${(error as Error).message}`)
    }
  }

  const handleClearFilters = async () => {
    if (!state.collectionData?.giftName) return

    setIsLoading(true)
    try {
      // Clear filters
      dispatch({ type: 'SET_FILTERS', payload: { attributes: {} } })

      // Load collection data - using optimized endpoint
      const result = await getCollectionData(
        state.collectionData.giftName,
        1,
        state.itemsPerPage,
        { attributes: {} },
        state.sortOption,
        true
      )

      // Update collection data
      dispatch({
        type: 'SET_COLLECTION_DATA',
        payload: result.collectionData,
      })

      // Reset current page
      dispatch({ type: 'SET_CURRENT_PAGE', payload: 1 })

      // Set attributes
      if (Object.keys(result.attributes).length > 0) {
        dispatch({
          type: 'SET_ATTRIBUTES_WITH_PERCENTAGES',
          payload: result.attributes,
        })
      }

      toast.success('All filters cleared')
    } catch (error) {
      console.error('Error clearing filters:', error)
      toast.error(`Failed to clear filters: ${(error as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Remove a single filter chip
  const handleRemoveFilter = async (trait: string, value: string) => {
    if (!state.collectionData?.giftName) return

    // Create a copy of the current filters
    const newFilters = { ...state.filters.attributes }

    // Remove the specific value from the trait array
    if (newFilters[trait]) {
      newFilters[trait] = newFilters[trait].filter(v => v !== value)

      // If the trait has no more values, remove it entirely
      if (newFilters[trait].length === 0) {
        delete newFilters[trait]
      }

      setIsLoading(true)
      try {
        // Update the filters state
        dispatch({
          type: 'SET_FILTERS',
          payload: { attributes: newFilters }
        })

        // Load collection data - using optimized endpoint
        const result = await getCollectionData(
          state.collectionData.giftName,
          1,
          state.itemsPerPage,
          { attributes: newFilters },
          state.sortOption,
          true
        )

        // Update collection data
        dispatch({
          type: 'SET_COLLECTION_DATA',
          payload: result.collectionData,
        })

        // Reset current page
        dispatch({ type: 'SET_CURRENT_PAGE', payload: 1 })

        // Set attributes
        if (Object.keys(result.attributes).length > 0) {
          dispatch({
            type: 'SET_ATTRIBUTES_WITH_PERCENTAGES',
            payload: result.attributes,
          })
        }

        toast.success(`Removed filter: ${trait} - ${value}`)
      } catch (error) {
        console.error('Error updating filters:', error)
        toast.error(`Failed to update filters: ${(error as Error).message}`)
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-center mb-4 bg-card border border-border dark:border-border/30 rounded-xl shadow-md p-4 backdrop-filter backdrop-blur-lg bg-opacity-90 dark:bg-opacity-60">
        <div className="w-full md:w-auto flex-grow">
          <CollectionSelector />
        </div>
        <div className="w-full md:w-auto flex flex-wrap gap-2">
          <ItemsPerPage />
        </div>
        <div className="w-full md:w-auto flex flex-col gap-2 flex-1">
          <Button onClick={() => setFilterDialogOpen(true)} variant="gradient">
            Filters {totalFilterValues > 0 ? `(${totalFilterValues})` : ''}
          </Button>
          <FilterDialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen} />
        </div>
        <div className="flex w-full sm:w-auto gap-2">
          {/* refresh button removed */}
        </div>
      </div>
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-card dark:bg-muted/10 rounded-xl shadow-sm border border-border dark:border-border/20">
          <p className="text-xs text-muted-foreground dark:text-muted-foreground mr-2 flex items-center">Active Filters:</p>
          {activeFiltersList.map(({ trait, value }, index) => (
            <div
              key={`${trait}-${value}-${index}`}
              className="flex items-center rounded-full bg-muted/20 dark:bg-muted/20 px-3 py-1 text-xs text-foreground dark:text-foreground"
            >
              <span className="font-medium mr-1">{trait}:</span> {value}
              <button
                onClick={() => handleRemoveFilter(trait, value)}
                className="ml-1.5 text-muted-foreground hover:text-destructive dark:text-muted-foreground dark:hover:text-destructive focus:outline-none"
                title={`Remove ${trait}: ${value} filter`}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          ))}

          <button
            onClick={handleClearFilters}
            className="flex items-center rounded-full bg-muted/20 dark:bg-muted/10 px-2 py-1 text-xs text-muted-foreground dark:text-muted-foreground hover:bg-destructive/10 dark:hover:bg-destructive/20 hover:text-destructive dark:hover:text-destructive-foreground transition-colors duration-200"
          >
            Clear All
            <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 bg-card dark:bg-muted/10 rounded-xl shadow-md backdrop-filter backdrop-blur-lg bg-opacity-90 dark:bg-opacity-60 border border-border dark:border-border/20">
          <div className="relative w-16 h-16">
            <div
              className="absolute top-0 left-0 w-8 h-8 border-4 border-t-accent dark:border-t-accent border-transparent rounded-full animate-spin"
              style={{ animationDuration: '1.5s' }}
            ></div>
          </div>
          <p className="mt-6 text-foreground dark:text-foreground text-base font-semibold">Loading items...</p>
          <p className="text-muted-foreground dark:text-muted-foreground text-sm mt-1">This may take a moment</p>
        </div>
      ) : (
        <ItemsGrid />
      )}
    </div>
  )
}
