'use client';

import React, { useState, useEffect } from 'react';
import { useDailyGame, useAppActions, useUser, useCurrentSubTab } from '@/store/useAppStore';
import { Button } from '@/components/ui/Button';
import { useTelegram } from '@/components/providers/TelegramProvider';
import { AdsBanner } from '@/components/AdsBanner';
import { hapticFeedback } from '@/lib/telegram';
import toast from 'react-hot-toast';
import { FaceSmileIcon, MagnifyingGlassIcon, XMarkIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

export const GameTab: React.FC = () => {
  const dailyGame = useDailyGame();
  const { setDailyGame } = useAppActions();
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

  useEffect(() => {
    loadDailyQuestion();
  }, []);

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

  // Update selectedGame based on navigation
  useEffect(() => {
    if (currentSubTab) {
      setSelectedGame(currentSubTab as 'emoji' | 'zoom');
    }
  }, [currentSubTab]);

  const loadDailyQuestion = async () => {
    try {
      setIsLoading(true);
      const userId = webApp?.initDataUnsafe?.user?.id;
      const url = userId ? `/api/game/daily-question?userId=${userId}` : '/api/game/daily-question';
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
        
        console.log('🎮 New random game loaded:', data.question.gift_name);
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
    if (!userAnswer.trim() || !currentQuestion) return;
    
    setIsLoading(true);
    
    // Add attempt to list
    const newAttempt = userAnswer.trim();
    setAttempts(prev => [newAttempt, ...prev]);
    
    try {
      const response = await fetch('/api/game/submit-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: webApp?.initDataUnsafe?.user?.id,
          answer: newAttempt,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        if (result.correct) {
          setGameMessage('🎉 Correct! Well done!');
          hapticFeedback('notification', 'success', webApp);
          
          if (result.reward > 0) {
            toast.success(`You earned ${result.reward} credits!`);
          }
          
          // Auto-load next random game after 2 seconds
          setTimeout(() => {
            loadDailyQuestion();
          }, 2000);
          
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
      setUserAnswer('');
    }
  };

  const skipQuestion = () => {
    setUserAnswer('');
    setAttempts([]);
    setGameMessage('');
        toast('Question skipped');
  };

  const nextQuestion = () => {
    loadDailyQuestion();
    setUserAnswer('');
    setAttempts([]);
    setGameMessage('');
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
        ctx.fillText('🎁 Gift Model', canvas.width / 2, canvas.height / 2 - 40);
        
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
    if (!currentQuestion || currentQuestion.game_type !== 'zoom') return null;
    
    return (
      <div className="mb-4">
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg p-4 text-center mb-4">
          <p className="text-icon-white font-medium">
            Zoom Game: {currentQuestion.question}
          </p>
        </div>
        
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
          <div className="absolute bottom-6 left-6 bg-black/80 text-white text-xs px-2 py-1 rounded">
            {currentQuestion?.gift_name} - {currentQuestion?.model_name}
          </div>
        </div>
        
        <p className="text-center text-text-active text-xs mt-2">
          Each wrong guess zooms out 15%
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4 py-4 animate-fade-in">
      {/* Header with Profile Picture */}
      <div className="flex items-center justify-between px-4 mb-4">
        {/* Profile Picture with Notification Badge */}
        <button
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

      {/* Game Controls - Show for both games */}
      {(currentSubTab === 'emoji' || currentSubTab === 'zoom') && (
        <div className="space-y-4">
          <p className="text-center text-text-active text-xs">
            {currentSubTab === 'emoji' ? 'Each try unlocks an emoji.' : 'Each wrong guess zooms out 15%.'}
          </p>

        {/* Answer Input */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Type gift model name..."
            className="flex-1 px-4 py-3 bg-icon-idle/10 border-2 border-icon-idle/30 rounded-lg text-text-idle text-sm focus:outline-none focus:border-purple-400"
            onKeyPress={(e) => e.key === 'Enter' && submitAnswer()}
          />
          
          <Button
            size="sm"
            onClick={submitAnswer}
            disabled={!userAnswer.trim() || isLoading}
            loading={isLoading}
            className="px-4 py-3"
          >
            ✓
          </Button>
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
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={skipQuestion}
            className="flex-1"
          >
            Skip
          </Button>
          <Button
            size="sm"
            onClick={nextQuestion}
            className="flex-1"
            loading={isLoading}
          >
            New Random Gift
          </Button>
        </div>

          {/* People Found Counter */}
          <div className="text-center p-4 bg-icon-idle/10 rounded-lg">
            <span className="text-yellow-600 font-bold">
              {currentQuestion?.solvers_count || '47,276'}
            </span>{' '}
            people already found out!
          </div>
        </div>
      )}
    </div>
  );
};
