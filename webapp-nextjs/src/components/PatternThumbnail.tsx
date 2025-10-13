import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PatternThumbnailProps {
  collectionName: string;
  patternName: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  showFallback?: boolean;
}

export const PatternThumbnail: React.FC<PatternThumbnailProps> = ({
  collectionName,
  patternName,
  size = 'medium',
  className,
  showFallback = true
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!collectionName || !patternName) {
      setIsLoading(false);
      return;
    }

    const loadPattern = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        
        const url = `https://cdn.changes.tg/gifts/patterns/${encodeURIComponent(collectionName)}/png/${encodeURIComponent(patternName)}.png`;
        
        // Test if the image exists
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          setImageUrl(url);
        } else {
          throw new Error('Pattern image not found');
        }
      } catch (error) {
        console.log(`Failed to load pattern image for ${patternName}:`, error);
        setHasError(true);
        setImageUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadPattern();
  }, [collectionName, patternName]);

  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  if (isLoading) {
    return (
      <div className={cn(
        sizeClasses[size],
        'bg-gray-700 rounded-lg animate-pulse flex items-center justify-center',
        className
      )}>
        <div className="w-4 h-4 bg-gray-600 rounded"></div>
      </div>
    );
  }

  if (hasError || !imageUrl) {
    if (!showFallback) return null;
    
    return (
      <div className={cn(
        sizeClasses[size],
        'bg-gray-700 rounded-lg flex items-center justify-center border border-gray-600',
        className
      )}>
        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={patternName}
      className={cn(
        sizeClasses[size],
        'rounded-lg object-cover border border-gray-600',
        className
      )}
      onError={() => {
        setHasError(true);
        setImageUrl(null);
      }}
    />
  );
};


