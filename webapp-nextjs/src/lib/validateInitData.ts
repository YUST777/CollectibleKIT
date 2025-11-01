/**
 * Helper to validate Telegram WebApp initData
 */

export function validateInitData(initData: string): boolean {
  if (!initData) return false;
  
  try {
    const params = new URLSearchParams(initData);
    
    // Check for required parameters
    const authDate = params.get('auth_date');
    const hash = params.get('hash');
    const user = params.get('user');
    
    if (!authDate || !hash || !user) {
      return false;
    }
    
    // Parse user data
    try {
      JSON.parse(decodeURIComponent(user));
    } catch (e) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error validating initData:', error);
    return false;
  }
}

export function getUserIdFromInitData(initData: string): string | null {
  try {
    const params = new URLSearchParams(initData);
    const user = params.get('user');
    
    if (!user) return null;
    
    const userData = JSON.parse(decodeURIComponent(user));
    return userData.id?.toString() || null;
  } catch (error) {
    console.error('Error parsing user ID from initData:', error);
    return null;
  }
}

