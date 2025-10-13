import React, { useState, useEffect } from 'react';
import { cacheUtils } from '@/lib/cache';
import { cn } from '@/lib/utils';

interface ModelThumbnailProps {
  collectionName: string;
  modelName: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  showFallback?: boolean;
}

export const ModelThumbnail: React.FC<ModelThumbnailProps> = ({
  collectionName,
  modelName,
  size = 'medium',
  className,
  showFallback = true
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isPreloading, setIsPreloading] = useState(true);

  // Size classes
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-full h-full'
  };

  // Image URL
  const imageUrl = `https://cdn.changes.tg/gifts/models/${encodeURIComponent(collectionName)}/png/${encodeURIComponent(modelName)}.png`;

  // Preload image when component mounts
  useEffect(() => {
    if (!modelName || !collectionName) return;

    const preloadImage = async () => {
      try {
        setIsPreloading(true);
        setImageError(false);
        
        // Try to preload the image
        await cacheUtils.preloadImage(imageUrl);
        setImageLoaded(true);
      } catch (error) {
        console.log(`Failed to preload image for ${modelName}:`, error);
        setImageError(true);
      } finally {
        setIsPreloading(false);
      }
    };

    preloadImage();
  }, [collectionName, modelName, imageUrl]);

  // Show loading state
  if (isPreloading) {
    return (
      <div className={cn(
        sizeClasses[size],
        'bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center animate-pulse',
        className
      )}>
        <div className="text-xs text-gray-400 font-medium">
          {modelName.charAt(0).toUpperCase()}
        </div>
      </div>
    );
  }

  // Show error state or fallback
  if (imageError || !imageLoaded) {
    if (!showFallback) return null;
    
    return (
      <div className={cn(
        sizeClasses[size],
        'bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center',
        className
      )}>
        <div className="text-white text-sm font-medium">
          🎁
        </div>
      </div>
    );
  }

  // Show loaded image
  return (
    <div className={cn(sizeClasses[size], 'rounded-lg overflow-hidden', className)}>
      <img
        src={imageUrl}
        alt={modelName}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />
    </div>
  );
};


