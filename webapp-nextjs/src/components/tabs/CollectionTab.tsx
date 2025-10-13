import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ModelThumbnail } from '@/components/ModelThumbnail';
import { PatternThumbnail } from '@/components/PatternThumbnail';
import { AdsBanner } from '@/components/AdsBanner';
import { cacheUtils } from '@/lib/cache';
import { useAppActions, useAppStore, useCurrentTab } from '@/store/useAppStore';
import { Backdrop, GiftModel, GiftDesign, FilterOption, Pattern } from '@/types';
import { XMarkIcon, ChevronLeftIcon, MagnifyingGlassIcon, HeartIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { hapticFeedback } from '@/lib/telegram';
import { useTelegram } from '@/components/providers/TelegramProvider';

export const CollectionTab: React.FC = () => {
  const { webApp, user: telegramUser } = useTelegram();
  const { gifts, backdrops, giftModels, patterns, gridSize, userDesigns, savedCollections, user } = useAppStore();
  const { setGifts, setBackdrops, setGiftModels, setPatterns, setGridSize, setGiftDesign, setUserDesigns, saveCollection, loadCollection, loadCollections, deleteCollection, setCurrentTab } = useAppActions();

  const [isLoading, setIsLoading] = useState(true);
  const [isDesignerOpen, setIsDesignerOpen] = useState(false);
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
  const searchInputRef = useRef<HTMLInputElement>(null);

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
          { name: 'Blue', hex: { centerColor: '#3b82f6', edgeColor: '#1e40af' } },
          { name: 'Purple', hex: { centerColor: '#8b5cf6', edgeColor: '#5b21b6' } },
          { name: 'Pink', hex: { centerColor: '#ec4899', edgeColor: '#be185d' } },
          { name: 'Green', hex: { centerColor: '#10b981', edgeColor: '#047857' } },
          { name: 'Orange', hex: { centerColor: '#f59e0b', edgeColor: '#d97706' } }
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
    setIsDesignerOpen(true);
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
  };

  const closeFilterModal = () => {
    setIsFilterModalOpen(false);
    setCurrentFilterType(null);
    setCurrentFilterData([]);
  };

  const selectFilterOption = (item: FilterOption) => {
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
    
    closeFilterModal();
  };

  const saveGiftDesign = () => {
    if (currentSlot && selectedGiftName && selectedModelNumber && selectedBackdropIndex !== null) {
      const newDesign: GiftDesign = {
        giftName: selectedGiftName,
        modelNumber: selectedModelNumber,
        backdropIndex: selectedBackdropIndex,
        backdropName: backdrops[selectedBackdropIndex]?.name || '',
        patternIndex: selectedPatternIndex || undefined,
        patternName: selectedPatternIndex !== null ? localPatterns[selectedPatternIndex]?.name : undefined
      };
      
      console.log('💾 Saving gift design:', {
        slot: currentSlot,
        design: newDesign,
        currentDesigns: userDesigns
      });
      
      setGiftDesign(currentSlot, newDesign);
      setIsDesignerOpen(false);
    }
  };

  const closeGiftDesigner = () => {
    setIsDesignerOpen(false);
    setCurrentSlot(null);
    setCurrentDesign(null);
    setSelectedGiftName(null);
    setSelectedModelNumber(null);
    setSelectedBackdropIndex(null);
    setSelectedPatternIndex(null);
    setModels([]);
    setLocalPatterns([]);
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
      <div key={index} className="relative w-full h-full aspect-square rounded-lg overflow-hidden border border-gray-300">
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
    
    return (
      <div key={slotNumber} className="gift-slot">
        <div className="gift-preview-card" onClick={() => openGiftDesigner(slotNumber)}>
          {design ? (
            <div className="gift-preview-content">
              {/* Telegram-style gift preview */}
              <div className="relative w-full h-full">
                {/* Background with gradient */}
                <div 
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: backdrops && design.backdropIndex !== undefined && backdrops[design.backdropIndex] 
                      ? `radial-gradient(circle, ${backdrops[design.backdropIndex].hex?.centerColor || '#667eea'}, ${backdrops[design.backdropIndex].hex?.edgeColor || '#764ba2'})`
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  }}
                />
                
                {/* Pattern overlay */}
                {design.patternIndex !== undefined && design.patternName && (
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
                 <div className="absolute inset-3 flex items-center justify-center z-20">
                   <ModelThumbnail
                     collectionName={design.giftName}
                     modelName={giftModels[design.giftName]?.find(m => m.number === design.modelNumber)?.name || ''}
                     size="large"
                     className="w-full h-full"
                     showFallback={true}
                   />
                 </div>
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
          onClick={() => setCurrentTab('profile')}
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
        <button className="w-6 h-6 flex flex-col justify-center space-y-1">
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
              <div className="text-4xl mb-4">💡</div>
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
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {collection.name}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>by {collection.authorName}</span>
                        <span>•</span>
                        <span>{formatDate(collection.createdAt)}</span>
                      </div>
                    </div>
                    
                    {/* Like Button */}
                    <button
                      onClick={() => handleLike(collection.id)}
                      disabled={likingCollections.has(collection.id)}
                      className="flex items-center space-x-1 text-sm hover:bg-gray-100 rounded-full px-2 py-1 transition-colors"
                    >
                      {collection.isLikedByUser ? (
                        <HeartSolidIcon className="w-4 h-4 text-red-500" />
                      ) : (
                        <HeartIcon className="w-4 h-4 text-gray-400" />
                      )}
                      <span className={collection.isLikedByUser ? 'text-red-500' : 'text-gray-500'}>
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
          <p className="text-xs text-text-active">
            💰 Save costs 1 credit
          </p>
        </div>
      )}

      {/* Gift Preview Grid */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: gridSize }, (_, i) => renderGiftSlot(i + 1))}
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
            <span>📂</span>
            <span>Load</span>
          </button>

          {/* Save Button */}
          <button
            onClick={() => setIsSaveModalOpen(true)}
            disabled={Object.keys(userDesigns).length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>💾</span>
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Gift Designer Modal */}
      <Modal
        isOpen={isDesignerOpen}
        onClose={closeGiftDesigner}
        title={`Gift #${currentSlot}`}
      >
        <div className="space-y-4">
          {/* Compact Preview */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg border border-gray-600 overflow-hidden relative flex-shrink-0">
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
              
              {selectedGiftName && selectedModelNumber && (
                <div className="absolute inset-2 flex items-center justify-center">
                  <ModelThumbnail
                    collectionName={selectedGiftName}
                    modelName={models.find(m => m.number === selectedModelNumber)?.name || ''}
                    size="small"
                    className="w-full h-full"
                    showFallback={true}
                  />
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-2">

              <div className="grid grid-cols-2 gap-2">
                {/* Gift Type */}
                <Button
                  variant="secondary"
                  onClick={() => openFilterModal('gift')}
                  className="w-full justify-start text-sm"
                >
                  <span>{selectedGiftName || 'Gift...'}</span>
                </Button>

                {/* Model */}
                <Button
                  variant="secondary"
                  onClick={() => openFilterModal('model')}
                  disabled={!selectedGiftName}
                  className="w-full justify-start text-sm"
                >
                  <span>{selectedModelNumber ? `#${selectedModelNumber}` : 'Model...'}</span>
                </Button>

                {/* Background */}
                <Button
                  variant="secondary"
                  onClick={() => openFilterModal('backdrop')}
                  className="w-full justify-start text-sm"
                >
                  <span>{selectedBackdropIndex !== null ? `BG ${selectedBackdropIndex + 1}` : 'Background...'}</span>
                </Button>

                {/* Pattern */}
                <Button
                  variant="secondary"
                  onClick={() => openFilterModal('pattern')}
                  disabled={!selectedGiftName}
                  className="w-full justify-start text-sm"
                >
                  <span>{selectedPatternIndex !== null ? `Pattern` : 'Pattern...'}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={closeGiftDesigner} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={saveGiftDesign}
              disabled={!selectedGiftName || !selectedModelNumber || selectedBackdropIndex === null}
              className="flex-1"
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Filter Selection Modal */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={closeFilterModal}
        title={currentFilterType === 'gift' ? 'NFT' : currentFilterType === 'model' ? 'Model' : 'Color'}
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {currentFilterData.map((item, index) => (
            <div
              key={index}
              className="flex items-center p-3 rounded-lg border border-icon-idle/30 hover:bg-box-bg/50 cursor-pointer transition-colors"
              onClick={() => selectFilterOption(item)}
            >
              {item.type === 'gift' && (
                <>
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg border border-icon-idle/30 mr-3 flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center text-lg">
                      🎁
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-text-idle">{item.name}</div>
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
                       className="rounded-lg border border-icon-idle/30"
                       showFallback={true}
                     />
                   </div>
                   <div className="flex-1">
                     <div className="font-medium text-text-idle">Model {item.number}</div>
                     <div className="text-sm text-text-active">{item.name}</div>
                     <div className="text-xs text-text-active opacity-70">Rarity: {item.rarity}‰</div>
                   </div>
                 </>
               )}
              
              {item.type === 'backdrop' && (
                <>
                  <div 
                    className="w-12 h-12 rounded-lg mr-3 border border-icon-idle/30"
                    style={{
                      background: `radial-gradient(circle, ${item.hex?.centerColor || '#667eea'}, ${item.hex?.edgeColor || '#764ba2'})`
                    }}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-text-idle">Color {(item.index || 0) + 1}</div>
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
                      className="rounded-lg border border-icon-idle/30"
                      showFallback={true}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-text-idle">Pattern {(item.index || 0) + 1}</div>
                    <div className="text-sm text-text-active">{item.name}</div>
                    <div className="text-xs text-text-active opacity-70">Rarity: {item.rarityPermille}‰</div>
                  </div>
                </>
              )}
              
              {(currentFilterType === 'gift' && item.name === selectedGiftName) ||
               (currentFilterType === 'model' && item.number === selectedModelNumber) ||
               (currentFilterType === 'backdrop' && item.index === selectedBackdropIndex) ||
               (currentFilterType === 'pattern' && item.index === selectedPatternIndex) ? (
                <svg className="w-5 h-5 text-icon-active" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : null}
            </div>
          ))}
        </div>
      </Modal>
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