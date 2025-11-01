/**
 * API Client
 * Centralized functions for making authenticated API requests
 */

/**
 * Get authentication headers for API requests
 * @returns Headers with Telegram auth data
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  
  // Get Telegram initData if available
  const webApp = (typeof window !== 'undefined') 
    ? ((window as any).Telegram?.WebApp || (window as any).tg)
    : null;
  
  if (webApp?.initData) {
    headers['X-Telegram-Init-Data'] = webApp.initData;
  }
  
  return headers;
}

/**
 * Refresh Telegram WebApp data
 */
export function refreshTelegramWebApp(): void {
  const webApp = (typeof window !== 'undefined') 
    ? ((window as any).Telegram?.WebApp || (window as any).tg)
    : null;
  
  if (webApp) {
    try {
      webApp.ready();
      webApp.expand();
    } catch (error) {
      console.warn('Failed to refresh WebApp:', error);
    }
  }
}



