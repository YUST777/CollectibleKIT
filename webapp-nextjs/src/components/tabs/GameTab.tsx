'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDailyGame, useAppActions, useUser, useCurrentSubTab, useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/Button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet';
import { ModelThumbnail } from '@/components/ModelThumbnail';
import { useTelegram } from '@/components/providers/TelegramProvider';
import { AdsBanner } from '@/components/AdsBanner';
import { FeedTab } from '@/components/tabs/FeedTab';
import { CelebrationModal } from '@/components/ui/CelebrationModal';
import { hapticFeedback } from '@/lib/telegram';
import { cacheUtils } from '@/lib/cache';

import toast from 'react-hot-toast';
import { FaceSmileIcon, MagnifyingGlassIcon, XMarkIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { GiftModel, FilterOption } from '@/types';

export const GameTab: React.FC = () => {
  const dailyGame = useDailyGame();
  const { setDailyGame, setNavigationLevel, setCurrentSubTab, setCurrentTertiaryTab } = useAppActions();
  const { webApp, user: telegramUser } = useTelegram();
  const user = useUser();
  const currentSubTab = useCurrentSubTab();
  
  const [selectedGame, setSelectedGame] = useState<'emoji' | 'zoom'>('emoji');
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [attempts, setAttempts] = useState<string[]>([]);
  const [gameMessage, setGameMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [revealedEmojis, setRevealedEmojis] = useState(1); // Start with 1 emoji revealed
  const [currentZoomLevel, setCurrentZoomLevel] = useState(500); // For zoom game

  // Filter drawer states
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [gifts, setGifts] = useState<{ name: string }[]>([]);
  const [selectedGiftName, setSelectedGiftName] = useState<string | null>(null);
  const [selectedModelNumber, setSelectedModelNumber] = useState<number | null>(null);
  const [selectedModelName, setSelectedModelName] = useState<string | null>(null);
  const [models, setModels] = useState<GiftModel[]>([]);
  const [currentFilterType, setCurrentFilterType] = useState<'gift' | 'model'>('gift');
  const [currentFilterData, setCurrentFilterData] = useState<FilterOption[]>([]);
  const [drawerSearchTerm, setDrawerSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Helper function to map gift names to image file names
  const getGiftImagePath = (giftName: string): string => {
    // Handle special cases
    const nameMap: { [key: string]: string } = {
      'Jack in the Box': 'Jack_in_the_Box',
      'B Day Candle': 'B_Day_Candle',
      'B-Day Candle': 'B_Day_Candle',
    };
    
    // Use mapped name if exists, otherwise replace spaces with underscores
    const filename = nameMap[giftName] || giftName.replace(/\s+/g, '_');
    return `/assets/gifts/${filename}.png`;
  };
  
  // Celebration modal state
  const [showCelebration, setShowCelebration] = useState(false);
  const [isFirstWin, setIsFirstWin] = useState(false);
  
  // Game counter for ads (show ad every 3 games)
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);

  // Load gifts data from CDN on mount
  useEffect(() => {
    const loadGifts = async () => {
      try {
        // Load ALL gifts from CDN for answer selection (not database)
        const giftsData = await cacheUtils.getGifts();
        setGifts(giftsData.map((name: string) => ({ name })));
        console.log(`✅ Loaded ${giftsData.length} gifts from CDN for answers`);
      } catch (error) {
        console.error('Error loading gifts:', error);
        // Fallback data
        setGifts([
          { name: 'Duck' },
          { name: 'Cat' },
          { name: 'Dog' },
          { name: 'Rabbit' },
          { name: 'Bear' }
        ]);
      }
    };
    loadGifts();
  }, []);

  // Note: loadDailyQuestion is called in the currentSubTab useEffect below
  
  // Load ALL models from CDN when a gift is selected (for harder gameplay)
  useEffect(() => {
    const loadModels = async () => {
      if (selectedGiftName) {
        try {
          // Load ALL models from CDN (50-70+ models per gift for harder game)
          const modelsData = await cacheUtils.getGiftModels(selectedGiftName);
          setModels(modelsData);
          console.log(`✅ Loaded ${modelsData.length} models for ${selectedGiftName} from CDN`);
        } catch (error) {
          console.error(`Error loading models for ${selectedGiftName}:`, error);
          toast.error('Failed to load models.');
        }
      } else {
        setModels([]);
      }
    };
    loadModels();
  }, [selectedGiftName]);

  // Force canvas render when component mounts and zoom game is available
  useEffect(() => {
    if (currentQuestion?.game_type === 'zoom' && selectedGame === 'zoom') {
      // Wait for DOM to be ready, then render canvas
      const timer = setTimeout(() => {
        renderZoomedGift();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [currentQuestion, selectedGame]);

  // Canvas rendering effect for zoom game
  useEffect(() => {
    if (currentQuestion?.game_type === 'zoom') {
      // Small delay to ensure canvas is rendered
      const timer = setTimeout(() => {
        renderZoomedGift();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [currentQuestion, currentZoomLevel]);

  // Force canvas render when zoom game is first selected
  useEffect(() => {
    if (selectedGame === 'zoom' && currentQuestion?.game_type === 'zoom') {
      const timer = setTimeout(() => {
        renderZoomedGift();
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [selectedGame]);

  // Update selectedGame based on navigation and reload question
  useEffect(() => {
    if (currentSubTab) {
      setSelectedGame(currentSubTab as 'emoji' | 'zoom');
      // Load new question when switching game types
      loadDailyQuestion();
    }
  }, [currentSubTab]);

  const loadDailyQuestion = async () => {
    try {
      setIsLoading(true);
      const userId = webApp?.initDataUnsafe?.user?.id;
      
      // Determine game type based on current sub tab
      const gameType = currentSubTab === 'emoji' ? 'emoji' : 'zoom';
      
      const url = userId 
        ? `/api/game/daily-question?userId=${userId}&gameType=${gameType}` 
        : `/api/game/daily-question?gameType=${gameType}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setDailyGame(data.question);
        setCurrentQuestion(data.question);
        
        // Reset game state
        setRevealedEmojis(1); // Start with 1 emoji revealed
        setCurrentZoomLevel(500); // Reset zoom level
        setAttempts([]);
        setUserAnswer('');
        setGameMessage('');
        
        console.log('🎮 New random game loaded:', data.question.gift_name, '-', data.question.model_name);
        console.log('🎮 Game type:', data.question.game_type);
      } else {
        toast.error(data.error || 'Failed to load game');
      }
    } catch (error) {
      console.error('Error loading daily question:', error);
      toast.error('Failed to load game');
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!selectedGiftName || !selectedModelName || !currentQuestion) {
      toast.error('Please select a gift collection and model');
      return;
    }
    
    setIsLoading(true);
    
    // Add attempt to list with both gift name and model name
    const newAttempt = `${selectedGiftName} - ${selectedModelName}`;
    setAttempts(prev => [newAttempt, ...prev]);
    
    try {
      const response = await fetch('/api/game/submit-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: webApp?.initDataUnsafe?.user?.id,
          answer: selectedModelName, // Submit the model name as the answer
          gameType: currentQuestion.game_type, // Pass the game type
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        if (result.correct) {
          setGameMessage('Correct! Well done!');
          hapticFeedback('notification', 'success', webApp);
          
          // Mark answer as correct to show NEXT button
          setIsAnswerCorrect(true);
          
          // Increment game counter
          setGamesPlayed(prev => prev + 1);
          
          // Show celebration modal for first win or regular credit
          if (result.is_first_win) {
            setIsFirstWin(true);
          } else {
            setIsFirstWin(false);
          }
          setShowCelebration(true);
          
          // Clear selection
          setSelectedGiftName(null);
          setSelectedModelNumber(null);
          setSelectedModelName(null);
          
        } else {
          // Wrong answer - handle based on game type
          if (currentQuestion?.game_type === 'emoji') {
            // Reveal next emoji
            if (revealedEmojis < 4) {
              setRevealedEmojis(prev => prev + 1);
              setGameMessage(`Try again! ${4 - revealedEmojis} emojis left to reveal.`);
            } else {
              // All emojis revealed
              setGameMessage(`Out of hints! The answer was "${currentQuestion.gift_name}".`);
              // Auto-load next game after 3 seconds
              setTimeout(() => {
                loadDailyQuestion();
              }, 3000);
            }
          } else if (currentQuestion?.game_type === 'zoom') {
            // Zoom out progressively
            if (currentZoomLevel > 100) {
              const newZoomLevel = Math.max(100, currentZoomLevel - 15);
              setCurrentZoomLevel(newZoomLevel);
              setGameMessage(`Try again! Zoomed out to ${newZoomLevel}%`);
            } else {
              // Fully zoomed out
              setGameMessage(`Fully zoomed out! The answer was "${currentQuestion.gift_name}".`);
              // Auto-load next game after 3 seconds
              setTimeout(() => {
                loadDailyQuestion();
              }, 3000);
            }
          }
          
          hapticFeedback('notification', 'error', webApp);
        }
      } else {
        setGameMessage(result.error || 'Failed to submit answer');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error('Failed to submit answer');
    } finally {
      setIsLoading(false);
    }
  };

  const selectFilterOption = (item: FilterOption) => {
    if (item.type === 'gift') {
      setSelectedGiftName(item.name);
      setSelectedModelNumber(null);
      setSelectedModelName(null);
    } else if (item.type === 'model') {
      setSelectedModelNumber(item.number || 0);
      setSelectedModelName(item.name);
    }
    hapticFeedback('selection', undefined, webApp);
  };

  const openFilterDrawer = () => {
    setIsFilterDrawerOpen(true);
    setCurrentFilterType('gift');
    setCurrentFilterData(gifts.map(gift => ({ name: gift.name, type: 'gift' as const })));
    setDrawerSearchTerm('');
  };

  const handleSubmitSelection = () => {
    setIsFilterDrawerOpen(false);
    submitAnswer();
  };

  const skipQuestion = () => {
    // Reset state and load new question
    setUserAnswer('');
    setAttempts([]);
    setGameMessage('');
    setSelectedGiftName(null);
    setSelectedModelNumber(null);
    setSelectedModelName(null);
    toast('Loading new question...');
    loadDailyQuestion();
  };

  const handleNextGame = async () => {
    try {
      // Check if we should show ad (every 3 games)
      const shouldShowAd = gamesPlayed > 0 && gamesPlayed % 3 === 0;
      
      if (shouldShowAd) {
        // Show Monetag In-App Interstitial ad
        console.log('📺 Showing ad after 3 games');
        
        try {
          // @ts-ignore - Monetag SDK
          if (window.show_10065186) {
            await window.show_10065186({
              type: 'inApp',
              inAppSettings: {
                frequency: 1,
                capping: 0.1,
                interval: 30,
                timeout: 5,
                everyPage: false
              }
            });
            console.log('✅ Ad shown successfully');
          } else {
            console.warn('⚠️ Monetag SDK not loaded');
          }
        } catch (adError) {
          console.error('Ad error:', adError);
          // Continue to next game even if ad fails
        }
      }
      
      // Reset state and load next game
      setIsAnswerCorrect(false);
      setGameMessage('');
      loadDailyQuestion();
      
    } catch (error) {
      console.error('Error loading next game:', error);
      toast.error('Failed to load next game');
    }
  };

  const renderEmojiHints = () => {
    if (!currentQuestion || currentQuestion.game_type !== 'emoji') return null;
    
    return (
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[1, 2, 3, 4].map((index) => {
          const emoji = index <= revealedEmojis ? currentQuestion.emojis?.[index - 1] || '?' : '?';
          const isRevealed = index <= revealedEmojis;
          
          return (
            <div
              key={index}
              className={`aspect-square rounded-lg flex items-center justify-center text-2xl border-2 transition-all duration-300 ${
                isRevealed 
                  ? 'bg-purple-500/20 border-purple-400 text-purple-300 scale-105' 
                  : 'bg-gray-800 border-gray-600 text-gray-500'
              }`}
            >
              {emoji}
            </div>
          );
        })}
      </div>
    );
  };

  const renderZoomedGift = async () => {
    if (!currentQuestion || currentQuestion.game_type !== 'zoom') {
      console.log('🎮 No zoom question available');
      return;
    }
    
    console.log('🎮 Attempting to render zoomed gift...');
    
    const canvas = document.getElementById('zoom-canvas') as HTMLCanvasElement;
    if (!canvas) {
      console.log('🎮 Canvas not found, retrying in 100ms...');
      // Retry after a short delay if canvas isn't ready
      setTimeout(() => renderZoomedGift(), 100);
      return;
    }
    
    console.log('🎮 Canvas found, getting context...');
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('🎮 Canvas context not found, retrying in 100ms...');
      setTimeout(() => renderZoomedGift(), 100);
      return;
    }
    
    console.log('🎮 Canvas context ready, starting image render...');
    
    try {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Create gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#1f2937');
      gradient.addColorStop(1, '#374151');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Load gift model image
      const giftName = currentQuestion.gift_name || 'Plush Pepe';
      const modelName = currentQuestion.model_name || 'Ninja Mike';
      const backdropIndex = currentQuestion.backdrop_index || 1;
      
      // Create image URL from the API data - use the correct CDN path
      const imageUrl = `https://cdn.changes.tg/gifts/models/${encodeURIComponent(giftName)}/png/${encodeURIComponent(modelName)}.png`;
      
      console.log('🎮 Loading gift model image:', imageUrl);
      console.log('🎮 Gift name:', giftName, 'Model name:', modelName);
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        console.log('🎮 Image loaded successfully:', img.width, 'x', img.height);
        
        // Clear canvas with background
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Calculate zoom dimensions - fix the zoom calculation
        const zoomFactor = currentZoomLevel / 100;
        
        // For 500% zoom, we want to show only 1/5 of the image
        const sourceWidth = img.width / zoomFactor;
        const sourceHeight = img.height / zoomFactor;
        
        // Calculate source position (center of image)
        const sourceX = (img.width - sourceWidth) / 2;
        const sourceY = (img.height - sourceHeight) / 2;
        
        console.log('🎮 Drawing image with zoom:', currentZoomLevel + '%');
        console.log('🎮 Source dimensions:', sourceWidth, 'x', sourceHeight);
        console.log('🎮 Source position:', sourceX, sourceY);
        console.log('🎮 Canvas dimensions:', canvas.width, 'x', canvas.height);
        
        // Draw the zoomed image portion
        ctx.drawImage(
          img,
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, canvas.width, canvas.height
        );
        
        console.log('✅ Gift model image displayed successfully');
      };
      
      img.onerror = (error) => {
        console.error('🎮 Failed to load gift model image:', imageUrl, error);
        
        // Fallback: draw placeholder with gift info
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#6b7280';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Gift Model', canvas.width / 2, canvas.height / 2 - 40);
        
        ctx.fillStyle = '#9ca3af';
        ctx.font = '14px Arial';
        ctx.fillText(`${giftName}`, canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillText(`${modelName}`, canvas.width / 2, canvas.height / 2 + 15);
        
        ctx.fillStyle = '#ef4444';
        ctx.font = '12px Arial';
        ctx.fillText('Image failed to load', canvas.width / 2, canvas.height / 2 + 40);
        
        console.log('🎮 Using fallback display for:', giftName, modelName);
      };
      
      img.src = imageUrl;
      
    } catch (error) {
      console.error('Error rendering zoomed gift:', error);
    }
  };

  const renderZoomGame = () => {
    if (!currentQuestion || currentQuestion.game_type !== 'zoom') {
      return (
        <div className="text-center py-8">
          <p className="text-gray-400">Loading game session...</p>
        </div>
      );
    }
    
    return (
      <div className="mb-4">
        {/* Zoom Canvas */}
        <div className="relative bg-gray-800 rounded-lg p-4">
          <canvas 
            id="zoom-canvas" 
            className="w-full h-64 bg-gray-700 rounded-lg border-2 border-gray-500 mx-auto block"
            width={400}
            height={256}
            style={{ imageRendering: 'pixelated' }}
            ref={(canvas) => {
              if (canvas && currentQuestion?.game_type === 'zoom') {
                // Canvas is mounted, trigger render
                setTimeout(() => renderZoomedGift(), 50);
              }
            }}
          />
          <div className="absolute top-6 right-6 bg-black/80 text-white text-sm px-3 py-1 rounded-full font-mono">
            {currentZoomLevel}%
          </div>
        </div>
        
        <p className="text-center text-text-active text-xs mt-2">
          Each wrong guess zooms out 15%
        </p>
      </div>
    );
  };

  const goToProfile = () => {
    setNavigationLevel('main');
    setCurrentSubTab('profile');
    setCurrentTertiaryTab(null);
    hapticFeedback('selection', 'light', webApp);
  };

  return (
    <div className="space-y-4 py-4 animate-fade-in">
      {/* Header with Profile Picture */}
      <div className="flex items-center justify-between px-4 mb-4">
        {/* Profile Picture with Notification Badge */}
        <button
          onClick={goToProfile}
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


      {/* Content based on sub tab */}
      {currentSubTab === 'emoji' && (
        <div className="bg-box-bg rounded-lg p-4">
          <div className="text-center mb-4">
            <h3 className="text-sm font-medium text-text-idle">
              Which gift model do these emojis describe?
            </h3>
          </div>
          {renderEmojiHints()}
        </div>
      )}

      {currentSubTab === 'zoom' && (
        <div className="bg-box-bg rounded-lg p-4">
          <div className="text-center mb-4">
            <h3 className="text-sm font-medium text-text-idle">
              What gift model is this? (Infinite Random Game)
            </h3>
          </div>
          {renderZoomGame()}
        </div>
      )}

      {currentSubTab === 'feed' && (
        <FeedTab />
      )}

      {/* Game Controls - Show for both games */}
      {(currentSubTab === 'emoji' || currentSubTab === 'zoom') && (
        <div className="space-y-4">
          <p className="text-center text-text-active text-xs">
            {currentSubTab === 'emoji' ? 'Each try unlocks an emoji.' : 'Each wrong guess zooms out 15%.'}
          </p>

        {/* Answer Selection */}
        <div className="space-y-3 mb-4">
          {/* Selected Answer Display */}
          {(selectedGiftName || selectedModelName) && (
            <div className="bg-blue-900/30 border border-blue-600/30 rounded-lg p-3">
              <div className="text-sm text-blue-300 mb-1">Your Selection:</div>
              <div className="font-medium text-white">
                {selectedGiftName && <span className="text-purple-300">{selectedGiftName}</span>}
                {selectedGiftName && selectedModelName && <span className="text-gray-400"> → </span>}
                {selectedModelName && <span className="text-blue-300">{selectedModelName}</span>}
              </div>
            </div>
          )}

          {/* Selection Buttons */}
          <div className="flex gap-3">
            {!isAnswerCorrect ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={openFilterDrawer}
                  className="flex-1"
                >
                  <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                  {selectedGiftName || selectedModelName ? 'Change Selection' : 'Select Gift & Model'}
                </Button>
                
                <Button
                  size="sm"
                  onClick={submitAnswer}
                  disabled={!selectedGiftName || !selectedModelName || isLoading}
                  loading={isLoading}
                  className="px-6"
                >
                  Submit
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleNextGame}
                  className="flex-1 animate-bounce"
                >
                  NEXT
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Game Message */}
        {gameMessage && (
          <div className={`p-4 rounded-lg text-center font-medium mb-4 ${
            gameMessage.includes('Correct') 
              ? 'bg-green-900/30 text-green-300 border border-green-600/30'
              : gameMessage.includes('Try again')
              ? 'bg-red-900/30 text-red-300 border border-red-600/30'
              : 'bg-blue-900/30 text-blue-300 border border-blue-600/30'
          }`}>
            {gameMessage}
          </div>
        )}

        {/* Previous Attempts */}
        {attempts.length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-medium text-text-idle">Previous attempts:</h4>
            {attempts.map((attempt, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-2 bg-icon-idle/10 rounded-lg"
              >
                <span className="text-text-idle text-sm">{attempt}</span>
                <XMarkIcon className="w-4 h-4 text-red-500" />
              </div>
            ))}
          </div>
        )}

        {/* Game Controls */}
        <div className="w-full">
          <Button
            size="sm"
            onClick={skipQuestion}
            className="w-full"
            loading={isLoading}
          >
            Skip
          </Button>
        </div>

          {/* People Found Counter */}
          <div className="text-center text-text-idle text-sm">
            <span className="text-yellow-600 font-bold">
              {currentQuestion?.solvers_count?.toLocaleString() || '0'}
            </span>{' '}
            people already found out!
          </div>
        </div>
      )}

      {/* Filter Selection Drawer */}
      <Sheet open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
        <SheetContent className="bg-[#1c1c1d]">
          <SheetHeader>
            <SheetTitle className="text-white text-center">
              Select Gift & Model
            </SheetTitle>
          </SheetHeader>
          
          {/* Gift Preview */}
          <div className="mt-4 mb-4">
            <div className="w-32 h-32 mx-auto rounded-2xl overflow-hidden relative border-2 border-gray-600 bg-gradient-to-br from-gray-700 to-gray-800">
              {selectedGiftName && selectedModelName ? (
                <div className="absolute inset-3 flex items-center justify-center z-20">
                  <ModelThumbnail
                    collectionName={selectedGiftName}
                    modelName={selectedModelName}
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
            </div>
            
            {/* Selection Info */}
            <div className="text-center mt-2">
              <span className="text-gray-400 text-sm">
                {selectedGiftName ? `${selectedGiftName}${selectedModelName ? ` - ${selectedModelName}` : ''}` : 'Select a gift and model'}
              </span>
            </div>
          </div>
          
          <div className="space-y-3">
            {/* Filter Type Tabs */}
            <div className="bg-[#282627] rounded-xl p-1 grid grid-cols-2 gap-1">
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
                Gift Collection
              </button>
              <button
                onClick={() => {
                  if (selectedGiftName) {
                    setCurrentFilterType('model');
                    const modelData = models.map(model => ({ 
                      name: model.name, 
                      type: 'model' as const, 
                      number: model.number || 0
                    }));
                    console.log(`🎨 Setting ${modelData.length} models for ${selectedGiftName} in drawer`);
                    setCurrentFilterData(modelData);
                    setDrawerSearchTerm('');
                  } else {
                    toast.error('Please select a gift collection first');
                  }
                }}
                disabled={!selectedGiftName}
                className={`py-2.5 px-2 rounded-lg text-sm font-medium transition-all ${
                  currentFilterType === 'model'
                    ? 'bg-[#424242] text-white shadow-sm'
                    : selectedGiftName 
                      ? 'text-gray-400 hover:text-white'
                      : 'text-gray-600 cursor-not-allowed'
                }`}
              >
                Gift Model
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                value={drawerSearchTerm}
                onChange={(e) => setDrawerSearchTerm(e.target.value)}
                placeholder={`Search ${currentFilterType === 'gift' ? 'collections' : 'models'}...`}
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
                          (currentFilterType === 'model' && item.name === selectedModelName)
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
                                  target.style.display = 'none';
                                  const fallbackSvg = '<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>';
                                  if (target.parentElement) {
                                    target.parentElement.innerHTML = fallbackSvg;
                                    target.parentElement.className = 'w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg mr-3 flex items-center justify-center';
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
                        
                        {(currentFilterType === 'gift' && item.name === selectedGiftName) ||
                         (currentFilterType === 'model' && item.name === selectedModelName) ? (
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
                onClick={handleSubmitSelection}
                disabled={!selectedGiftName || !selectedModelName}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all ${
                  selectedGiftName && selectedModelName
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
      
      {/* Celebration Modal */}
      <CelebrationModal
        isOpen={showCelebration}
        isFirstWin={isFirstWin}
        onClose={() => setShowCelebration(false)}
      />
    </div>
  );
};
