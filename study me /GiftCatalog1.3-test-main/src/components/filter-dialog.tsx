'use client'

import { useState, useEffect, useRef } from 'react'
import { useAppState } from '@/lib/state'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, X, Image as ImageIcon } from 'lucide-react'
import { getItems, getAttributes, getCollectionData } from '@/lib/api'
import { toast } from 'sonner'
import backdrops from '../../backdrops.json'
import useSWR from 'swr'
import { ModelThumbnail } from './ModelThumbnail'
const enc = encodeURIComponent

// Map database collection names to folder names
const folderNameMapping: Record<string, string> = {
  'Astral Shard': 'astral shard',
  'B-day Candle': 'b-day candle', 
  'Berry Box': 'berry box',
  'Bunny Muffin': 'bunny muffin',
  'Crystal Ball': 'crystal ball',
  'Diamond Ring': 'diamond ring',
  'Durov\'s Cap': 'durov\'s cap',
  'Electric Skull': 'electric skull',
  'Eternal Candle': 'eternal candle',
  'Eternal Rose': 'eternal rose',
  'Evil Eye': 'evil eye',
  'Flying Broom': 'flying broom',
  'Genie Lamp': 'genie lamp',
  'Ginger Cookie': 'ginger cookie',
  'Hanging Star': 'hanging star',
  'Hex Pot': 'hex pot',
  'Hypno Lollipop': 'hypno lollipop',
  'Ion Gem': 'ion gem',
  'Jelly Bunny': 'jelly bunny',
  'Jingle Bells': 'jingle bells',
  'Kissed Frog': 'kissed frog',
  'Loot Bag': 'loot bag',
  'Love Candle': 'love candle',
  'Love Potion': 'love potion',
  'Mad Pumpkin': 'mad pumpkin',
  'Magic Potion': 'magic potion',
  'Mini Oscar': 'mini oscar',
  'Perfume Bottle': 'perfume bottle',
  'Plush Pepe': 'plush pepe',
  'Precious Peach': 'precious peach',
  'Santa Hat': 'santa hat',
  'Scared Cat': 'scared cat',
  'Sharp Tongue': 'sharp tongue',
  'Signet Ring': 'signet ring',
  'Skull Flower': 'skull flower',
  'Snow Mittens': 'snow mittens',
  'Spiced Wine': 'spiced wine',
  'Spy Agaric': 'spy agaric',
  'Star Notepad': 'star notepad',
  'Swiss Watch': 'swiss watch',
  'Toy Bear': 'toy bear',
  'Trapped Heart': 'trapped heart',
  'Vintage Cigar': 'vintage cigar',
  'Voodoo Doll': 'voodoo doll',
  'Witch Hat': 'witch hat'
}

interface FilterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Helper to get the center color for a backdrop name
function getBackdropColor(name: string) {
  const found = backdrops.find(b => b.name.toLowerCase() === name.toLowerCase());
  return found ? found.hex.centerColor : '#ccc';
}

export function FilterDialog({ open, onOpenChange }: FilterDialogProps) {
  const { state, dispatch } = useAppState()
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string[]>>(
    { ...state.filters.attributes }
  )
  const [isApplying, setIsApplying] = useState(false)
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debugMode, setDebugMode] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({})

  // Debug function to toggle debug mode with 5 consecutive clicks
  const clickCount = useRef(0)
  const clickTimer = useRef<NodeJS.Timeout | null>(null)
  
  const handleDebugClick = () => {
    clickCount.current += 1
    
    if (clickTimer.current) {
      clearTimeout(clickTimer.current)
    }
    
    clickTimer.current = setTimeout(() => {
      clickCount.current = 0
    }, 1000)
    
    if (clickCount.current >= 5) {
      setDebugMode(prev => !prev)
      clickCount.current = 0
      toast.success(debugMode ? 'Debug mode disabled' : 'Debug mode enabled')
    }
  }

  // Get the model image path
  const getModelImagePath = (modelName: string) => {
    if (!state.collectionData?.giftName) return ''
    
    // Get the folder name corresponding to the current gift name
    const dbCollectionName = state.collectionData.giftName
    
    // The folder names should keep spaces, matching the format used by gifts.coffin.meme
    // e.g., "b-day candle" rather than "bdaycandle"
    const folderName = dbCollectionName.toLowerCase()
    
    // Properly encode both the folder name and model name for the URL
    const encodedFolderName = encodeURIComponent(folderName)
    const encodedModelName = encodeURIComponent(modelName)
    
    // Create the path to the image with proper URL encoding
    const imagePath = `/Gift Model Preview/${encodedFolderName}/${encodedModelName}.png`
    
    if (debugMode) {
      console.log('Collection name in DB:', dbCollectionName)
      console.log('Folder name for URL:', folderName)
      console.log('Encoded folder name:', encodedFolderName)
      console.log('Model name:', modelName)
      console.log('Encoded model name:', encodedModelName)
      console.log('Full image path:', imagePath)
    }
    
    return imagePath
  }

  // Update selected attributes when filters change
  useEffect(() => {
    setSelectedAttributes({ ...state.filters.attributes })
  }, [state.filters.attributes])

  // Focus search input when dialog opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Clear search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  // SWR for attributes
  const { data: swrAttributes, error: swrAttrError, isLoading: swrAttrLoading } = useSWR(
    open && state.collectionData?.giftName
      ? ['attributes', state.collectionData.giftName]
      : null,
    ([, giftName]) => getAttributes(giftName),
    { revalidateOnFocus: false, dedupingInterval: 1000 * 30 }
  )

  useEffect(() => {
    if (swrAttributes) {
      dispatch({ type: 'SET_ATTRIBUTES_WITH_PERCENTAGES', payload: swrAttributes })
    }
    if (swrAttrError) {
      toast.error(`Failed to load attributes: ${swrAttrError.message}`)
    }
  }, [swrAttributes, swrAttrError, dispatch])

  // SWR for preview filtered count
  const { data: swrFilteredCount, isLoading: swrCountLoading } = useSWR(
    open && state.collectionData?.giftName && Object.keys(selectedAttributes).length > 0
      ? [
          'filtered-count',
          state.collectionData.giftName,
          JSON.stringify(selectedAttributes),
          state.sortOption,
        ]
      : null,
    async ([, giftName, attributes, sort]) => {
      const result = await getItems(giftName, 1, 1, { attributes: JSON.parse(attributes) }, sort)
      return result.totalItems
    },
    { revalidateOnFocus: false, dedupingInterval: 1000 * 10 }
  )

  // Check if a trait value is selected
  const isSelected = (traitType: string, value: string) => {
    return selectedAttributes[traitType]?.includes(value) || false
  }

  // Toggle selection of a trait value
  const toggleAttribute = (traitType: string, value: string) => {
    setSelectedAttributes((prev) => {
      const newState = { ...prev }

      // Initialize the array if it doesn't exist
      if (!newState[traitType]) {
        newState[traitType] = []
      }

      // Toggle the value
      if (newState[traitType].includes(value)) {
        newState[traitType] = newState[traitType].filter(v => v !== value)
        // Clean up empty arrays
        if (newState[traitType].length === 0) {
          delete newState[traitType]
        }
      } else {
        newState[traitType] = [...newState[traitType], value]
      }

      return newState
    })
  }

  // Track image load errors
  const handleImageError = (traitType: string, value: string) => {
    setImageLoadErrors(prev => ({
      ...prev,
      [`${traitType}-${value}`]: true
    }))
    
    if (debugMode) {
      console.error(`Failed to load image for ${traitType}: ${value}`)
    }
  }

  // Apply the filters and fetch filtered items using optimized API
  const applyFilters = async () => {
    if (!state.collectionData?.giftName) return

    setIsApplying(true)
    try {
      // Update the filters in state
      dispatch({ type: 'SET_FILTERS', payload: { attributes: selectedAttributes } })

      // Fetch items with the new filters using optimized API
      const result = await getCollectionData(
        state.collectionData.giftName,
        1, // Reset to first page
        state.itemsPerPage,
        { attributes: selectedAttributes },
        state.sortOption,
        false // No need to fetch attributes again
      )

      // Update the collection data with filtered items
      dispatch({
        type: 'SET_COLLECTION_DATA',
        payload: result.collectionData
      })

      // Reset to page 1
      dispatch({ type: 'SET_CURRENT_PAGE', payload: 1 })

      // Close the dialog
      onOpenChange(false)

      // Show a toast with the number of items that matched the filter
      toast.success(`Filter applied: ${result.collectionData.totalItems} items found`)
    } catch (error) {
      console.error('Error applying filters:', error)
      toast.error(`Failed to apply filters: ${(error as Error).message}`)
    } finally {
      setIsApplying(false)
    }
  }

  // Clear all filters using optimized API
  const clearFilters = async () => {
    setSelectedAttributes({})

    if (!state.collectionData?.giftName) return

    setIsApplying(true)
    try {
      // Update the filters in state
      dispatch({ type: 'SET_FILTERS', payload: { attributes: {} } })

      // Fetch items with no filters using optimized API
      const result = await getCollectionData(
        state.collectionData.giftName,
        1,
        state.itemsPerPage,
        { attributes: {} },
        state.sortOption,
        false // No need to fetch attributes again
      )

      // Update the collection data
      dispatch({
        type: 'SET_COLLECTION_DATA',
        payload: result.collectionData
      })

      // Reset to page 1
      dispatch({ type: 'SET_CURRENT_PAGE', payload: 1 })

      // Close the dialog
      onOpenChange(false)

      toast.success('All filters cleared')
    } catch (error) {
      console.error('Error clearing filters:', error)
      toast.error(`Failed to clear filters: ${(error as Error).message}`)
    } finally {
      setIsApplying(false)
    }
  }

  // Calculate total selected filters
  const totalSelectedFilters = Object.values(selectedAttributes).reduce(
    (total, values) => total + values.length,
    0
  )

  // Filter attributes based on search query
  const filterAttributesByQuery = (traitType: string, values: Record<string, any>) => {
    if (!searchQuery) return { traitType, values, hasMatches: true };
    
    const lowercaseQuery = searchQuery.toLowerCase();
    const matchingValues = Object.entries(values).filter(([value]) => 
      value.toLowerCase().includes(lowercaseQuery)
    );
    
    const hasTraitTypeMatch = traitType.toLowerCase().includes(lowercaseQuery);
    
    return {
      traitType,
      values: Object.fromEntries(matchingValues),
      hasMatches: matchingValues.length > 0 || hasTraitTypeMatch,
      isTraitMatch: hasTraitTypeMatch
    };
  };

  // Get filtered attributes
  const filteredAttributes = Object.entries(state.attributesWithPercentages)
    .map(([traitType, values]) => filterAttributesByQuery(traitType, values))
    .filter(({ hasMatches }) => hasMatches || searchQuery === '');

  // Check if search has any results
  const hasSearchResults = filteredAttributes.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-h-[85vh] overflow-y-auto dark:bg-[#141415] dark:text-[#FFFFFF] dark:border-[#1f1f20]">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold mb-2" onClick={handleDebugClick}>Filter Attributes</SheetTitle>
        </SheetHeader>

        {/* Debug mode indicator */}
        {debugMode && (
          <div className="mb-4 p-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs rounded-md">
            <h4 className="font-bold">Debug Mode</h4>
            <p>Collection in DB: {state.collectionData?.giftName || 'None selected'}</p>
            <p>Folder name: {state.collectionData?.giftName ? 
              state.collectionData.giftName.toLowerCase() 
              : 'None'}</p>
            <p>Image errors: {Object.keys(imageLoadErrors).length}</p>
            <p>Selected filters: {totalSelectedFilters}</p>
            <div className="flex space-x-2 mt-2">
              <button 
                onClick={() => setImageLoadErrors({})} 
                className="px-2 py-1 bg-yellow-200 dark:bg-yellow-800 rounded text-xs"
              >
                Reset Error Cache
              </button>
              <button 
                onClick={() => {
                  if (state.collectionData?.giftName) {
                    const folderName = encodeURIComponent(state.collectionData.giftName.toLowerCase())
                    window.open(`/Gift Model Preview/${folderName}`, '_blank')
                  }
                }} 
                className="px-2 py-1 bg-yellow-200 dark:bg-yellow-800 rounded text-xs"
                disabled={!state.collectionData?.giftName}
              >
                Open Images Folder
              </button>
            </div>
          </div>
        )}

        {/* Search input */}
        <div className="relative mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search across all filters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 py-2 w-full bg-background dark:bg-gray-800 text-sm border border-border dark:border-gray-700 rounded-lg"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            onClick={clearFilters}
            disabled={isApplying || Object.keys(selectedAttributes).length === 0}
            className="text-xs dark:border-[#1f1f20] dark:bg-[#1c1c1d] dark:text-[#FFFFFF] dark:hover:bg-[#1f1f20]"
          >
            Clear All
          </Button>
        </div>

        {/* Filtered count info */}
        {swrFilteredCount !== null && totalSelectedFilters > 0 && (
          <div className="mb-4 p-2 bg-muted/20 dark:bg-[#1c1c1d] rounded-md text-sm">
            <span className="font-medium">{swrCountLoading ? 'Calculating...' : `${swrFilteredCount} gifts`}</span>
            <span className="text-muted-foreground dark:text-[#FFFFFF]/70"> match your selected filters</span>
          </div>
        )}

        {swrAttrLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative w-12 h-12">
              <div className="absolute top-0 left-0 w-8 h-8 border-4 border-t-indigo-500 dark:border-t-indigo-400 border-transparent rounded-full animate-spin">
              </div>
            </div>
            <p className="mt-4 text-gray-700 dark:text-[#FFFFFF] text-sm">Loading attributes...</p>
          </div>
        ) : Object.entries(state.attributesWithPercentages).length === 0 ? (
          <p className="text-gray-500 dark:text-[#FFFFFF]/80 text-sm py-4">
            No attributes available. Please select a collection first.
          </p>
        ) : !hasSearchResults && searchQuery ? (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-gray-500 dark:text-[#FFFFFF]/80 text-sm">
              No results found for "{searchQuery}"
            </p>
            <Button 
              variant="link" 
              onClick={() => setSearchQuery('')}
              className="text-indigo-500 dark:text-indigo-400 mt-2"
            >
              Clear search
            </Button>
          </div>
        ) : (
          <>
            {filteredAttributes.map(({ traitType, values, isTraitMatch }) => (
              <div key={traitType} className={`mb-6 ${isTraitMatch && searchQuery ? 'bg-muted/10 dark:bg-indigo-900/10 p-3 rounded-lg border border-indigo-500/20' : ''}`}>
                <h3 className="text-base font-semibold mb-3 text-gray-800 dark:text-[#FFFFFF]">
                  {traitType}
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-hide">
                  {Object.entries(values).map(([value, { count, percentage }]) => (
                    <div 
                      key={value} 
                      className={`flex items-center ${
                        searchQuery && value.toLowerCase().includes(searchQuery.toLowerCase())
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 p-1 rounded-lg'
                          : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        id={`${traitType}-${value}`}
                        checked={isSelected(traitType, value)}
                        onChange={() => toggleAttribute(traitType, value)}
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 dark:border-[#1f1f20] dark:bg-[#1c1c1d]"
                      />
                      <label
                        htmlFor={`${traitType}-${value}`}
                        className="ml-2 text-sm font-medium text-gray-700 dark:text-[#FFFFFF]/90 flex-grow flex items-center gap-2"
                      >
                        {traitType === 'Model' && !imageLoadErrors[`${traitType}-${value}`] && (
                          <ModelThumbnail
                            collectionName={state.collectionData?.giftName || ''}
                            modelName={value}
                            size="small"
                            onError={() => handleImageError(traitType, value)}
                          />
                        )}
                        {traitType === 'Model' && imageLoadErrors[`${traitType}-${value}`] && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              // Remove from error cache to try loading again
                              setImageLoadErrors(prev => {
                                const newErrors = {...prev};
                                delete newErrors[`${traitType}-${value}`];
                                return newErrors;
                              });
                            }}
                            className="min-w-6 w-6 h-6 mr-1 bg-gray-200 dark:bg-gray-700 rounded-sm flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none"
                            title="Image failed to load. Click to retry."
                          >
                            <ImageIcon className="w-4 h-4 text-gray-400" />
                          </button>
                        )}
                        {traitType === 'Backdrop' && (
                          <span className="inline-block w-5 h-5 rounded-full border border-gray-300 mr-2" style={{ background: getBackdropColor(value) }} />
                        )}
                        {value} ({percentage}%)
                        
                        {/* Debug information for image paths */}
                        {debugMode && traitType === 'Model' && (
                          <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                            [{getModelImagePath(value)}]
                          </span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Apply button at the bottom */}
        {totalSelectedFilters > 0 && (
          <div className="pt-4 mt-2 border-t border-border dark:border-[#1f1f20]">
            <Button
              onClick={applyFilters}
              disabled={isApplying || Object.keys(selectedAttributes).length === 0}
              className="w-full bg-card text-foreground border border-border dark:border-border/30"
            >
              Apply Filters {swrFilteredCount !== null && !swrCountLoading && `(${swrFilteredCount} gifts)`}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
