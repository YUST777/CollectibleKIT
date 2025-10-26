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
  if (typeof window !== 'undefined') {
    return window.tg || window.Telegram?.WebApp || null;
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
        url: "https://t.me/TWETestBot",
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
    webApp.showAlert(message);
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
    webApp.showConfirm(message, callback);
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
export async function getUserFromTelegram(request: Request): Promise<{ id: number; first_name?: string; last_name?: string; username?: string; is_premium?: boolean } | null> {
  try {
    // Extract user data from the request URL or headers
    const url = new URL(request.url);
    const tgWebAppData = url.searchParams.get('tgWebAppData');
    
    if (tgWebAppData) {
      // Parse the Telegram WebApp data
      const params = new URLSearchParams(tgWebAppData);
      const userParam = params.get('user');
      
      if (userParam) {
        const userData = JSON.parse(decodeURIComponent(userParam));
        console.log('📱 Extracted user from Telegram WebApp:', userData);
        return {
          id: userData.id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          username: userData.username,
          is_premium: userData.is_premium
        };
      }
    }
    
    // Development mode: Allow testing in browser with a default user
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode: Using default test user');
      return {
        id: 123456789, // Default test user ID
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        is_premium: false
      };
    }
    
    console.log('❌ No valid Telegram authentication found');
    return null;
  } catch (error) {
    console.error('Error getting user from Telegram:', error);
    return null;
  }
}
