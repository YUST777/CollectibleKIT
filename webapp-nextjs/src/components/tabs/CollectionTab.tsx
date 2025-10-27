import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet';
import { ModelThumbnail } from '@/components/ModelThumbnail';
import { PatternThumbnail } from '@/components/PatternThumbnail';
import { AdsBanner } from '@/components/AdsBanner';
import { cacheUtils } from '@/lib/cache';
import { useAppActions, useAppStore, useCurrentTab } from '@/store/useAppStore';
import { Backdrop, GiftModel, GiftDesign, FilterOption, Pattern } from '@/types';
import { XMarkIcon, ChevronLeftIcon, MagnifyingGlassIcon, HeartIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { Lightbulb, Coins, FolderOpen, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { hapticFeedback } from '@/lib/telegram';
import { useTelegram } from '@/components/providers/TelegramProvider';

export const CollectionTab: React.FC = () => {
  const { webApp, user: telegramUser } = useTelegram();
  const { gifts, backdrops, giftModels, patterns, gridSize, userDesigns, savedCollections, user } = useAppStore();
  const { setGifts, setBackdrops, setGiftModels, setPatterns, setGridSize, setGiftDesign, setUserDesigns, saveCollection, loadCollection, loadCollections, deleteCollection, setNavigationLevel, setCurrentSubTab, setCurrentTertiaryTab } = useAppActions();

  const [isLoading, setIsLoading] = useState(true);
  const [currentSlot, setCurrentSlot] = useState<number | null>(null);
  const [currentDesign, setCurrentDesign] = useState<GiftDesign | null>(null);
  const [selectedGiftName, setSelectedGiftName] = useState<string | null>(null);
  const [selectedModelNumber, setSelectedModelNumber] = useState<number | null>(null);
  const [selectedBackdropIndex, setSelectedBackdropIndex] = useState<number | null>(null);
  const [selectedPatternIndex, setSelectedPatternIndex] = useState<number | null>(null);
  const [models, setModels] = useState<GiftModel[]>([]);
  const [localPatterns, setLocalPatterns] = useState<Pattern[]>([]);
  const [isPreloadingImages, setIsPreloadingImages] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [collectionName, setCollectionName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  
  // Ideas functionality
  const [showIdeas, setShowIdeas] = useState(false);
  const [publicCollections, setPublicCollections] = useState<any[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [likingCollections, setLikingCollections] = useState<Set<string>>(new Set());

  // Filter modal states
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [currentFilterType, setCurrentFilterType] = useState<'gift' | 'model' | 'backdrop' | 'pattern' | null>(null);
  const [currentFilterData, setCurrentFilterData] = useState<FilterOption[]>([]);
  const [filterSearchTerm, setFilterSearchTerm] = useState('');
  const [drawerSearchTerm, setDrawerSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [ribbonNumber, setRibbonNumber] = useState<number>(1);
  const [useRealGift, setUseRealGift] = useState(false);

  // Helper function to map gift names to image file names
  const getGiftImagePath = (giftName: string): string => {
    // Handle special cases - map API gift names to file names
    const nameMap: { [key: string]: string } = {
      'Jack in the Box': 'Jack_in_the_Box',
      'Jack-in-the-Box': 'Jack_in_the_Box',
      'B Day Candle': 'B_Day_Candle',
      'B-Day Candle': 'B_Day_Candle',
      'Westside Sign': 'WestsideSign',
      'Snoop Dogg': 'SnoopDogg',
      'Swag Bag': 'SwagBag',
      'Snoop Cigar': 'SnoopCigar',
      'Low Rider': 'LowRider',
      'Durov\'s Cap': 'Durovs_Cap',
      'Durovs Cap': 'Durovs_Cap',
    };
    
    // Use mapped name if exists, otherwise replace spaces with underscores
    const filename = nameMap[giftName] || giftName.replace(/\s+/g, '_');
    return `/assets/gifts/${filename}.png`;
  };

  // Drag and drop states
  const [draggedSlot, setDraggedSlot] = useState<number | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [boxPositions, setBoxPositions] = useState<{ [key: number]: { x: number; y: number } }>({});
  const [isDragging, setIsDragging] = useState(false);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasMovedRef = useRef<boolean>(false);

  // Load saved positions from localStorage
  useEffect(() => {
    const savedPositions = localStorage.getItem('giftBoxPositions');
    if (savedPositions) {
      try {
        setBoxPositions(JSON.parse(savedPositions));
      } catch (error) {
        console.error('Failed to load box positions:', error);
      }
    }
  }, []);

  // Save positions to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(boxPositions).length > 0) {
      localStorage.setItem('giftBoxPositions', JSON.stringify(boxPositions));
    }
  }, [boxPositions]);

  // Cleanup touch timer on unmount
  useEffect(() => {
    return () => {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
      }
    };
  }, []);

  // Load initial data with caching
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        console.log('🔄 Loading collection data...');
        
        // Load gifts and backdrops in parallel using cache with timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );
        
        const dataPromise = Promise.all([
          cacheUtils.getGifts(),
          cacheUtils.getBackdrops(),
        ]);

        const [giftsData, backdropsData] = await Promise.race([dataPromise, timeoutPromise]) as [string[], any[]];

        setGifts(giftsData.map((name: string) => ({ name })));
        setBackdrops(backdropsData);
        
        console.log('✅ Collection data loaded successfully');
      } catch (error) {
        console.error('❌ Error loading collection data:', error);
        
        // Provide fallback data to prevent infinite loading
        console.log('🔄 Using fallback data...');
        setGifts([
          { name: 'Duck' },
          { name: 'Cat' },
          { name: 'Dog' },
          { name: 'Rabbit' },
          { name: 'Bear' }
        ]);
        
        setBackdrops([
          { name: 'Blue', centerColor: 0, edgeColor: 0, patternColor: 0, textColor: 0, rarityPermille: 0, hex: { centerColor: '#3b82f6', edgeColor: '#1e40af', patternColor: '#3b82f6', textColor: '#ffffff' } },
          { name: 'Purple', centerColor: 0, edgeColor: 0, patternColor: 0, textColor: 0, rarityPermille: 0, hex: { centerColor: '#8b5cf6', edgeColor: '#5b21b6', patternColor: '#8b5cf6', textColor: '#ffffff' } },
          { name: 'Pink', centerColor: 0, edgeColor: 0, patternColor: 0, textColor: 0, rarityPermille: 0, hex: { centerColor: '#ec4899', edgeColor: '#be185d', patternColor: '#ec4899', textColor: '#ffffff' } },
          { name: 'Green', centerColor: 0, edgeColor: 0, patternColor: 0, textColor: 0, rarityPermille: 0, hex: { centerColor: '#10b981', edgeColor: '#047857', patternColor: '#10b981', textColor: '#ffffff' } },
          { name: 'Orange', centerColor: 0, edgeColor: 0, patternColor: 0, textColor: 0, rarityPermille: 0, hex: { centerColor: '#f59e0b', edgeColor: '#d97706', patternColor: '#f59e0b', textColor: '#ffffff' } }
        ]);
        
        toast.error('Using offline mode - limited features available');
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
    
    // Load saved collections
    loadCollections();
  }, [setGifts, setBackdrops, loadCollections]);

  // Load models when a gift is selected with caching
  useEffect(() => {
    const loadModels = async () => {
      if (selectedGiftName) {
        try {
          console.log(`🔄 Loading models for ${selectedGiftName}...`);
          
          // Load model data first (text/metadata)
          const modelsData = await cacheUtils.getGiftModels(selectedGiftName);
          setGiftModels(selectedGiftName, modelsData);
          setModels(modelsData);
          
          console.log(`✅ Loaded ${modelsData.length} models for ${selectedGiftName}`);
          
          // Preload images in the background
          setIsPreloadingImages(true);
          const imageUrls = modelsData.slice(0, 10).map(model => 
            `https://cdn.changes.tg/gifts/models/${encodeURIComponent(selectedGiftName)}/png/${encodeURIComponent(model.name)}.png`
          );
          
          try {
            await cacheUtils.preloadImages(imageUrls);
            console.log('✅ Preloaded first 10 model images');
          } catch (error) {
            console.log('⚠️ Some images failed to preload:', error);
          } finally {
            setIsPreloadingImages(false);
          }
        } catch (error) {
          console.error(`❌ Error loading models for ${selectedGiftName}:`, error);
          toast.error('Failed to load models.');
        }
      } else {
        setModels([]);
      }
    };
    loadModels();
  }, [selectedGiftName, setGiftModels]);

  // Load patterns when a gift is selected with caching
  useEffect(() => {
    const loadPatterns = async () => {
      if (selectedGiftName) {
        try {
          console.log(`🎨 Loading patterns for ${selectedGiftName}...`);
          
          // Load pattern data first (text/metadata)
          const patternsData = await cacheUtils.getGiftPatterns(selectedGiftName);
          
          // Store in global state
          setPatterns(selectedGiftName, patternsData);
          
          // Also set in local state for immediate use
          setLocalPatterns(patternsData);
          
          console.log(`✅ Loaded ${patternsData.length} patterns for ${selectedGiftName}`);
          console.log('🎨 First few patterns:', patternsData.slice(0, 5));
        } catch (error) {
          console.error(`❌ Error loading patterns for ${selectedGiftName}:`, error);
          toast.error('Failed to load patterns.');
          setLocalPatterns([]);
        }
      } else {
        setLocalPatterns([]);
      }
    };
    loadPatterns();
  }, [selectedGiftName, setPatterns]);

  // Debug: Track userDesigns state changes
  useEffect(() => {
    console.log('🔄 CollectionTab: userDesigns state changed', {
      userDesigns,
      slotCount: Object.keys(userDesigns).length,
      slots: Object.keys(userDesigns).map(key => ({ slot: key, hasDesign: !!userDesigns[parseInt(key)] }))
    });
  }, [userDesigns]);

  // Load collections on mount
  useEffect(() => {
    loadCollections();
  }, []);

  // Load patterns when switching to Ideas view
  useEffect(() => {
    if (showIdeas && publicCollections.length > 0) {
      // Load patterns for all unique gift names in public collections
      const uniqueGiftNames = Array.from(new Set(publicCollections.flatMap(c => 
        c.designs.map((d: GiftDesign) => d.giftName)
      )));
      
      uniqueGiftNames.forEach(giftName => {
        if (!localPatterns[giftName] || !Array.isArray(localPatterns[giftName]) || localPatterns[giftName].length === 0) {
          // Load patterns for this gift name
          fetch(`/api/collection/gifts/${encodeURIComponent(giftName)}/patterns`)
            .then(response => response.json())
            .then(data => {
              if (data.patterns) {
                setLocalPatterns(prev => ({
                  ...prev,
                  [giftName]: data.patterns
                }));
              }
            })
            .catch(error => console.error('Error loading patterns:', error));
        }
      });
    }
  }, [showIdeas, publicCollections]);

  const updateGridSize = (newSize: number) => {
    console.log('📐 Updating grid size:', {
      oldSize: gridSize,
      newSize,
      currentDesigns: userDesigns
    });
    
    setGridSize(newSize);
    // Clear designs that exceed the new grid size
    const newDesigns: Record<number, GiftDesign> = {};
    for (let i = 1; i <= newSize; i++) {
      if (userDesigns[i]) {
        newDesigns[i] = userDesigns[i];
      }
    }
    
    console.log('📐 Filtered designs for new grid size:', {
      newDesigns,
      removedDesigns: Object.keys(userDesigns).filter(key => parseInt(key) > newSize)
    });
    
    setUserDesigns(newDesigns);
  };

  const openGiftDesigner = (slotNumber: number) => {
    setCurrentSlot(slotNumber);
    const existingDesign = userDesigns[slotNumber];
    if (existingDesign) {
      setCurrentDesign(existingDesign);
      setSelectedGiftName(existingDesign.giftName);
      setSelectedModelNumber(existingDesign.modelNumber);
      setSelectedBackdropIndex(existingDesign.backdropIndex);
      setSelectedPatternIndex(existingDesign.patternIndex || null);
    } else {
      setCurrentDesign(null);
      setSelectedGiftName(null);
      setSelectedModelNumber(null);
      setSelectedBackdropIndex(null);
      setSelectedPatternIndex(null);
    }
    
    // Set ribbon number and real gift state from existing design if available
    setRibbonNumber(existingDesign?.ribbonNumber || 1);
    setUseRealGift(existingDesign?.isRealGift || false);
    
    // Open the filter drawer directly with "gift" tab selected
    setCurrentFilterType('gift');
    setCurrentFilterData(gifts.map(gift => ({ name: gift.name, type: 'gift' as const })));
    setIsFilterModalOpen(true);
    hapticFeedback('selection');
  };

  const openFilterModal = (filterType: 'gift' | 'model' | 'backdrop' | 'pattern') => {
    setCurrentFilterType(filterType);
    
    if (filterType === 'gift') {
      setCurrentFilterData(gifts.map(gift => ({ name: gift.name, type: 'gift' as const })));
    } else if (filterType === 'model') {
      setCurrentFilterData(models.map(model => ({ 
        name: model.name, 
        type: 'model' as const, 
        number: model.number || 0
      })));
    } else if (filterType === 'backdrop') {
      setCurrentFilterData(backdrops.map((backdrop, index) => ({ 
        name: backdrop.name, 
        type: 'backdrop' as const, 
        index, 
        hex: backdrop.hex 
      })));
    } else if (filterType === 'pattern') {
      console.log('🎨 Opening pattern filter with patterns:', localPatterns);
      setCurrentFilterData(localPatterns.map((pattern, index) => ({ 
        name: pattern.name, 
        type: 'pattern' as const, 
        index, 
        rarityPermille: pattern.rarityPermille 
      })));
    }
    
    setIsFilterModalOpen(true);
    hapticFeedback('selection');
  };

  const closeFilterModal = () => {
    setIsFilterModalOpen(false);
    setCurrentFilterType(null);
    setCurrentFilterData([]);
    setDrawerSearchTerm('');
    setCurrentSlot(null);
    setCurrentDesign(null);
    setSelectedGiftName(null);
    setSelectedModelNumber(null);
    setSelectedBackdropIndex(null);
    setSelectedPatternIndex(null);
    setModels([]);
    setLocalPatterns([]);
  };

  const selectFilterOption = (item: FilterOption) => {
    hapticFeedback('impact');
    
    if (currentFilterType === 'gift') {
      setSelectedGiftName(item.name);
      setCurrentDesign(prev => ({ 
        giftName: item.name, 
        modelNumber: prev?.modelNumber || 0, 
        backdropIndex: prev?.backdropIndex || 0,
        backdropName: prev?.backdropName || ''
      }));
      setSelectedModelNumber(null);
      setModels([]);
    } else if (currentFilterType === 'model' && item.number !== undefined) {
      setSelectedModelNumber(item.number);
      setCurrentDesign(prev => ({ 
        giftName: prev?.giftName || '', 
        modelNumber: item.number || 0, 
        backdropIndex: prev?.backdropIndex || 0,
        backdropName: prev?.backdropName || ''
      }));
    } else if (currentFilterType === 'backdrop' && item.index !== undefined) {
      setSelectedBackdropIndex(item.index);
      setCurrentDesign(prev => ({ 
        giftName: prev?.giftName || '', 
        modelNumber: prev?.modelNumber || 0, 
        backdropIndex: item.index || 0,
        backdropName: prev?.backdropName || '',
        patternIndex: prev?.patternIndex,
        patternName: prev?.patternName
      }));
    } else if (currentFilterType === 'pattern' && item.index !== undefined) {
      setSelectedPatternIndex(item.index);
      setCurrentDesign(prev => ({ 
        giftName: prev?.giftName || '', 
        modelNumber: prev?.modelNumber || 0, 
        backdropIndex: prev?.backdropIndex || 0,
        backdropName: prev?.backdropName || '',
        patternIndex: item.index || 0,
        patternName: item.name
      }));
    }
    
    // Don't close the drawer - keep it open for more selections
  };

  const saveGiftDesign = () => {
    if (currentSlot && selectedGiftName) {
      // For real gifts, we only need giftName and ribbonNumber
      if (useRealGift) {
        if (!ribbonNumber) {
          toast.error('Please enter a gift number');
          return;
        }
        
        const newDesign: GiftDesign = {
          giftName: selectedGiftName,
          modelNumber: 0, // Not used for real gifts
          backdropIndex: 0, // Not used for real gifts
          backdropName: '', // Not used for real gifts
          ribbonNumber: ribbonNumber,
          isRealGift: true
        };
        
        console.log('💾 Saving real gift design:', {
          slot: currentSlot,
          design: newDesign,
          currentDesigns: userDesigns
        });
        
        setGiftDesign(currentSlot, newDesign);
        closeFilterModal();
        hapticFeedback('notification');
        toast.success('Real gift saved!');
      } else {
        // For custom gifts, we need all fields
        if (selectedModelNumber !== null && selectedBackdropIndex !== null) {
          const newDesign: GiftDesign = {
            giftName: selectedGiftName,
            modelNumber: selectedModelNumber,
            backdropIndex: selectedBackdropIndex,
            backdropName: backdrops[selectedBackdropIndex]?.name || '',
            patternIndex: selectedPatternIndex || undefined,
            patternName: selectedPatternIndex !== null ? localPatterns[selectedPatternIndex]?.name : undefined,
            ribbonNumber: ribbonNumber || undefined,
            isRealGift: false
          };
          
          console.log('💾 Saving custom gift design:', {
            slot: currentSlot,
            design: newDesign,
            currentDesigns: userDesigns
          });
          
          setGiftDesign(currentSlot, newDesign);
          closeFilterModal();
          hapticFeedback('notification');
          toast.success('Custom gift saved!');
        } else {
          toast.error('Please select all required fields');
        }
      }
    } else {
      toast.error('Please select a gift');
    }
  };


  const handleSaveCollection = async () => {
    if (!collectionName.trim()) {
      toast.error('Please enter a collection name');
      return;
    }

    // Convert userDesigns to array
    const designs = Object.values(userDesigns);
    
    if (designs.length === 0) {
      toast.error('No designs to save');
      return;
    }

    try {
      const success = await saveCollection(collectionName.trim(), designs, isPublic);
      
      if (success) {
        const message = isPublic 
          ? 'Collection saved and shared publicly! 🌟' 
          : 'Collection saved successfully!';
        toast.success(message);
        setIsSaveModalOpen(false);
        setCollectionName('');
        setIsPublic(false);
      }
    } catch (error) {
      console.error('Save collection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save collection';
      toast.error(errorMessage);
    }
  };

  const handleLoadCollection = (collectionId: string) => {
    loadCollection(collectionId);
    setIsLoadModalOpen(false);
    toast.success('Collection loaded successfully!');
  };

  const handleDeleteCollection = async (collectionId: string) => {
    try {
      const response = await fetch('/api/collection/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId })
      });
      
      if (response.ok) {
        deleteCollection(collectionId);
        toast.success('Collection deleted successfully!');
      } else {
        toast.error('Failed to delete collection');
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast.error('Failed to delete collection');
    }
  };

  // Ideas functionality
  const loadPublicCollections = async () => {
    try {
      setIdeasLoading(true);
      
      // Ensure backdrop data is loaded for proper rendering
      if (!backdrops || Object.keys(backdrops).length === 0) {
        console.log('🎨 Loading backdrops for Community Ideas...');
        const backdropsResponse = await fetch('/api/collection/backdrops');
        if (backdropsResponse.ok) {
          const backdropsData = await backdropsResponse.json();
          console.log('🎨 Loaded backdrops for Community Ideas:', Object.keys(backdropsData.backdrops).length);
          setBackdrops(backdropsData.backdrops);
        } else {
          console.error('❌ Failed to load backdrops for Community Ideas');
        }
      } else {
        console.log('🎨 Backdrops already loaded for Community Ideas:', Object.keys(backdrops).length);
      }
      
      const response = await fetch('/api/collections/public');
      if (response.ok) {
        const data = await response.json();
        const collections = data.collections || [];
        setPublicCollections(collections);
        
        // Load gift models for unique gift names in public collections
        const uniqueGiftNames = Array.from(new Set(collections.flatMap((collection: any) => 
          collection.designs?.map((design: any) => design.giftName) || []
        ))) as string[];
        
        console.log('🎁 Loading gift models for Community Ideas:', uniqueGiftNames);
        
        for (const giftName of uniqueGiftNames) {
          if (!giftModels[giftName]) {
            try {
              const modelsResponse = await fetch(`/api/collection/gifts/${encodeURIComponent(giftName)}/models`);
              if (modelsResponse.ok) {
                const modelsData = await modelsResponse.json();
                setGiftModels(giftName, modelsData.models);
                console.log(`✅ Loaded ${modelsData.models.length} models for ${giftName}`);
              }
            } catch (error) {
              console.error(`❌ Failed to load models for ${giftName}:`, error);
            }
          }
        }
      } else {
        console.error('Failed to load public collections');
      }
    } catch (error) {
      console.error('Error loading public collections:', error);
    } finally {
      setIdeasLoading(false);
    }
  };

  const handleLike = async (collectionId: string) => {
    if (likingCollections.has(collectionId)) return;
    
    try {
      setLikingCollections(prev => new Set(prev).add(collectionId));
        hapticFeedback('selection');
      
      const response = await fetch('/api/collections/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Update the collection in state
        setPublicCollections(prev => 
          prev.map(collection => 
            collection.id === collectionId 
              ? { 
                  ...collection, 
                  isLikedByUser: result.liked,
                  likesCount: result.likesCount 
                }
              : collection
          )
        );
        
              hapticFeedback(result.liked ? 'impact' : 'selection');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setLikingCollections(prev => {
        const newSet = new Set(prev);
        newSet.delete(collectionId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, slotNumber: number) => {
    setDraggedSlot(slotNumber);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', slotNumber.toString());
  };

  const handleDragOver = (e: React.DragEvent, slotNumber: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot(slotNumber);
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = (e: React.DragEvent, targetSlot: number) => {
    e.preventDefault();
    const sourceSlot = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (sourceSlot !== targetSlot) {
      // Swap designs
      const sourceDesign = userDesigns[sourceSlot];
      const targetDesign = userDesigns[targetSlot];
      
      const newDesigns = { ...userDesigns };
      newDesigns[sourceSlot] = targetDesign;
      newDesigns[targetSlot] = sourceDesign;
      
      setUserDesigns(newDesigns);
    }
    
    setDraggedSlot(null);
    setDragOverSlot(null);
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent, slotNumber: number) => {
    // Prevent default to avoid conflicts
    e.preventDefault();
    
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    hasMovedRef.current = false;
    
    // Set up long press detection - after 300ms, enable drag mode
    touchTimerRef.current = setTimeout(() => {
      if (!hasMovedRef.current && !isDragging) {
        setDraggedSlot(slotNumber);
        setIsDragging(true);
        
        // Haptic feedback
        hapticFeedback('impact');
        
        // Visual feedback
        const element = e.currentTarget as HTMLElement;
        if (element) {
          element.style.transform = 'scale(1.05)';
          element.style.opacity = '0.8';
          element.style.zIndex = '1000';
          element.classList.add('dragging');
        }
      }
    }, 300);
    
    // Track movement
    const handleTouchMove = (moveEvent: TouchEvent) => {
      const currentTouch = moveEvent.touches[0];
      const deltaX = Math.abs(currentTouch.clientX - startX);
      const deltaY = Math.abs(currentTouch.clientY - startY);
      
      if (deltaX > 10 || deltaY > 10) {
        hasMovedRef.current = true;
      }
    };
    
    const handleTouchEnd = () => {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
      
      // If not moved and not dragging, it's a click - open editor
      if (!hasMovedRef.current && !isDragging) {
        openGiftDesigner(slotNumber);
      }
      
      // If was dragging but didn't complete a move, reset
      if (isDragging && draggedSlot === slotNumber) {
        const element = e.currentTarget as HTMLElement;
        if (element) {
          element.style.transform = '';
          element.style.opacity = '';
          element.style.zIndex = '';
          element.classList.remove('dragging');
        }
        setDraggedSlot(null);
        setIsDragging(false);
      }
      
      hasMovedRef.current = false;
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { once: true });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || draggedSlot === null) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (element) {
      const slotElement = element.closest('[data-slot]');
      if (slotElement) {
        const targetSlot = parseInt(slotElement.getAttribute('data-slot') || '0');
        if (targetSlot !== draggedSlot) {
          setDragOverSlot(targetSlot);
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging || draggedSlot === null) return;
    
    e.preventDefault();
    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (element) {
      const slotElement = element.closest('[data-slot]');
      if (slotElement) {
        const targetSlot = parseInt(slotElement.getAttribute('data-slot') || '0');
        if (targetSlot !== draggedSlot) {
          // Swap designs
          const sourceDesign = userDesigns[draggedSlot];
          const targetDesign = userDesigns[targetSlot];
          
          const newDesigns = { ...userDesigns };
          newDesigns[draggedSlot] = targetDesign;
          newDesigns[targetSlot] = sourceDesign;
          
          setUserDesigns(newDesigns);
          
          hapticFeedback('notification', 'success');
        }
      }
    }
    
    // Reset visual feedback
    const allSlotElements = document.querySelectorAll('[data-slot]');
    allSlotElements.forEach(el => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.transform = '';
      htmlEl.style.opacity = '';
      htmlEl.style.zIndex = '';
      htmlEl.classList.remove('dragging');
    });
    
    setDraggedSlot(null);
    setDragOverSlot(null);
    setIsDragging(false);
  };

  const handleDeleteBox = (slotNumber: number) => {
    const newDesigns = { ...userDesigns };
    delete newDesigns[slotNumber];
    setUserDesigns(newDesigns);
    
    // Remove position data
    const newPositions = { ...boxPositions };
    delete newPositions[slotNumber];
    setBoxPositions(newPositions);
  };

  const renderGiftPreview = (design: GiftDesign, index: number) => {
    if (!design) return null;
    
    // Debug logging for gift preview rendering
    console.log('🎨 Rendering gift preview:', {
      giftName: design.giftName,
      modelNumber: design.modelNumber,
      giftModelsCount: giftModels[design.giftName]?.length || 0,
      foundModel: giftModels[design.giftName]?.find(m => m.number === design.modelNumber)?.name || 'Not found'
    });
    
    // Get backdrop color - use global backdrops or fallback
    const backdropColor = backdrops && backdrops[design.backdropIndex] 
      ? backdrops[design.backdropIndex] 
      : design.backdropIndex !== undefined 
        ? `hsl(${(design.backdropIndex * 137.5) % 360}, 70%, 60%)` // Generate color from index
        : '#667eea';
    
    return (
      <div key={index} className="relative w-full h-full aspect-square rounded-lg overflow-hidden border border-black">
        {/* Background with gradient */}
        <div 
          className="absolute inset-0 rounded-lg"
          style={{
            background: backdrops && design.backdropIndex !== undefined && backdrops[design.backdropIndex] 
              ? `radial-gradient(circle, ${backdrops[design.backdropIndex].hex?.centerColor || '#667eea'}, ${backdrops[design.backdropIndex].hex?.edgeColor || '#764ba2'})`
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }}
        />
        
        {/* Pattern overlay if selected - 8 pattern layout */}
        {design.patternName && design.patternIndex !== null && design.patternIndex !== undefined && localPatterns && localPatterns[design.patternIndex] && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Top center */}
            <div
              className="absolute top-2 left-1/2 transform -translate-x-1/2"
              style={{
                width: '8px',
                height: '8px',
                backgroundImage: `url(https://cdn.changes.tg/gifts/patterns/${encodeURIComponent(design.giftName)}/png/${encodeURIComponent(design.patternName)}.png)`,
                backgroundSize: '8px 8px',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                filter: 'brightness(0) opacity(0.15)',
              }}
            />
            {/* Top left */}
            <div
              className="absolute top-4 left-2"
              style={{
                width: '6px',
                height: '6px',
                backgroundImage: `url(https://cdn.changes.tg/gifts/patterns/${encodeURIComponent(design.giftName)}/png/${encodeURIComponent(design.patternName)}.png)`,
                backgroundSize: '6px 6px',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                filter: 'brightness(0) opacity(0.15)',
              }}
            />
            {/* Top right */}
            <div
              className="absolute top-4 right-2"
              style={{
                width: '6px',
                height: '6px',
                backgroundImage: `url(https://cdn.changes.tg/gifts/patterns/${encodeURIComponent(design.giftName)}/png/${encodeURIComponent(design.patternName)}.png)`,
                backgroundSize: '6px 6px',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                filter: 'brightness(0) opacity(0.15)',
              }}
            />
            {/* Middle left */}
            <div
              className="absolute top-1/2 left-2 transform -translate-y-1/2"
              style={{
                width: '6px',
                height: '6px',
                backgroundImage: `url(https://cdn.changes.tg/gifts/patterns/${encodeURIComponent(design.giftName)}/png/${encodeURIComponent(design.patternName)}.png)`,
                backgroundSize: '6px 6px',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                filter: 'brightness(0) opacity(0.15)',
              }}
            />
            {/* Middle right */}
            <div
              className="absolute top-1/2 right-2 transform -translate-y-1/2"
              style={{
                width: '6px',
                height: '6px',
                backgroundImage: `url(https://cdn.changes.tg/gifts/patterns/${encodeURIComponent(design.giftName)}/png/${encodeURIComponent(design.patternName)}.png)`,
                backgroundSize: '6px 6px',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                filter: 'brightness(0) opacity(0.15)',
              }}
            />
            {/* Bottom left */}
            <div
              className="absolute bottom-4 left-2"
              style={{
                width: '6px',
                height: '6px',
                backgroundImage: `url(https://cdn.changes.tg/gifts/patterns/${encodeURIComponent(design.giftName)}/png/${encodeURIComponent(design.patternName)}.png)`,
                backgroundSize: '6px 6px',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                filter: 'brightness(0) opacity(0.15)',
              }}
            />
            {/* Bottom right */}
            <div
              className="absolute bottom-4 right-2"
              style={{
                width: '6px',
                height: '6px',
                backgroundImage: `url(https://cdn.changes.tg/gifts/patterns/${encodeURIComponent(design.giftName)}/png/${encodeURIComponent(design.patternName)}.png)`,
                backgroundSize: '6px 6px',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                filter: 'brightness(0) opacity(0.15)',
              }}
            />
            {/* Bottom center */}
            <div
              className="absolute bottom-2 left-1/2 transform -translate-x-1/2"
              style={{
                width: '6px',
                height: '6px',
                backgroundImage: `url(https://cdn.changes.tg/gifts/patterns/${encodeURIComponent(design.giftName)}/png/${encodeURIComponent(design.patternName)}.png)`,
                backgroundSize: '6px 6px',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                filter: 'brightness(0) opacity(0.15)',
              }}
            />
          </div>
        )}
        
        {/* Gift image */}
        <div className="absolute inset-3 flex items-center justify-center z-20">
          {giftModels[design.giftName]?.find(m => m.number === design.modelNumber)?.name ? (
            <ModelThumbnail
              collectionName={design.giftName}
              modelName={giftModels[design.giftName]?.find(m => m.number === design.modelNumber)?.name || ''}
              size="large"
              className="w-full h-full"
              showFallback={true}
            />
          ) : (
            <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500">
              {design.giftName}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderGiftSlot = (slotNumber: number) => {
    const design = userDesigns[slotNumber];
    
    // Debug: Log what's being rendered for each slot
    if (design) {
      console.log(`🎨 Rendering slot ${slotNumber}:`, {
        design,
        hasGiftName: !!design.giftName,
        hasModelNumber: design.modelNumber !== undefined,
        hasBackdropIndex: design.backdropIndex !== undefined
      });
    }
    
    const isDragged = draggedSlot === slotNumber;
    const isDragOver = dragOverSlot === slotNumber;
    
    return (
      <div 
        key={slotNumber} 
        className="gift-slot relative"
        data-slot={slotNumber}
        onTouchStart={(e) => handleTouchStart(e, slotNumber)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className={`gift-preview-card relative ${isDragged ? 'opacity-50 scale-95' : ''} ${isDragOver ? 'ring-2 ring-blue-400' : ''}`}
          onClick={() => {
            // Only open editor if not dragging
            if (!isDragging) {
              openGiftDesigner(slotNumber);
            }
          }}
        >
          {design ? (
            <div className="gift-preview-content">
              {/* Telegram-style gift preview */}
              <div className="relative w-full h-full">
                {/* Background with gradient - only for custom gifts */}
                {!design.isRealGift && (
                  <div 
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: backdrops && design.backdropIndex !== undefined && backdrops[design.backdropIndex] 
                        ? `radial-gradient(circle, ${backdrops[design.backdropIndex].hex?.centerColor || '#667eea'}, ${backdrops[design.backdropIndex].hex?.edgeColor || '#764ba2'})`
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    }}
                  />
                )}
                
                {/* Pattern overlay - only for custom gifts */}
                {!design.isRealGift && design.patternIndex !== undefined && design.patternName && (
                  <div className="absolute inset-0 rounded-lg z-10">
                    <div className="w-full h-full relative">
                      {/* Custom 8-pattern layout */}
                      {/* Top pattern */}
                      <div 
                        className="absolute top-2 left-1/2 transform -translate-x-1/2"
                        style={{
                          width: '8px',
                          height: '8px',
                          backgroundImage: `url(https://cdn.changes.tg/gifts/patterns/${encodeURIComponent(design.giftName)}/png/${encodeURIComponent(design.patternName)}.png)`,
                          backgroundSize: '8px 8px',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          filter: 'brightness(0) opacity(0.15)',
                        }}
                      />
                      {/* Top row - 3 patterns */}
                      <div 
                        className="absolute top-4 left-1/4 transform -translate-x-1/2"
                        style={{
                          width: '6px',
                          height: '6px',
                          backgroundImage: `url(https://cdn.changes.tg/gifts/patterns/${encodeURIComponent(design.giftName)}/png/${encodeURIComponent(design.patternName)}.png)`,
                          backgroundSize: '6px 6px',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          filter: 'brightness(0) opacity(0.15)',
                        }}
                      />
                      <div 
                        className="absolute top-4 left-1/2 transform -translate-x-1/2"
                        style={{
                          width: '6px',
                          height: '6px',
                          backgroundImage: `url(https://cdn.changes.tg/gifts/patterns/${encodeURIComponent(design.giftName)}/png/${encodeURIComponent(design.patternName)}.png)`,
                          backgroundSize: '6px 6px',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          filter: 'brightness(0) opacity(0.15)',
                        }}
                      />
                      <div 
                        className="absolute top-4 right-1/4 transform translate-x-1/2"
                        style={{
                          width: '6px',
                          height: '6px',
                          backgroundImage: `url(https://cdn.changes.tg/gifts/patterns/${encodeURIComponent(design.giftName)}/png/${encodeURIComponent(design.patternName)}.png)`,
                          backgroundSize: '6px 6px',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          filter: 'brightness(0) opacity(0.15)',
                        }}
                      />
                      {/* Left pattern */}
                      <div 
                        className="absolute top-1/2 left-2 transform -translate-y-1/2"
                        style={{
                          width: '6px',
                          height: '6px',
                          backgroundImage: `url(https://cdn.changes.tg/gifts/patterns/${encodeURIComponent(design.giftName)}/png/${encodeURIComponent(design.patternName)}.png)`,
                          backgroundSize: '6px 6px',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          filter: 'brightness(0) opacity(0.15)',
                        }}
                      />
                      {/* Right pattern */}
                      <div 
                        className="absolute top-1/2 right-2 transform -translate-y-1/2"
                        style={{
                          width: '6px',
                          height: '6px',
                          backgroundImage: `url(https://cdn.changes.tg/gifts/patterns/${encodeURIComponent(design.giftName)}/png/${encodeURIComponent(design.patternName)}.png)`,
                          backgroundSize: '6px 6px',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          filter: 'brightness(0) opacity(0.15)',
                        }}
                      />
                      {/* Bottom row - 3 patterns */}
                      <div 
                        className="absolute bottom-4 left-1/4 transform -translate-x-1/2"
                        style={{
                          width: '6px',
                          height: '6px',
                          backgroundImage: `url(https://cdn.changes.tg/gifts/patterns/${encodeURIComponent(design.giftName)}/png/${encodeURIComponent(design.patternName)}.png)`,
                          backgroundSize: '6px 6px',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          filter: 'brightness(0) opacity(0.15)',
                        }}
                      />
                      <div 
                        className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
                        style={{
                          width: '6px',
                          height: '6px',
                          backgroundImage: `url(https://cdn.changes.tg/gifts/patterns/${encodeURIComponent(design.giftName)}/png/${encodeURIComponent(design.patternName)}.png)`,
                          backgroundSize: '6px 6px',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          filter: 'brightness(0) opacity(0.15)',
                        }}
                      />
                      <div 
                        className="absolute bottom-4 right-1/4 transform translate-x-1/2"
                        style={{
                          width: '6px',
                          height: '6px',
                          backgroundImage: `url(https://cdn.changes.tg/gifts/patterns/${encodeURIComponent(design.giftName)}/png/${encodeURIComponent(design.patternName)}.png)`,
                          backgroundSize: '6px 6px',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          filter: 'brightness(0) opacity(0.15)',
                        }}
                      />
                    </div>
                  </div>
                )}
                
                 {/* Gift image */}
                 {design.isRealGift ? (
                   <div className="absolute inset-0 flex items-center justify-center z-20">
                     <img
                       src={`https://nft.fragment.com/gift/${design.giftName.toLowerCase().replace(/\s+/g, '')}-${design.ribbonNumber}.medium.jpg`}
                       alt={`Real ${design.giftName} #${design.ribbonNumber}`}
                       className="w-full h-full object-contain"
                       onError={(e) => {
                         // Fallback to ModelThumbnail if real gift doesn't exist
                         e.currentTarget.style.display = 'none';
                       }}
                     />
                   </div>
                 ) : (
                   <div className="absolute inset-3 flex items-center justify-center z-20">
                     <ModelThumbnail
                       collectionName={design.giftName}
                       modelName={giftModels[design.giftName]?.find(m => m.number === design.modelNumber)?.name || ''}
                       size="large"
                       className="w-full h-full"
                       showFallback={true}
                     />
                   </div>
                 )}
                 
                 {/* Diagonal Ribbon with Number - Telegram style */}
                 {design.ribbonNumber && !design.isRealGift && (
                   <div 
                     className="ribbon-telegram absolute top-0 right-0 z-40 pointer-events-none"
                     style={{
                       background: backdrops && design.backdropIndex !== undefined && backdrops[design.backdropIndex]
                         ? backdrops[design.backdropIndex].hex?.centerColor || '#8B4513'
                         : '#8B4513',
                       '--ribbon-color': backdrops && design.backdropIndex !== undefined && backdrops[design.backdropIndex]
                         ? backdrops[design.backdropIndex].hex?.centerColor || '#8B4513'
                         : '#8B4513'
                     } as React.CSSProperties}
                   >
                     <span className="text-white text-[10px] font-bold whitespace-nowrap">#{design.ribbonNumber}</span>
                   </div>
                 )}
                 
                 {/* Delete button - always visible on mobile */}
                 <button
                   className="delete-button absolute -top-2 -left-25 w-6 h-6 flex items-center justify-center z-30 md:opacity-0 md:hover:opacity-100"
                   onClick={(e) => {
                     e.stopPropagation();
                     handleDeleteBox(slotNumber);
                   }}
                   title="Delete gift box"
                 >
                   <XMarkIcon className="w-4 h-4 text-black" />
                 </button>
              </div>
            </div>
          ) : (
            <div className="gift-preview-placeholder">
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex flex-col items-center justify-center border border-gray-600">
                <svg fill="currentColor" viewBox="0 0 20 20" className="w-6 h-6 text-gray-400 mb-1">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-400 text-xs">#{slotNumber}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="loading-spinner" />
        <p className="ml-3 text-text-active">Loading collection...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4 animate-fade-in">
      {/* Header with Profile Picture */}
      <div className="flex items-center justify-between px-4 mb-4">
        {/* Profile Picture */}
        <button
          onClick={() => {
            setNavigationLevel('main');
            setCurrentSubTab('profile');
            setCurrentTertiaryTab(null);
            hapticFeedback('selection', 'light', webApp);
          }}
          className="relative flex-shrink-0 w-10 h-10 rounded-full overflow-hidden border-2 border-gray-600 hover:border-gray-400 transition-colors"
        >
          {telegramUser?.photo_url ? (
            <img
              src={telegramUser.photo_url}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
              {telegramUser?.first_name?.charAt(0) || user?.first_name?.charAt(0) || 'U'}
            </div>
          )}
        </button>

        {/* Hamburger Menu */}
        <button 
          onClick={() => {
            const { openDrawer } = useAppStore.getState();
            openDrawer();
            hapticFeedback('selection', 'light', webApp);
          }}
          className="w-6 h-6 flex flex-col justify-center space-y-1 hover:bg-gray-800/50 rounded p-1 transition-colors"
        >
          <div className="w-full h-0.5 bg-gray-400"></div>
          <div className="w-full h-0.5 bg-gray-400"></div>
          <div className="w-full h-0.5 bg-gray-400"></div>
        </button>
      </div>

      {/* Ads Banner */}
      <AdsBanner />

      {/* Tertiary Navigation */}
      <div className="flex justify-start px-4">
        <div className="flex space-x-8">
          <button
            onClick={() => {
              if (showIdeas) {
                setShowIdeas(false);
              }
            }}
            className={`text-lg font-medium transition-all duration-200 ease-in-out capitalize ${
              !showIdeas
                ? 'text-white border-b-2 border-white pb-1 scale-105'
                : 'text-gray-400 hover:text-gray-300 hover:scale-105'
            }`}
          >
            Making
          </button>
          <button
            onClick={() => {
              if (!showIdeas) {
                loadPublicCollections();
                setShowIdeas(true);
              }
            }}
            className={`text-lg font-medium transition-all duration-200 ease-in-out capitalize ${
              showIdeas
                ? 'text-white border-b-2 border-white pb-1 scale-105'
                : 'text-gray-400 hover:text-gray-300 hover:scale-105'
            }`}
          >
            Ideas
          </button>
        </div>
      </div>


      {/* Ideas View */}
      {showIdeas ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center px-4">
            <button
              onClick={loadPublicCollections}
              className="text-sm text-blue-500 hover:text-blue-600 bg-gray-800 px-3 py-1 rounded-lg border border-gray-700"
              disabled={ideasLoading}
            >
              {ideasLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          
          {ideasLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading ideas...</div>
            </div>
          ) : publicCollections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Lightbulb className="w-12 h-12 mb-4 text-gray-500" />
              <div className="text-gray-500 mb-2">No public collections yet</div>
              <div className="text-sm text-gray-400">
                Be the first to share your collection publicly!
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {publicCollections.map((collection) => (
                <div
                  key={collection.id}
                  className="bg-[#282727] rounded-lg border border-gray-700 p-4 hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">
                        {collection.name}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <span>by {collection.authorName}</span>
                        <span>•</span>
                        <span>{formatDate(collection.createdAt)}</span>
                      </div>
                    </div>
                    
                    {/* Like Button */}
                    <button
                      onClick={() => handleLike(collection.id)}
                      disabled={likingCollections.has(collection.id)}
                      className="flex items-center space-x-1 text-sm hover:bg-gray-700 rounded-full px-2 py-1 transition-colors"
                    >
                      {collection.isLikedByUser ? (
                        <HeartSolidIcon className="w-4 h-4 text-red-500" />
                      ) : (
                        <HeartIcon className="w-4 h-4 text-gray-400" />
                      )}
                      <span className={collection.isLikedByUser ? 'text-red-500' : 'text-gray-400'}>
                        {collection.likesCount}
                      </span>
                    </button>
                  </div>
                  
                  {/* Gift Previews */}
                  <div className="grid grid-cols-3 gap-3">
                    {collection.designs.slice(0, 9).map((design: GiftDesign, index: number) => 
                      <div key={index} className="w-full h-24">
                        {renderGiftPreview(design, index)}
                      </div>
                    )}
                    {collection.designs.length > 9 && (
                      <div className="w-full h-24 relative bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center border border-gray-600">
                        <span className="text-gray-400 text-xs">+{collection.designs.length - 9}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Credit Info (only for normal users) */}
      {user?.user_type === 'normal' && (
        <div className="text-center">
          <p className="text-xs text-text-active flex items-center justify-center gap-1">
            <Coins className="w-4 h-4" />
            <span>Save costs 1 credit</span>
          </p>
        </div>
      )}

      {/* Gift Preview Grid */}
      <div className="flex justify-center">
        <div className="gift-grid grid-cols-3" data-grid-size={gridSize}>
          {Array.from({ length: gridSize }, (_, i) => renderGiftSlot(i + 1))}
        </div>
      </div>

      {/* Combined Control Block - Compact & Minimalistic */}
      <div className="flex items-center justify-center px-4">
        <div className="flex items-center gap-2 bg-gray-800/50 rounded-xl px-4 py-2.5 border border-gray-700/50 backdrop-blur-sm">
          {/* Grid Size Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 font-medium">Grid Size</span>
            <select
              value={gridSize}
              onChange={(e) => updateGridSize(parseInt(e.target.value))}
              className="bg-white/10 text-sm text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer hover:bg-white/15 transition-colors"
            >
              <option value={3}>3</option>
              <option value={6}>6</option>
              <option value={9}>9</option>
              <option value={12}>12</option>
              <option value={15}>15</option>
              <option value={18}>18</option>
              <option value={24}>24</option>
              <option value={30}>30</option>
              <option value={36}>36</option>
              <option value={42}>42</option>
              <option value={48}>48</option>
              <option value={54}>54</option>
              <option value={60}>60</option>
            </select>
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-gray-600/50"></div>

          {/* Load Button */}
          <button
            onClick={() => {
              loadCollections();
              setIsLoadModalOpen(true);
            }}
            disabled={savedCollections.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Load</span>
          </button>

          {/* Save Button */}
          <button
            onClick={() => setIsSaveModalOpen(true)}
            disabled={Object.keys(userDesigns).length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Filter Selection Drawer */}
      <Sheet open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <SheetContent className="bg-[#1c1c1d]">
          <SheetHeader>
            <SheetTitle className="text-white text-center">
              Select your gift
            </SheetTitle>
          </SheetHeader>
          
          {/* Real Gift Checkbox */}
          <div className="mt-4 mb-2 flex justify-center">
            <label className="flex items-center space-x-2 text-sm text-white">
              <input
                type="checkbox"
                checked={useRealGift}
                onChange={(e) => setUseRealGift(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span>Use Real Telegram Gift</span>
            </label>
          </div>
          
          {/* Gift Preview */}
          <div className="mt-4 mb-4">
            <div className="w-32 h-32 mx-auto rounded-2xl overflow-hidden relative border-2 border-gray-600">
              {selectedBackdropIndex !== null ? (
                <div 
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(circle, ${backdrops[selectedBackdropIndex].hex.centerColor}, ${backdrops[selectedBackdropIndex].hex.edgeColor})`
                  }}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-800" />
              )}
              
              {/* Pattern overlay */}
              {selectedPatternIndex !== null && selectedGiftName && localPatterns[selectedPatternIndex] && (
                <div className="absolute inset-0 z-10 pointer-events-none">
                  {[...Array(8)].map((_, i) => {
                    const positions = [
                      'top-2 left-1/2 -translate-x-1/2',
                      'top-4 left-2',
                      'top-4 right-2',
                      'top-1/2 left-2 -translate-y-1/2',
                      'top-1/2 right-2 -translate-y-1/2',
                      'bottom-4 left-2',
                      'bottom-4 right-2',
                      'bottom-2 left-1/2 -translate-x-1/2'
                    ];
                    return (
                      <div
                        key={i}
                        className={`absolute ${positions[i]}`}
                        style={{
                          width: '8px',
                          height: '8px',
                          backgroundImage: `url(https://cdn.changes.tg/gifts/patterns/${encodeURIComponent(selectedGiftName)}/png/${encodeURIComponent(localPatterns[selectedPatternIndex].name)}.png)`,
                          backgroundSize: '8px 8px',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          filter: 'brightness(0) opacity(0.15)',
                        }}
                      />
                    );
                  })}
                </div>
              )}
              
              {useRealGift && selectedGiftName ? (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <img
                    src={`https://nft.fragment.com/gift/${selectedGiftName.toLowerCase().replace(/\s+/g, '')}-${ribbonNumber}.medium.jpg`}
                    alt={`Real ${selectedGiftName} #${ribbonNumber}`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      // Fallback to ModelThumbnail if real gift doesn't exist
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ) : selectedGiftName && selectedModelNumber !== null && models.find(m => m.number === selectedModelNumber) ? (
                <div className="absolute inset-3 flex items-center justify-center z-20">
                  <ModelThumbnail
                    collectionName={selectedGiftName}
                    modelName={models.find(m => m.number === selectedModelNumber)?.name || ''}
                    size="large"
                    className="w-full h-full"
                    showFallback={true}
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <span className="text-gray-400 text-xs">No selection</span>
                </div>
              )}
              
              {/* Number selector for ribbon/gift number */}
              <div className="absolute top-0 right-0 z-30 p-2">
                <input
                  type="number"
                  value={ribbonNumber}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) {
                      setRibbonNumber(val);
                    }
                  }}
                  className="w-20 bg-gray-800 text-white text-xs font-bold text-center border border-gray-600 rounded px-2 py-1"
                  min="0"
                  step="1"
                  onClick={(e) => e.stopPropagation()}
                  placeholder={useRealGift ? "Gift #" : "Ribbon #"}
                />
              </div>
            </div>
            
            {/* Slot Number */}
            <div className="text-center mt-2">
              <span className="text-gray-400 text-sm">Gift #{currentSlot}</span>
            </div>
          </div>
          
          <div className="space-y-3">
            {/* Filter Type Tabs */}
            <div className="bg-[#282627] rounded-xl p-1 grid grid-cols-4 gap-1">
              <button
                onClick={() => {
                  setCurrentFilterType('gift');
                  setCurrentFilterData(gifts.map(gift => ({ name: gift.name, type: 'gift' as const })));
                  setDrawerSearchTerm('');
                }}
                className={`py-2.5 px-2 rounded-lg text-sm font-medium transition-all ${
                  currentFilterType === 'gift'
                    ? 'bg-[#424242] text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Gift
              </button>
              <button
                onClick={() => {
                  if (selectedGiftName) {
                    setCurrentFilterType('model');
                    setCurrentFilterData(models.map(model => ({ 
                      name: model.name, 
                      type: 'model' as const, 
                      number: model.number || 0
                    })));
                    setDrawerSearchTerm('');
                  } else {
                    toast.error('Please select a gift first');
                  }
                }}
                disabled={!selectedGiftName || useRealGift}
                className={`py-2.5 px-2 rounded-lg text-sm font-medium transition-all ${
                  currentFilterType === 'model'
                    ? 'bg-[#424242] text-white shadow-sm'
                    : selectedGiftName && !useRealGift
                      ? 'text-gray-400 hover:text-white'
                      : 'text-gray-600 cursor-not-allowed'
                }`}
              >
                Collection
              </button>
              <button
                onClick={() => {
                  setCurrentFilterType('backdrop');
                  setCurrentFilterData(backdrops.map((backdrop, index) => ({ 
                    name: backdrop.name, 
                    type: 'backdrop' as const, 
                    index, 
                    hex: backdrop.hex 
                  })));
                  setDrawerSearchTerm('');
                }}
                disabled={useRealGift}
                className={`py-2.5 px-2 rounded-lg text-sm font-medium transition-all ${
                  currentFilterType === 'backdrop'
                    ? 'bg-[#424242] text-white shadow-sm'
                    : useRealGift
                      ? 'text-gray-600 cursor-not-allowed'
                      : 'text-gray-400 hover:text-white'
                }`}
              >
                Background
              </button>
              <button
                onClick={() => {
                  if (selectedGiftName) {
                    setCurrentFilterType('pattern');
                    setCurrentFilterData(localPatterns.map((pattern, index) => ({ 
                      name: pattern.name, 
                      type: 'pattern' as const, 
                      index, 
                      rarityPermille: pattern.rarityPermille 
                    })));
                    setDrawerSearchTerm('');
                  } else {
                    toast.error('Please select a gift first');
                  }
                }}
                disabled={!selectedGiftName || useRealGift}
                className={`py-2.5 px-2 rounded-lg text-sm font-medium transition-all ${
                  currentFilterType === 'pattern'
                    ? 'bg-[#424242] text-white shadow-sm'
                    : selectedGiftName && !useRealGift
                      ? 'text-gray-400 hover:text-white'
                      : 'text-gray-600 cursor-not-allowed'
                }`}
              >
                Pattern
              </button>
          </div>

            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                value={drawerSearchTerm}
                onChange={(e) => setDrawerSearchTerm(e.target.value)}
                placeholder={`Search ${currentFilterType || 'items'}...`}
                className="w-full px-4 py-2.5 pl-10 bg-[#424242] text-white rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg 
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {drawerSearchTerm && (
                <button
                  onClick={() => setDrawerSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
          </div>

            {/* Filter Options List */}
            {currentFilterType === 'model' && (
              <div className="text-xs text-gray-400 mb-2 px-1">
                Showing {currentFilterData.filter(item => {
                  if (!drawerSearchTerm) return true;
                  return item.name.toLowerCase().includes(drawerSearchTerm.toLowerCase());
                }).length} of {currentFilterData.length} models
              </div>
            )}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {currentFilterData
                .filter(item => {
                  if (!drawerSearchTerm) return true;
                  const searchLower = drawerSearchTerm.toLowerCase();
                  return item.name.toLowerCase().includes(searchLower);
                })
                .length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-sm">No results found</p>
                    <p className="text-xs mt-1">Try a different search term</p>
                  </div>
                ) : (
                  currentFilterData
                    .filter(item => {
                      if (!drawerSearchTerm) return true;
                      const searchLower = drawerSearchTerm.toLowerCase();
                      return item.name.toLowerCase().includes(searchLower);
                    })
                    .map((item, index) => (
            <div
              key={index}
                  className={`flex items-center p-3 rounded-xl bg-[#424242] hover:bg-[#4a4a4a] cursor-pointer transition-colors ${
                    (currentFilterType === 'gift' && item.name === selectedGiftName) ||
                    (currentFilterType === 'model' && item.number === selectedModelNumber) ||
                    (currentFilterType === 'backdrop' && item.index === selectedBackdropIndex) ||
                    (currentFilterType === 'pattern' && item.index === selectedPatternIndex)
                      ? 'ring-2 ring-blue-500'
                      : ''
                  }`}
              onClick={() => selectFilterOption(item)}
            >
              {item.type === 'gift' && (
                <>
                  <div className="w-12 h-12 rounded-lg mr-3 flex items-center justify-center overflow-hidden bg-transparent">
                    <img 
                      src={getGiftImagePath(item.name)}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to SVG icon if image fails to load
                        const target = e.currentTarget;
                        const parentElement = target.parentElement;
                        if (parentElement) {
                          target.style.display = 'none';
                          const fallbackSvg = '<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>';
                          parentElement.className = 'w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg mr-3 flex items-center justify-center';
                          parentElement.innerHTML = fallbackSvg;
                        }
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white">{item.name}</div>
                  </div>
                </>
              )}
              
               {item.type === 'model' && (
                 <>
                   <div className="w-12 h-12 mr-3">
                     <ModelThumbnail
                       collectionName={selectedGiftName || ''}
                       modelName={item.name}
                       size="medium"
                          className="rounded-lg"
                       showFallback={true}
                     />
                   </div>
                   <div className="flex-1">
                        <div className="font-medium text-white">Model {item.number}</div>
                        <div className="text-sm text-gray-400">{item.name}</div>
                   </div>
                 </>
               )}
              
              {item.type === 'backdrop' && (
                <>
                  <div 
                        className="w-12 h-12 rounded-lg mr-3"
                    style={{
                      background: `radial-gradient(circle, ${item.hex?.centerColor || '#667eea'}, ${item.hex?.edgeColor || '#764ba2'})`
                    }}
                  />
                  <div className="flex-1">
                        <div className="font-medium text-white">{item.name}</div>
                  </div>
                </>
              )}
              
              {item.type === 'pattern' && (
                <>
                  <div className="w-12 h-12 mr-3">
                    <PatternThumbnail
                      collectionName={selectedGiftName || ''}
                      patternName={item.name}
                      size="medium"
                          className="rounded-lg"
                      showFallback={true}
                    />
                  </div>
                  <div className="flex-1">
                        <div className="font-medium text-white">{item.name}</div>
                        <div className="text-sm text-gray-400">Rarity: {item.rarityPermille}‰</div>
                  </div>
                </>
              )}
              
              {(currentFilterType === 'gift' && item.name === selectedGiftName) ||
               (currentFilterType === 'model' && item.number === selectedModelNumber) ||
               (currentFilterType === 'backdrop' && item.index === selectedBackdropIndex) ||
               (currentFilterType === 'pattern' && item.index === selectedPatternIndex) ? (
                    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : null}
            </div>
          ))
                )
              }
        </div>
            
            {/* OK Button */}
            <div className="mt-6 pt-4 border-t border-gray-700">
              <button
                onClick={saveGiftDesign}
                disabled={
                  useRealGift 
                    ? !selectedGiftName || !ribbonNumber 
                    : !selectedGiftName || selectedModelNumber === null || selectedBackdropIndex === null
                }
                className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all ${
                  (useRealGift && selectedGiftName && ribbonNumber) || 
                  (!useRealGift && selectedGiftName && selectedModelNumber !== null && selectedBackdropIndex !== null)
                    ? 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                    : 'bg-gray-600 cursor-not-allowed opacity-50'
                }`}
              >
                OK
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
        </>
      )}

      {/* Save Collection Modal */}
      <Modal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title="Save"
      >
        <div className="space-y-4">
          <input
            type="text"
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
            placeholder="Collection name..."
            className="tg-input"
            maxLength={50}
          />
          
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isPublic" className="text-sm font-medium">
              Share publicly 🌟
            </label>
          </div>
          
          {isPublic && (
            <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
              Your collection will be visible to all users in the Ideas section
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsSaveModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveCollection}
              className="flex-1"
              disabled={!collectionName.trim()}
            >
              {isPublic ? 'Save & Share' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Load Collection Modal */}
      <Modal
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        title="Load"
      >
        <div className="space-y-4">
          {savedCollections.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-active">No saved collections found</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {savedCollections.map((collection) => (
                <div
                  key={collection.id}
                  className="flex items-center justify-between p-2 bg-gray-700 rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-text-idle text-sm">{collection.name}</h3>
                    <p className="text-xs text-text-active">
                      {collection.designs.length} designs
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleLoadCollection(collection.id)}
                      className="px-3"
                    >
                      Load
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDeleteCollection(collection.id)}
                      className="px-3"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};