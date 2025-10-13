export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
};

export type TelegramWebApp = {
  ready: () => void;
  expand: () => void;
  close: () => void;
  showPopup: (params: {
    title?: string;
    message: string;
    buttons?: Array<{
      type: string;
      text?: string;
      id?: string;
    }>;
  }) => void;
  switchInlineQuery: (query: string) => void;
  openTelegramLink: (url: string) => void;
  openLink: (url: string) => void;
  postEvent: (eventName: string, eventData?: any) => void;
  onEvent: (eventName: string, callback: (data?: any) => void) => void;
  shareToStory: (params: {
    media_url: string;
    text?: string;
    widget_link?: {
      url: string;
      text?: string;
    };
  }) => void;
  MainButton: {
    show: () => void;
    hide: () => void;
    setText: (text: string) => void;
    onClick: (fn: () => void) => void;
    offClick: (fn: () => void) => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (fn: () => void) => void;
    offClick: (fn: () => void) => void;
  };
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramUser;
    auth_date?: number;
    hash?: string;
  };
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  version?: string;
  isTestMode?: boolean;
};

// Create a mock Telegram Web App for when the real one is not available
export const createMockTelegramWebApp = (): TelegramWebApp => {
  const logWarning = (feature: string) => console.warn(`${feature} not available`);

  return {
    ready: () => logWarning('Telegram WebApp'),
    expand: () => logWarning('Telegram expand'),
    close: () => logWarning('Telegram close'),
    showPopup: () => logWarning('Telegram showPopup'),
    switchInlineQuery: () => logWarning('Telegram switchInlineQuery'),
    openTelegramLink: () => logWarning('Telegram openTelegramLink'),
    openLink: () => logWarning('Telegram openLink'),
    postEvent: () => logWarning('Telegram postEvent'),
    onEvent: () => logWarning('Telegram onEvent'),
    shareToStory: () => logWarning('Telegram shareToStory'),
    MainButton: {
      show: () => logWarning('MainButton.show'),
      hide: () => logWarning('MainButton.hide'),
      setText: () => logWarning('MainButton.setText'),
      onClick: () => logWarning('MainButton.onClick'),
      offClick: () => logWarning('MainButton.offClick'),
      enable: () => logWarning('MainButton.enable'),
      disable: () => logWarning('MainButton.disable'),
      showProgress: () => logWarning('MainButton.showProgress'),
      hideProgress: () => logWarning('MainButton.hideProgress'),
    },
    BackButton: {
      show: () => logWarning('BackButton.show'),
      hide: () => logWarning('BackButton.hide'),
      onClick: () => logWarning('BackButton.onClick'),
      offClick: () => logWarning('BackButton.offClick'),
    },
    initData: '',
    initDataUnsafe: {},
    themeParams: {},
    version: '',
    isTestMode: false,
  };
};

// Function to get the Telegram Web App instance, falling back to a mock if not available
export const getTelegramWebApp = (): TelegramWebApp => {
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
    return (window as any).Telegram.WebApp as TelegramWebApp;
  }
  return createMockTelegramWebApp();
};
