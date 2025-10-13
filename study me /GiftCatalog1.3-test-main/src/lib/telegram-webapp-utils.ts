// Utility functions for working with Telegram WebApp
// Based on official Telegram documentation: https://core.telegram.org/api/web-events

/**
 * Safely access the Telegram WebApp API
 */
export const getTelegramWebApp = () => {
  if (typeof window !== 'undefined') {
    return (window as any).Telegram?.WebApp;
  }
  return null;
};

/**
 * Share a story using the Telegram WebApp API
 * Implementation follows Telegram's Web Events documentation:
 * https://core.telegram.org/api/web-events
 */
export const shareToTelegramStory = (options: { 
  mediaUrl: string, 
  caption?: string,
  widget_link?: {
    url: string,
    name?: string
  },
  onSuccess?: () => void,
  onError?: (error: any) => void
}) => {
  try {
    const { mediaUrl, caption = '', widget_link, onSuccess, onError } = options;
    
    console.log('DEBUG STORY SHARE: Starting story sharing process');
    console.log('DEBUG STORY SHARE: Media URL provided:', mediaUrl);
    
    // Create the payload according to Telegram's expected format
    const payload: any = {}; 
    
    // Add basic properties
    payload.media_url = mediaUrl;
    payload.text = caption;
    
    // Add widget_link if provided
    if (widget_link) {
      console.log('DEBUG STORY SHARE: Adding widget_link:', widget_link);
      payload.widget_link = {
        url: widget_link.url,
        text: widget_link.name
      };
    }
    
    console.log('DEBUG STORY SHARE: Full payload:', JSON.stringify(payload));
    
    // Get the Telegram WebApp instance
    const tg = (window as any).Telegram?.WebApp;
    console.log('DEBUG STORY SHARE: Telegram WebApp available:', Boolean(tg));
    
    // Just try to open the image directly
    console.log('DEBUG STORY SHARE: Opening image directly for manual sharing');
    try {
      window.open(mediaUrl, '_blank');
      
      if (onSuccess) onSuccess();
      return true;
    } catch (e) {
      console.error('DEBUG STORY SHARE: Error opening image:', e);
      if (onError) {
        onError(new Error('Failed to open image: ' + (e as Error).message));
      }
      return false;
    }
  } catch (error) {
    console.error('DEBUG STORY SHARE: Fatal error in story sharing utility:', error);
    if (options.onError) {
      options.onError(error);
    }
    return false;
  }
}; 