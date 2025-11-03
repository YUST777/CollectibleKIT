import { TelegramWebApp } from '@/types';

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
    tg?: TelegramWebApp;
    telegramAnalytics?: {
      init: (config: { token: string; appName: string }) => void;
      track: (event: string, data?: any) => void;
    };
  }
}

export const getTelegramWebApp = (): TelegramWebApp | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const win = window as any;
  
  // Check multiple possible locations where Telegram SDK might expose WebApp
  // Order matters: check most common first
  if (win.Telegram?.WebApp) {
    return win.Telegram.WebApp;
  }
  
  if (win.tg) {
    return win.tg;
  }
  
  // Sometimes Telegram exposes it directly on window
  if (win.telegram?.WebApp) {
    return win.telegram.WebApp;
  }
  
  // Check if Telegram object exists but WebApp isn't ready yet
  if (win.Telegram && typeof win.Telegram.WebApp !== 'undefined') {
    return win.Telegram.WebApp;
  }
  
  return null;
};

export const initializeTelegramWebApp = (): TelegramWebApp | null => {
  const tg = getTelegramWebApp();
  
  if (tg) {
    // Initialize the WebApp
    tg.ready();
    tg.expand();
    
    // Set up theme
    if (tg.themeParams) {
      const root = document.documentElement;
      Object.entries(tg.themeParams).forEach(([key, value]) => {
        if (value) {
          root.style.setProperty(`--tg-theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
        }
      });
    }
    
    // Set viewport height
    if (tg.viewportHeight) {
      document.documentElement.style.setProperty('--tg-viewport-height', `${tg.viewportHeight}px`);
    }
    
    console.log('✅ Telegram WebApp initialized');
    return tg;
  }
  
  console.warn('⚠️ Telegram WebApp not found');
  return null;
};

export const shareToStory = async (
  imageUrl: string,
  pieceNumber: number,
  tg: TelegramWebApp
): Promise<boolean> => {
  try {
    if (!tg.shareToStory) {
      tg.showAlert('❌ shareToStory method not available');
      return false;
    }

    // Upload image to get public URL
    const uploadResponse = await fetch('/api/upload-story-piece', {
      method: 'POST',
      body: createFormDataFromUrl(imageUrl, pieceNumber),
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload image');
    }

    const { url: publicUrl } = await uploadResponse.json();

    // Share to story with widget link
    tg.shareToStory(publicUrl, {
      text: `Story Piece ${pieceNumber}/12 🎨`,
      widget_link: {
        url: "https://t.me/CollectibleKITbot",
        name: "Story Puzzle"
      }
    });

    // Haptic feedback
    if (tg.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('medium');
    }

    return true;
  } catch (error) {
    console.error('Error sharing story piece:', error);
    tg.showAlert(`❌ Failed to share: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
};

const createFormDataFromUrl = (imageUrl: string, pieceNumber: number): FormData => {
  const formData = new FormData();
  
  // Convert data URL to blob
  const response = fetch(imageUrl);
  response.then(res => res.blob()).then(blob => {
    formData.append('image', blob, `story_piece_${pieceNumber}.png`);
    formData.append('userId', getTelegramWebApp()?.initDataUnsafe?.user?.id?.toString() || 'unknown');
  });
  
  return formData;
};

export const showTelegramAlert = (message: string, tg?: TelegramWebApp) => {
  const webApp = tg || getTelegramWebApp();
  if (webApp?.showAlert) {
    try {
      webApp.showAlert(message);
    } catch (error) {
      // Fallback to browser alert if Telegram method is not supported
      console.warn('Telegram showAlert not supported:', error);
      alert(message);
    }
  } else {
    alert(message);
  }
};

export const showTelegramConfirm = (
  message: string,
  callback: (confirmed: boolean) => void,
  tg?: TelegramWebApp
) => {
  const webApp = tg || getTelegramWebApp();
  if (webApp?.showConfirm) {
    try {
      webApp.showConfirm(message, callback);
    } catch (error) {
      // Fallback to browser confirm if Telegram method is not supported
      console.warn('Telegram showConfirm not supported:', error);
      const confirmed = confirm(message);
      callback(confirmed);
    }
  } else {
    const confirmed = confirm(message);
    callback(confirmed);
  }
};

export const hapticFeedback = (
  type: 'impact' | 'notification' | 'selection',
  style?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' | 'error' | 'success' | 'warning',
  tg?: TelegramWebApp | null
) => {
  const webApp = tg || getTelegramWebApp();
  if (!webApp?.HapticFeedback) return;

  switch (type) {
    case 'impact':
      if (style && ['light', 'medium', 'heavy', 'rigid', 'soft'].includes(style)) {
        webApp.HapticFeedback.impactOccurred(style as any);
      }
      break;
    case 'notification':
      if (style && ['error', 'success', 'warning'].includes(style)) {
        webApp.HapticFeedback.notificationOccurred(style as any);
      }
      break;
    case 'selection':
      webApp.HapticFeedback.selectionChanged();
      break;
  }
};

export const trackTelegramAnalytics = (event: string, data?: any) => {
  if (typeof window !== 'undefined' && window.telegramAnalytics && typeof window.telegramAnalytics.track === 'function') {
    window.telegramAnalytics.track(event, data);
  }
  // Analytics disabled - no logging to keep console clean
};

// Helper function for API routes to get user from Telegram WebApp data
export async function getUserFromTelegram(request: Request): Promise<{ id: number; first_name?: string; last_name?: string; username?: string; is_premium?: boolean; photo_url?: string } | null> {
  try {
    // Check for init data in headers (for client-side fetch calls)
    const initDataHeader = (request as any).headers?.get?.('X-Telegram-Init-Data') || 
                            (request as any).headers?.get?.('x-telegram-init-data');
    
    if (initDataHeader) {
      console.log('📱 Got init data from header, length:', initDataHeader.length);
      
      // Parse the initData string (it's in URLSearchParams format)
      const params = new URLSearchParams(initDataHeader);
      const userParam = params.get('user');
      
      if (userParam) {
        try {
        const userData = JSON.parse(decodeURIComponent(userParam));
          console.log('✅ Extracted user from header:', {
            id: userData.id,
            username: userData.username,
            first_name: userData.first_name
          });
          
          // Validate user ID is a real Telegram user ID (should be >= 100000)
          if (userData.id && userData.id >= 100000) {
        return {
          id: userData.id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          username: userData.username,
              is_premium: userData.is_premium,
              photo_url: userData.photo_url
        };
          } else {
            console.error('❌ Invalid user ID:', userData.id);
            return null;
          }
        } catch (parseError) {
          console.error('❌ Failed to parse user data from header:', parseError);
          return null;
        }
      } else {
        console.error('❌ No user param in initData header');
        return null;
      }
    }
    
    // Extract user data from the request URL or headers
    const url = new URL(request.url);
    const tgWebAppData = url.searchParams.get('tgWebAppData');
    
    if (tgWebAppData) {
      // Parse the Telegram WebApp data
      const params = new URLSearchParams(tgWebAppData);
      const userParam = params.get('user');
      
      if (userParam) {
        try {
        const userData = JSON.parse(decodeURIComponent(userParam));
          console.log('📱 Extracted user from Telegram WebApp URL:', {
            id: userData.id,
            username: userData.username
          });
          
          if (userData.id && userData.id >= 100000) {
        return {
          id: userData.id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          username: userData.username,
              is_premium: userData.is_premium,
              photo_url: userData.photo_url
            };
          }
        } catch (parseError) {
          console.error('❌ Failed to parse user data from URL:', parseError);
        }
      }
    }
    
    // NO FALLBACK TO TEST USER - Require real Telegram authentication
    console.error('❌ No valid Telegram authentication found. Request must include X-Telegram-Init-Data header.');
    return null;
  } catch (error) {
    console.error('❌ Error getting user from Telegram:', error);
    return null;
  }
}
