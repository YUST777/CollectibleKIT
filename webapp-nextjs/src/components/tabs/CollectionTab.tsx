import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ModelThumbnail } from '@/components/ModelThumbnail';
import { PatternThumbnail } from '@/components/PatternThumbnail';
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
      try {
        setIsLoading(true);
        
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 10000);
        });

        // Load data with timeout
        const [giftsData, backdropsData] = await Promise.race([
          Promise.all([
            cacheUtils.getGifts(),
            cacheUtils.getBackdrops()
          ]),
          timeoutPromise
        ]) as [any, any];

        setGifts(giftsData || [
          { name: 'Duck', models: [] },
          { name: 'Cat', models: [] },
          { name: 'Dog', models: [] },
          { name: 'Rabbit', models: [] },
          { name: 'Bear', models: [] }
        ]);
        setBackdrops(backdropsData || [
          { name: 'Blue', color: '#3B82F6' },
          { name: 'Purple', color: '#8B5CF6' },
          { name: 'Pink', color: '#EC4899' },
          { name: 'Green', color: '#10B981' },
          { name: 'Orange', color: '#F59E0B' }
        ]);
        
        // Load models and patterns for each gift
        const modelsPromises = giftsData?.map(async (gift: any) => {
          try {
            const modelsResponse = await fetch(`/api/collection/gifts/${gift.name}/models`);
            const modelsData = await modelsResponse.json();
            return { giftName: gift.name, models: modelsData.models || [] };
          } catch (error) {
            console.error(`Error loading models for ${gift.name}:`, error);
            return { giftName: gift.name, models: [] };
          }
        }) || [];

        const modelsResults = await Promise.all(modelsPromises);
        const modelsMap: { [key: string]: GiftModel[] } = {};
        modelsResults.forEach(result => {
          modelsMap[result.giftName] = result.models;
        });
        setGiftModels(modelsMap);

        // Load patterns for each gift
        const patternsPromises = giftsData?.map(async (gift: any) => {
          try {
            const patternsResponse = await fetch(`/api/collection/gifts/${gift.name}/patterns`);
            const patternsData = await patternsResponse.json();
            return { giftName: gift.name, patterns: patternsData.patterns || [] };
          } catch (error) {
            console.error(`Error loading patterns for ${gift.name}:`, error);
            return { giftName: gift.name, patterns: [] };
          }
        }) || [];

        const patternsResults = await Promise.all(patternsPromises);
        const patternsMap: { [key: string]: Pattern[] } = {};
        patternsResults.forEach(result => {
          patternsMap[result.giftName] = result.patterns;
        });
        setPatterns(patternsMap);

      } catch (error) {
        console.error('Error loading initial data:', error);
        toast.error('Using offline mode - limited features available');
        
        // Fallback data
        setGifts([
          { name: 'Duck', models: [] },
          { name: 'Cat', models: [] },
          { name: 'Dog', models: [] },
          { name: 'Rabbit', models: [] },
          { name: 'Bear', models: [] }
        ]);
        setBackdrops([
          { name: 'Blue', color: '#3B82F6' },
          { name: 'Purple', color: '#8B5CF6' },
          { name: 'Pink', color: '#EC4899' },
          { name: 'Green', color: '#10B981' },
          { name: 'Orange', color: '#F59E0B' }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [setGifts, setBackdrops, setGiftModels, setPatterns]);

  // Load models when gift is selected
  useEffect(() => {
    if (selectedGiftName && giftModels[selectedGiftName]) {
      setModels(giftModels[selectedGiftName]);
    }
  }, [selectedGiftName, giftModels]);

  // Load patterns when gift is selected
  useEffect(() => {
    if (selectedGiftName && patterns[selectedGiftName]) {
      setLocalPatterns(patterns[selectedGiftName]);
    }
  }, [selectedGiftName, patterns]);

  // Preload images when models change
  useEffect(() => {
    if (models.length > 0) {
      preloadImages();
    }
  }, [models]);

  const preloadImages = async () => {
    setIsPreloadingImages(true);
    try {
      const imagePromises = models.map(async (model) => {
        const img = new Image();
        img.src = `https://cdn.changes.tg/gifts/${selectedGiftName}/${model.name}.png`;
        return img;
      });
      await Promise.all(imagePromises);
    } catch (error) {
      console.error('Error preloading images:', error);
    } finally {
      setIsPreloadingImages(false);
    }
  };

  const updateGridSize = (newSize: number) => {
    setGridSize(newSize);
    hapticFeedback('impact', 'light');
  };

  const openDesigner = (slotNumber: number) => {
    setCurrentSlot(slotNumber);
    setCurrentDesign(userDesigns[slotNumber] || null);
    setSelectedGiftName(userDesigns[slotNumber]?.giftName || null);
    setSelectedModelNumber(userDesigns[slotNumber]?.modelNumber || null);
    setSelectedBackdropIndex(userDesigns[slotNumber]?.backdropIndex || null);
    setSelectedPatternIndex(userDesigns[slotNumber]?.patternIndex || null);
    setIsDesignerOpen(true);
    hapticFeedback('impact', 'medium');
  };

  const closeDesigner = () => {
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

  const saveDesign = () => {
    if (currentSlot === null || !selectedGiftName || selectedModelNumber === null || selectedBackdropIndex === null || selectedPatternIndex === null) {
      toast.error('Please select all design elements');
      return;
    }

    const newDesign: GiftDesign = {
      giftName: selectedGiftName,
      modelNumber: selectedModelNumber,
      backdropIndex: selectedBackdropIndex,
      patternIndex: selectedPatternIndex,
    };

    setGiftDesign(currentSlot, newDesign);
    toast.success('Design saved!');
    closeDesigner();
    hapticFeedback('notification', 'success');
  };

  const loadPublicCollections = async () => {
    setIdeasLoading(true);
    try {
      const response = await fetch('/api/collections/public');
      const data = await response.json();
      setPublicCollections(data.collections || []);
    } catch (error) {
      console.error('Error loading public collections:', error);
      toast.error('Failed to load public collections');
    } finally {
      setIdeasLoading(false);
    }
  };

  const handleLike = async (collectionId: string) => {
    if (likingCollections.has(collectionId)) return;
    
    setLikingCollections(prev => new Set([...prev, collectionId]));
    
    try {
      const response = await fetch('/api/collections/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId })
      });
      
      if (response.ok) {
        setPublicCollections(prev => 
          prev.map(collection => 
            collection.id === collectionId 
              ? { 
                  ...collection, 
                  isLikedByUser: !collection.isLikedByUser,
                  likesCount: collection.isLikedByUser 
                    ? collection.likesCount - 1 
                    : collection.likesCount + 1
                }
              : collection
          )
        );
        hapticFeedback('impact', 'light');
      }
    } catch (error) {
      console.error('Error liking collection:', error);
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
    return date.toLocaleDateString();
  };

  const openFilterModal = (type: 'gift' | 'model' | 'backdrop' | 'pattern') => {
    setCurrentFilterType(type);
    setFilterSearchTerm('');
    
    let data: FilterOption[] = [];
    switch (type) {
      case 'gift':
        data = gifts.map(gift => ({ id: gift.name, name: gift.name, value: gift.name }));
        break;
      case 'model':
        if (selectedGiftName && giftModels[selectedGiftName]) {
          data = giftModels[selectedGiftName].map(model => ({ id: model.number.toString(), name: model.name, value: model.number }));
        }
        break;
      case 'backdrop':
        data = backdrops.map((backdrop, index) => ({ id: index.toString(), name: backdrop.name, value: index, color: backdrop.color }));
        break;
      case 'pattern':
        if (selectedGiftName && patterns[selectedGiftName]) {
          data = patterns[selectedGiftName].map((pattern, index) => ({ id: index.toString(), name: pattern.name, value: index }));
        }
        break;
    }
    
    setCurrentFilterData(data);
    setIsFilterModalOpen(true);
    
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const handleFilterSelection = (value: any) => {
    switch (currentFilterType) {
      case 'gift':
        setSelectedGiftName(value);
        setSelectedModelNumber(null);
        setSelectedBackdropIndex(null);
        setSelectedPatternIndex(null);
        break;
      case 'model':
        setSelectedModelNumber(value);
        break;
      case 'backdrop':
        setSelectedBackdropIndex(value);
        break;
      case 'pattern':
        setSelectedPatternIndex(value);
        break;
    }
    setIsFilterModalOpen(false);
    hapticFeedback('impact', 'light');
  };

  const handleSaveCollection = async () => {
    if (!collectionName.trim()) {
      toast.error('Please enter a collection name');
      return;
    }

    try {
      await saveCollection(collectionName, isPublic);
      toast.success(`Collection "${collectionName}" saved!`);
      setIsSaveModalOpen(false);
      setCollectionName('');
      setIsPublic(false);
      hapticFeedback('notification', 'success');
    } catch (error) {
      console.error('Error saving collection:', error);
      toast.error('Failed to save collection');
    }
  };

  const handleLoadCollection = async (collectionId: string) => {
    try {
      await loadCollection(collectionId);
      toast.success('Collection loaded!');
      setIsLoadModalOpen(false);
      hapticFeedback('notification', 'success');
    } catch (error) {
      console.error('Error loading collection:', error);
      toast.error('Failed to load collection');
    }
  };

  const handleDeleteCollection = async (collectionId: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;

    try {
      await deleteCollection(collectionId);
      toast.success('Collection deleted!');
      hapticFeedback('notification', 'warning');
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast.error('Failed to delete collection');
    }
  };

  const renderGiftPreview = (design: GiftDesign, slotNumber: number) => {
    if (design) {
      const backdrop = backdrops[design.backdropIndex];
      const pattern = patterns[design.giftName]?.[design.patternIndex];
      
      return (
        <div className="gift-preview-container relative w-full h-full">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 rounded-lg"
            style={{ backgroundColor: backdrop?.color || '#6B7280' }}
          />
          
          {/* Pattern overlay */}
          {pattern && (
            <div className="absolute inset-0 rounded-lg opacity-30">
              <PatternThumbnail
                collectionName={design.giftName}
                patternName={pattern.name}
                size="large"
                className="w-full h-full"
              />
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
      );
    } else {
      return (
        <div className="gift-preview-placeholder">
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex flex-col items-center justify-center border border-gray-600">
            <svg fill="currentColor" viewBox="0 0 20 20" className="w-6 h-6 text-gray-400 mb-1">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-400 text-xs">#{slotNumber}</span>
          </div>
        </div>
      );
    }
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
    <div className="space-y-4 py-4 animate-fade-in">
      {/* Header with Profile Picture */}
      <div className="flex items-center justify-between px-4 mb-4">
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

        {/* Collection Actions */}
        <div className="flex gap-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              loadCollections();
              setIsLoadModalOpen(true);
            }}
            disabled={savedCollections.length === 0}
            className="px-3"
          >
            📂
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsSaveModalOpen(true)}
            disabled={Object.keys(userDesigns).length === 0}
            className="px-3"
          >
            💾
          </Button>
        </div>
      </div>

      {/* Ads Banner */}
      <div className="px-4">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-3 text-center">
          <div className="text-white font-medium text-sm">Add your ad here</div>
        </div>
      </div>

      {/* Tertiary Navigation */}
      <div className="flex justify-start px-4 mb-4">
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

      {/* Grid Size Selector - Only show in Creation mode */}
      {!showIdeas && (
        <div className="flex items-center justify-center px-4">
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
            <span className="text-sm text-gray-400">Grid:</span>
            <select
              value={gridSize}
              onChange={(e) => updateGridSize(parseInt(e.target.value))}
              className="bg-transparent text-sm text-white focus:outline-none"
            >
              <option value={3}>3</option>
              <option value={6}>6</option>
              <option value={9}>9</option>
              <option value={12}>12</option>
              <option value={15}>15</option>
              <option value={18}>18</option>
            </select>
          </div>
        </div>
      )}

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

          {/* Collection Grid */}
          <div className="px-4">
            <div 
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${Math.sqrt(gridSize)}, 1fr)`,
                aspectRatio: '1'
              }}
            >
              {Array.from({ length: gridSize }, (_, index) => (
                <div
                  key={index}
                  className="relative cursor-pointer group"
                  onClick={() => openDesigner(index)}
                >
                  {renderGiftPreview(userDesigns[index], index)}
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="bg-black bg-opacity-50 rounded-full p-2">
                      <SparklesIcon className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Designer Modal */}
      <Modal
        isOpen={isDesignerOpen}
        onClose={closeDesigner}
        title="Design Gift"
        className="max-w-md"
      >
        <div className="space-y-4">
          {/* Gift Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Gift</label>
            <Button
              variant="secondary"
              onClick={() => openFilterModal('gift')}
              className="w-full justify-between"
            >
              {selectedGiftName || 'Select Gift'}
              <ChevronLeftIcon className="w-4 h-4 rotate-90" />
            </Button>
          </div>

          {/* Model Selection */}
          {selectedGiftName && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Model</label>
              <Button
                variant="secondary"
                onClick={() => openFilterModal('model')}
                className="w-full justify-between"
                disabled={!selectedGiftName}
              >
                {selectedModelNumber !== null 
                  ? models.find(m => m.number === selectedModelNumber)?.name || 'Select Model'
                  : 'Select Model'
                }
                <ChevronLeftIcon className="w-4 h-4 rotate-90" />
              </Button>
            </div>
          )}

          {/* Backdrop Selection */}
          {selectedGiftName && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Backdrop</label>
              <Button
                variant="secondary"
                onClick={() => openFilterModal('backdrop')}
                className="w-full justify-between"
                disabled={!selectedGiftName}
              >
                {selectedBackdropIndex !== null 
                  ? backdrops[selectedBackdropIndex]?.name || 'Select Backdrop'
                  : 'Select Backdrop'
                }
                <ChevronLeftIcon className="w-4 h-4 rotate-90" />
              </Button>
            </div>
          )}

          {/* Pattern Selection */}
          {selectedGiftName && localPatterns.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Pattern</label>
              <Button
                variant="secondary"
                onClick={() => openFilterModal('pattern')}
                className="w-full justify-between"
                disabled={!selectedGiftName}
              >
                {selectedPatternIndex !== null 
                  ? localPatterns[selectedPatternIndex]?.name || 'Select Pattern'
                  : 'Select Pattern'
                }
                <ChevronLeftIcon className="w-4 h-4 rotate-90" />
              </Button>
            </div>
          )}

          {/* Preview */}
          {(selectedGiftName && selectedModelNumber !== null && selectedBackdropIndex !== null && selectedPatternIndex !== null) && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Preview</label>
              <div className="w-full h-32 bg-gray-800 rounded-lg p-2">
                {renderGiftPreview({
                  giftName: selectedGiftName,
                  modelNumber: selectedModelNumber,
                  backdropIndex: selectedBackdropIndex,
                  patternIndex: selectedPatternIndex,
                }, 0)}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={closeDesigner}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={saveDesign}
              disabled={!selectedGiftName || selectedModelNumber === null || selectedBackdropIndex === null || selectedPatternIndex === null}
              className="flex-1"
            >
              Save Design
            </Button>
          </div>
        </div>
      </Modal>

      {/* Filter Modal */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title={`Select ${currentFilterType}`}
        className="max-w-sm"
      >
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              value={filterSearchTerm}
              onChange={(e) => setFilterSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Filter Options */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {currentFilterData
              .filter(option => 
                option.name.toLowerCase().includes(filterSearchTerm.toLowerCase())
              )
              .map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleFilterSelection(option.value)}
                  className="w-full p-3 text-left bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center space-x-3"
                >
                  {currentFilterType === 'backdrop' && option.color && (
                    <div 
                      className="w-6 h-6 rounded-full border border-gray-500"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  <span className="text-white">{option.name}</span>
                </button>
              ))
            }
          </div>
        </div>
      </Modal>

      {/* Save Collection Modal */}
      <Modal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title="Save Collection"
        className="max-w-sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Collection Name</label>
            <input
              type="text"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              placeholder="Enter collection name..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="isPublic" className="text-sm text-gray-300">
              Make public (share with community)
            </label>
          </div>

          <div className="flex gap-2 pt-4">
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
              disabled={!collectionName.trim()}
              className="flex-1"
            >
              Save Collection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Load Collection Modal */}
      <Modal
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        title="Load Collection"
        className="max-w-sm"
      >
        <div className="space-y-4">
          {savedCollections.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-2">No saved collections</div>
              <div className="text-sm text-gray-400">
                Create and save a collection first
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {savedCollections.map((collection) => (
                <div key={collection.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div>
                    <div className="text-white font-medium">{collection.name}</div>
                    <div className="text-sm text-gray-400">
                      {collection.isPublic ? 'Public' : 'Private'} • {collection.createdAt}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleLoadCollection(collection.id)}
                    >
                      Load
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDeleteCollection(collection.id)}
                      className="text-red-400 hover:text-red-300"
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