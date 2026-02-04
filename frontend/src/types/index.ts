// Global window extensions
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
    lottie?: any;
    TonConnectUI?: any;
    // Monetag SDK - In-App Interstitial (automatic, no manual trigger needed)
    show_10065186?: (config?: {
      type?: 'inApp' | 'preload';
      inAppSettings?: {
        frequency?: number;
        capping?: number;
        interval?: number;
        timeout?: number;
        everyPage?: boolean;
      };
      ymid?: string;
    }) => Promise<void>;
  }
}

// Telegram WebApp types
export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    chat?: any;
    auth_date?: number;
    hash?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  viewportWidth?: number;
  viewportStableHeight?: number;
  safeAreaInsets?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  setBottomBarColor?: (color: string) => void;
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
    header_bg_color?: string;
    accent_text_color?: string;
    section_bg_color?: string;
    section_header_text_color?: string;
    subtitle_text_color?: string;
    destructive_text_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  isVerticalSwipesEnabled: boolean;
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  showAlert: (message: string) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  showPopup: (params: any, callback?: (button_id: string) => void) => void;
  showScanQrPopup: (params: any, callback?: (text: string) => void) => void;
  closeScanQrPopup: () => void;
  readTextFromClipboard: (callback?: (text: string) => void) => void;
  requestWriteAccess: (callback?: (granted: boolean) => void) => void;
  requestContact: (callback?: (granted: boolean) => void) => void;
  ready: () => void;
  expand: () => void;
  close: () => void;
  sendData: (data: string) => void;
  switchInlineQuery: (query: string, choose_chat_types?: string[]) => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink: (url: string) => void;
  openInvoice: (url: string, callback?: (status: string) => void) => void;
  shareToStory: (url: string, params?: {
    text?: string;
    widget_link?: {
      url: string;
      name?: string;
    };
  }) => void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isProgressVisible: boolean;
    isActive: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    setParams: (params: any) => void;
  };
  BackButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  onEvent: (eventType: string, eventHandler: () => void) => void;
  offEvent: (eventType: string, eventHandler: () => void) => void;
}

export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  added_to_attachment_menu?: boolean;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

// App types
export interface User {
  user_id: number;
  username?: string;
  first_name?: string;
  credits: number;
  user_type: 'vip' | 'premium' | 'normal';
  can_process: boolean;
  watermark: boolean;
  credits_remaining: number | 'unlimited';
  created_at?: number;
  last_activity?: number;
  ton_balance?: number;
  first_win_claimed?: boolean;
  daily_wins_count?: number;
  last_win_date?: string;
  streak_days?: number;
  last_streak_click?: string;
  streak_completed?: boolean;
}

export interface StoryPiece {
  id: number;
  imageDataUrl: string;
  isSent: boolean;
}

export interface ProcessingResult {
  success: boolean;
  story_pieces?: StoryPiece[];
  pieces_count?: number;
  user_type?: string;
  watermark?: boolean;
  credits_remaining?: number | 'unlimited';
  credits_used?: number;
  error?: string;
}

export interface Gift {
  name: string;
}

export interface GiftModel {
  number: number;
  name: string;
  rarity: number;
}

export interface Backdrop {
  name: string;
  centerColor: number;
  edgeColor: number;
  patternColor: number;
  textColor: number;
  rarityPermille: number;
  hex: {
    centerColor: string;
    edgeColor: string;
    patternColor: string;
    textColor: string;
  };
}

export interface GiftDesign {
  giftName: string;
  modelNumber: number;
  backdropIndex: number;
  backdropName: string;
  patternIndex?: number;
  patternName?: string;
  previewDataUrl?: string;
  ribbonNumber?: number;
  isRealGift?: boolean;
  realGiftDominantColor?: string;
}

export interface SavedCollection {
  id: string;
  name: string;
  designs: GiftDesign[];
  createdAt: string;
}

export interface FilterOption {
  name: string;
  type: 'gift' | 'model' | 'backdrop' | 'pattern';
  number?: number; // For models
  rarity?: number; // For models
  index?: number; // For backdrops
  hex?: { centerColor: string; edgeColor: string }; // For backdrops
  rarityPermille?: number; // For patterns
}

export interface Pattern {
  name: string;
  rarityPermille: number;
}

export interface DailyGameQuestion {
  id: number;
  date: string;
  time_slot: string;
  game_type: 'emoji' | 'zoom';
  question: string;
  emojis?: string[];
  gift_name?: string;
  model_name?: string;
  backdrop_index?: number;
  reward: number;
  solved_by?: number;
  solvers_count: number;
}

export interface GameAnswer {
  success: boolean;
  correct: boolean;
  first_solver: boolean;
  reward: number;
  message: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  reward: number;
  rewardType: 'credit' | 'ton';
  completed: boolean;
  progress?: number;
  maxProgress?: number;
  action?: () => void;
}

export interface TonBalance {
  balance: number;
  rewards: number;
  walletConnected: boolean;
  walletAddress?: string;
}

// Component prop types
export interface TabProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

// API types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ProcessImageRequest {
  image: File;
  userId: number;
  customWatermark?: string;
}

export interface UploadStoryPieceRequest {
  image: File;
  userId: string;
}

export interface PaymentVerificationRequest {
  userId: number;
  transaction: any;
  walletAddress: string;
}

// Store types
export interface AppState {
  user: User | null;
  currentTab: string;
  storyPieces: StoryPiece[];
  isProcessing: boolean;
  giftDesigns: Record<number, GiftDesign>;
  tonBalance: TonBalance;
  tasks: Task[];
  dailyGame: DailyGameQuestion | null;
  isModalOpen: boolean;
  modalContent: React.ReactNode | null;
  isDrawerOpen: boolean;
  // New side drawer navigation state
  isSideDrawerOpen?: boolean;
  drawerType?: 'tools' | 'games' | null;
  lastUsedDrawer?: 'tools' | 'games' | null;
  
  // Collection state
  gifts: Gift[];
  backdrops: Backdrop[];
  giftModels: Record<string, GiftModel[]>;
  patterns: Record<string, Pattern[]>;
  gridSize: number;
  userDesigns: Record<number, GiftDesign>;
  savedCollections: SavedCollection[];
}

export interface AppActions {
  setUser: (user: User | null) => void;
  setCurrentTab: (tab: string) => void;
  setStoryPieces: (pieces: StoryPiece[]) => void;
  setIsProcessing: (processing: boolean) => void;
  updateGiftDesign: (slot: number, design: GiftDesign) => void;
  setTonBalance: (balance: TonBalance) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  setDailyGame: (game: DailyGameQuestion | null) => void;
  openModal: (content: React.ReactNode) => void;
  closeModal: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  // Side drawer actions
  openSideDrawer: (type: 'tools' | 'games') => void;
  closeSideDrawer: () => void;
  setLastUsedDrawer: (type: 'tools' | 'games' | null) => void;
  
  // Collection actions
  setGifts: (gifts: Gift[]) => void;
  setBackdrops: (backdrops: Backdrop[]) => void;
  setGiftModels: (giftName: string, models: GiftModel[]) => void;
  setPatterns: (giftName: string, patterns: Pattern[]) => void;
  setGridSize: (size: number) => void;
  setGiftDesign: (slot: number, design: GiftDesign) => void;
  setUserDesigns: (designs: Record<number, GiftDesign>) => void;
  saveCollection: (name: string, designs: GiftDesign[], isPublic?: boolean) => Promise<boolean>;
  loadCollection: (collectionId: string) => void;
  loadCollections: () => Promise<void>;
  deleteCollection: (collectionId: string) => void;
}
