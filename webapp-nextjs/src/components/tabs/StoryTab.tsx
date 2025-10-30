'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/Button';
import { useUser, useStoryPieces, useIsProcessing, useAppActions, useCurrentTertiaryTab, useAppStore } from '@/store/useAppStore';
import { useTelegram } from '@/components/providers/TelegramProvider';
import { AdsBanner } from '@/components/AdsBanner';
import { TertiaryNavigation } from '@/components/DynamicNavigation';
import { hapticFeedback, showTelegramAlert } from '@/lib/telegram';
import { CameraIcon, PhotoIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export const StoryTab: React.FC = () => {
  const user = useUser();
  const storyPieces = useStoryPieces();
  const isProcessing = useIsProcessing();
  const { setStoryPieces, setIsProcessing, markStoryPieceAsSent, setUser, setNavigationLevel, setCurrentSubTab, setCurrentTertiaryTab } = useAppActions();
  const { webApp, user: telegramUser } = useTelegram();
  const currentTertiaryTab = useCurrentTertiaryTab();
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customWatermark, setCustomWatermark] = useState('');
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if user can use custom watermark
  const canUseCustomWatermark = user?.user_type === 'premium' || user?.user_type === 'vip' || user?.user_type === 'test';

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    handleFile(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    multiple: false,
    disabled: isProcessing,
    noClick: true, // We'll handle click manually
  });

  const handleFile = (file: File) => {
    console.log('📁 handleFile called with:', file.name, file.type, file.size);
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('Invalid file type:', file.type);
      toast.error('Please select a valid image file');
      showTelegramAlert('Please select a valid image file', webApp || undefined);
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.error('File too large:', file.size);
      toast.error('Image size must be less than 10MB');
      showTelegramAlert('Image size must be less than 10MB', webApp || undefined);
      return;
    }

    console.log('File validation passed, setting selected file');
    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log('Preview created');
      setPreviewImage(e.target?.result as string);
    };
    reader.onerror = () => {
      console.error('Error reading file');
      toast.error('Error reading file');
    };
    reader.readAsDataURL(file);

    if (webApp?.HapticFeedback) {
      webApp.HapticFeedback.impactOccurred('light');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const processImage = async () => {
    console.log('processImage called');
    console.log('Selected file:', selectedFile);
    console.log('User:', user);
    
    if (!selectedFile || !user) {
      console.error('Missing file or user:', { selectedFile: !!selectedFile, user: !!user });
      toast.error('No image selected');
      return;
    }

    try {
      setIsProcessing(true);

      // Create FormData
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('user_id', user.user_id.toString());

      // Add custom watermark if enabled
      if (watermarkEnabled && customWatermark && canUseCustomWatermark) {
        formData.append('custom_watermark', customWatermark.trim());
      }

      console.log('Sending image for processing...');
      console.log('User ID:', user.user_id);
      console.log('Custom watermark:', watermarkEnabled && customWatermark ? customWatermark.trim() : 'none');

      // Send to backend
      const response = await fetch('/api/process-image', {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned non-JSON response');
      }

      const result = await response.json();
      console.log('Response data:', result);

      if (result.success) {
        // Only update user info for premium/vip users to preserve their status
        // For normal users, keep the existing user state to preserve premium status
        if (result.user_type && (result.user_type === 'premium' || result.user_type === 'vip' || result.user_type === 'test')) {
          setUser({
            ...user,
            user_type: result.user_type,
            watermark: result.watermark,
            credits_remaining: result.credits_remaining,
          });
        }

        // Convert story pieces to array of objects
        const pieces = result.story_pieces.map((dataUrl: string, index: number) => ({
          id: index + 1,
          imageDataUrl: dataUrl,
          isSent: false,
        }));

        setStoryPieces(pieces);
        setPreviewImage(null);
        setSelectedFile(null);

        // Show success message
        let statusMessage = '';
        if (result.user_type === 'vip' || result.user_type === 'test') {
          statusMessage = 'VIP processing complete!';
        } else if (result.user_type === 'premium') {
          statusMessage = 'Premium processing complete!';
        } else {
          statusMessage = `Processing complete! ${result.credits_remaining} credits remaining.`;
        }

        if (result.watermark) {
          statusMessage += '\n📝 Images include watermark.';
        }

        toast.success('Image processed successfully!');
        setTimeout(() => {
          showTelegramAlert(statusMessage, webApp || undefined);
        }, 1000);

        hapticFeedback('notification', 'success', webApp);
      } else {
        // Update user info even on error
        if (result.user_type) {
          setUser({
            ...user,
            user_type: result.user_type,
            credits_remaining: result.credits_remaining,
          });
        }

        const errorMsg = result.error || 'Failed to process image';
        toast.error(errorMsg);
        showTelegramAlert(errorMsg, webApp || undefined);
        hapticFeedback('notification', 'error', webApp);
      }
    } catch (error) {
      console.error('Error processing image:', error);

      let errorMessage = 'Network error. Please check your connection.';

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = '⏰ Request timed out. Please try again.';
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = '🔌 Connection failed. Please check your internet connection.';
        } else if (error.message.includes('NetworkError')) {
          errorMessage = '🌐 Network error. Server might be down.';
        }
      }

      toast.error(errorMessage);
      showTelegramAlert(errorMessage, webApp || undefined);
      hapticFeedback('notification', 'error', webApp);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadOriginalPhotos = async () => {
    if (storyPieces.length === 0) {
      toast.error('No story pieces to download');
      return;
    }

    try {
      // Check if we're in Telegram Mini App (mobile)
      const isTelegramMiniApp = webApp && webApp.platform !== 'unknown' && webApp.platform !== 'web';
      
      if (isTelegramMiniApp && telegramUser?.id) {
        // Send ZIP via Telegram bot for mobile users
        console.log('Sending ZIP via Telegram bot for mobile user');
        
        const response = await fetch('/api/send-originals-zip', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: telegramUser.id,
            story_pieces: storyPieces
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to send ZIP file');
        }

        const result = await response.json();
        toast.success(result.message || 'ZIP file sent to your Telegram chat!');
        hapticFeedback('notification', 'success', webApp);
        return;
      }

      // Desktop/web fallback - download directly
      console.log('Downloading ZIP directly for desktop/web user');
      
      // Create JSZip instance
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Add each story piece to the ZIP
      for (let i = 0; i < storyPieces.length; i++) {
        const piece = storyPieces[i];
        const pieceNumber = 12 - i; // Reverse order numbering
        
        // Convert data URL to blob
        const response = await fetch(piece.imageDataUrl);
        const blob = await response.blob();
        
        // Add to ZIP with numbered filename
        zip.file(`story-piece-${pieceNumber.toString().padStart(2, '0')}.png`, blob);
      }

      // Generate and download the ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `story-pieces-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Original photos downloaded successfully!');
      hapticFeedback('notification', 'success', webApp);
    } catch (error) {
      console.error('Error downloading photos:', error);
      toast.error('Failed to download photos');
      hapticFeedback('notification', 'error', webApp);
    }
  };

  const handleShareStory = async (pieceId: number) => {
    console.log('=== STORY SHARE DEBUG START ===');
    console.log(`Piece ID: ${pieceId}`);
    console.log('WebApp available:', Boolean(webApp));
    console.log('Telegram user:', telegramUser);
    console.log('Story pieces count:', storyPieces.length);
    
    if (!webApp) {
      console.log('❌ No WebApp available');
      toast.error('Telegram WebApp not available');
      return;
    }

    const piece = storyPieces.find(p => p.id === pieceId);
    if (!piece) {
      console.log('❌ Piece not found:', pieceId);
        return;
      }

    console.log('✅ Piece found:', piece);

    try {
      console.log('=== USING NATIVE STORY SHARING ===');
      console.log(`Sharing story piece ${pieceId} directly to user's story`);

      hapticFeedback('impact', 'medium', webApp);

      // Convert base64 to blob
      const response = await fetch(piece.imageDataUrl);
      const blob = await response.blob();

      // Upload to server to get public URL
      const formData = new FormData();
      formData.append('image', blob, `story_piece_${pieceId}.png`);
      formData.append('userId', user?.user_id.toString() || 'unknown');

      console.log('Uploading image to server...');

      const uploadResponse = await fetch('/api/upload-story-piece', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image to server');
      }

      const { url: publicUrl } = await uploadResponse.json();
      console.log('Public URL:', publicUrl);

      // Validate that we have a proper HTTPS URL
      if (!publicUrl || !publicUrl.startsWith('https://')) {
        throw new Error('Invalid public URL received from server');
      }

      // Use Telegram WebApp native story sharing
      console.log('Calling Telegram WebApp shareToStory method...');
      
      // Check if shareToStory method is available
      if (typeof webApp.shareToStory === 'function') {
        console.log('✅ shareToStory method available, calling it...');
        
        // Call the native Telegram WebApp story sharing method
        webApp.shareToStory(publicUrl);

      // Mark as sent
      markStoryPieceAsSent(pieceId);
      
      // Complete "Create Your First Story" task
      try {
        await fetch('/api/tasks/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ taskId: 'daily_create_story' }),
        });
      } catch (error) {
        console.log('Task completion failed (non-critical):', error);
      }
      
        toast.success(`Story piece ${12 - (pieceId - 1)} shared! Opening story composer...`);
      hapticFeedback('notification', 'success', webApp);
        
      } else {
        console.log('❌ shareToStory method not available');
        throw new Error('Story sharing not supported in this Telegram version');
      }

    } catch (error) {
      console.error('Error sharing story:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to share story: ${errorMsg}`);
      hapticFeedback('notification', 'error', webApp);
    }
  };

  const resetUpload = () => {
    setPreviewImage(null);
    setSelectedFile(null);
    setStoryPieces([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 py-4 lg:py-0 animate-fade-in">
      {/* User Status Display */}
      {/* Header with Profile Picture */}
      <div className="flex items-center justify-between px-4 mb-4">
        {/* Profile Picture with Notification Badge */}
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

      {/* Tertiary navigation under ads banner (left-aligned) */}
      <TertiaryNavigation />

      {/* Content based on tertiary tab */}
      {currentTertiaryTab === 'making' && (
        <div>


      {/* Watermark Settings (All users can see, but only Premium/VIP/Test can use) */}
      {storyPieces.length === 0 && (
        <div className="tg-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-text-idle flex items-center gap-2">
              <svg className="w-5 h-5 text-icon-active" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M6 3h12l4 6-10 13L2 9l4-6z"/>
                <path d="M11 3 8 9l4 13 4-13-3-6"/>
                <path d="M2 9h20"/>
              </svg>
              Custom Watermark
            </h3>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={watermarkEnabled}
                onChange={(e) => setWatermarkEnabled(e.target.checked)}
                className="w-4 h-4"
                disabled={!canUseCustomWatermark}
              />
              <span className="text-sm text-text-active">Enable</span>
              {!canUseCustomWatermark && (
                <span className="text-xs text-icon-idle ml-2">(Premium only)</span>
              )}
            </label>
          </div>
          
          {watermarkEnabled && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder={canUseCustomWatermark ? "Enter your custom text..." : "Premium feature - upgrade to use"}
                maxLength={50}
                value={customWatermark}
                onChange={(e) => setCustomWatermark(e.target.value)}
                className="tg-input"
                disabled={!canUseCustomWatermark}
              />
              <p className="text-xs text-text-active">
                Max 50 characters • Appears on all story pieces
              </p>
            </div>
          )}
        </div>
      )}

      {/* Upload Section */}
      {!previewImage && storyPieces.length === 0 && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center bg-box-bg transition-all duration-300 cursor-pointer ${
              isDragActive ? 'border-icon-active bg-icon-active/10' : 'border-icon-idle/30 hover:border-icon-active'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="space-y-4">
              <div className="flex justify-center">
                {isDragActive ? (
                  <PhotoIcon className="w-12 h-12 text-icon-active" />
                ) : (
                  <CameraIcon className="w-12 h-12 text-icon-idle" />
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {isDragActive ? 'Drop your photo here' : 'Upload Your Photo'}
                </h3>
                <p className="text-text-active mb-4">
                  Drag & drop or tap to select
                </p>
                
                <Button
                  variant="primary"
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                >
                  Choose Photo
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Section */}
      {previewImage && storyPieces.length === 0 && !isProcessing && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <img
              src={previewImage}
              alt="Preview"
              className="w-full max-w-xs rounded-xl border-2 border-icon-idle/30"
            />
          </div>
          
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={resetUpload}>
              Change Photo
            </Button>
            <Button 
              variant="primary" 
              onClick={processImage}
            >
              Cut into Stories
            </Button>
          </div>
        </div>
      )}

      {/* Processing Section */}
      {isProcessing && (
        <div className="text-center py-8">
          <div className="loading-spinner" />
          <h3 className="text-lg font-semibold mb-2">Processing Your Photo...</h3>
          <p className="text-text-active">Creating your story pieces</p>
        </div>
      )}

      {/* Story Grid - 3x4 grid showing pieces in reverse order (12, 11, 10, ..., 1) */}
      {storyPieces.length > 0 && !isProcessing && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Your Story Pieces</h3>
            <p className="text-text-active">Tap a piece to share it directly to your story</p>
            <p className="text-xs text-icon-idle mt-2">
              Share in order: Start with piece 12, then 11, 10, and so on...
            </p>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {storyPieces.map((piece, index) => {
              // Display in reverse order: piece 12 first, then 11, 10, ..., 1
              const displayNumber = 12 - index;
              
              return (
                <div
                  key={piece.id}
                  className={`relative aspect-[9/16] rounded-lg overflow-hidden bg-box-bg cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                    piece.isSent ? 'opacity-50 border-2 border-icon-active' : 'border-2 border-icon-idle/30'
                  }`}
                  onClick={() => {
                    console.log('🖱️ Story piece clicked:', piece.id, displayNumber);
                    handleShareStory(piece.id);
                  }}
                >
                  <img
                    src={piece.imageDataUrl}
                    alt={`Story piece ${displayNumber}`}
                    className="w-full h-full object-cover"
                  />
                  
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold ${
                    piece.isSent 
                      ? 'bg-icon-active text-icon-white' 
                      : 'bg-black/70 text-icon-white'
                  }`}>
                    {displayNumber}
                  </div>

                  {piece.isSent && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <span className="text-2xl">✓</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-center gap-3 flex-col">
            <Button 
              onClick={handleDownloadOriginalPhotos}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 text-base shadow-lg"
            >
              📥 Download Original Photos
            </Button>
            <Button variant="secondary" onClick={resetUpload}>
              Upload New Photo
            </Button>
          </div>

          {/* Instructions */}
          <div className="tg-card text-sm">
            <h4 className="font-semibold mb-2 text-text-idle">📝 How to share:</h4>
            <ol className="list-decimal list-inside space-y-1 text-text-active">
              <li>Tap on piece <strong>12</strong> to share it directly to your story first</li>
              <li>Then share piece <strong>11</strong>, then <strong>10</strong>, and so on...</li>
              <li>Telegram will open the story composer automatically</li>
              <li>Just press Send to post each piece to your story</li>
              <li>Your followers will see them assemble into a complete image!</li>
            </ol>
          </div>
        </div>
      )}
        </div>
      )}

      {/* Ideas Tab Content */}
      {currentTertiaryTab === 'ideas' && (
        <div className="space-y-4">
          <div className="tg-card">
            <h3 className="font-semibold text-text-idle mb-3">Story Ideas</h3>
            <div className="space-y-3">
              <div className="p-3 bg-box-bg rounded-lg">
                <h4 className="font-medium text-text-active mb-2">Photo Collage</h4>
                <p className="text-sm text-text-idle">Create a grid of your favorite photos</p>
              </div>
              <div className="p-3 bg-box-bg rounded-lg">
                <h4 className="font-medium text-text-active mb-2">Text Story</h4>
                <p className="text-sm text-text-idle">Share inspirational quotes or messages</p>
              </div>
              <div className="p-3 bg-box-bg rounded-lg">
                <h4 className="font-medium text-text-active mb-2">Behind the Scenes</h4>
                <p className="text-sm text-text-idle">Show your daily life and activities</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
