'use client';

import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { getCdnImageUrl } from '@/lib/utils';

interface ModelThumbnailProps {
  collectionName: string;
  modelName: string;
  size?: 'small' | 'medium' | 'large';
  onError?: () => void;
  title?: string;
  className?: string;
}

/**
 * Component for displaying model thumbnails using CDN URLs
 * This is specifically for the filter UI model previews, not for item cards
 */
export function ModelThumbnail({
  collectionName,
  modelName,
  size = 'small',
  onError,
  title,
  className = '',
}: ModelThumbnailProps) {
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Get CDN URL for the model image
  const cdnUrl = getCdnImageUrl(collectionName, modelName);

  // Size classes
  const sizes = {
    small: 'w-6 h-6 min-w-6',
    medium: 'w-8 h-8 min-w-8',
    large: 'w-12 h-12 min-w-12',
  };

  const sizeClass = sizes[size];

  // Handle image load error
  const handleError = () => {
    setError(true);
    if (onError) onError();
  };

  // Handle retry
  const handleRetry = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(false);
    setRetryCount(retryCount + 1);
  };

  // If image failed to load, show retry button
  if (error) {
    return (
      <button
        type="button"
        onClick={handleRetry}
        className={`${sizeClass} bg-gray-200 dark:bg-gray-700 rounded-sm flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none ${className}`}
        title={title || "Image failed to load. Click to retry."}
      >
        <ImageIcon className="w-4 h-4 text-gray-400" />
      </button>
    );
  }

  // Render image
  return (
    <div className={`${sizeClass} mr-1 flex items-center justify-center ${className}`}>
      <img
        src={`${cdnUrl}?retry=${retryCount}`} // Add retry param to bust cache
        alt={modelName}
        title={title || modelName}
        className="max-w-full max-h-full object-contain rounded-sm"
        onError={handleError}
      />
    </div>
  );
} 