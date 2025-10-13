import { createContext, useContext } from 'react';
import type { AttributeWithPercentage, Item } from './db';
import type { TelegramUser } from './telegram';

export type GiftCollectionData = {
  giftName: string;
  items: Item[];
  totalItems: number;
  totalPages: number;
};

export type Gift = {
  name: string;
  total: number;
};

export type Filters = {
  attributes: Record<string, string[]>;
};

export type AppState = {
  collectionData: GiftCollectionData | null;
  currentPage: number;
  itemsPerPage: number;
  filters: Filters;
  gifts: Gift[];
  performanceMode: boolean;
  darkMode: boolean;
  attributesWithPercentages: AttributeWithPercentage;
  telegramUser: TelegramUser | null;
  sortOption: string;
};

export type AppAction =
  | { type: 'SET_COLLECTION_DATA'; payload: GiftCollectionData }
  | { type: 'SET_CURRENT_PAGE'; payload: number }
  | { type: 'SET_ITEMS_PER_PAGE'; payload: number }
  | { type: 'SET_FILTERS'; payload: Filters }
  | { type: 'SET_GIFTS'; payload: Gift[] }
  | { type: 'SET_PERFORMANCE_MODE'; payload: boolean }
  | { type: 'SET_DARK_MODE'; payload: boolean }
  | { type: 'SET_ATTRIBUTES_WITH_PERCENTAGES'; payload: AttributeWithPercentage }
  | { type: 'SET_TELEGRAM_USER'; payload: TelegramUser | null }
  | { type: 'SET_SORT_OPTION'; payload: string };

export const initialState: AppState = {
  collectionData: null,
  currentPage: 1,
  itemsPerPage: 12,
  filters: { attributes: {} },
  gifts: [],
  performanceMode: true, // Set to true by default
  darkMode: false,
  attributesWithPercentages: {},
  telegramUser: null,
  sortOption: 'id-asc',
};

export const loadPersistedState = (): Partial<AppState> => {
  // Return empty state during SSR
  if (typeof window === 'undefined') {
    return {
      darkMode: false,
      performanceMode: false,
      filters: { attributes: {} },
      itemsPerPage: 10,
      sortOption: 'newest'
    };
  }

  try {
    const persistedState: Partial<AppState> = {};

    const performanceMode = localStorage.getItem('performanceMode');
    if (performanceMode) {
      persistedState.performanceMode = JSON.parse(performanceMode);
    }

    const darkMode = localStorage.getItem('darkMode');
    if (darkMode) {
      persistedState.darkMode = JSON.parse(darkMode);
    }

    const filters = localStorage.getItem('filters');
    if (filters) {
      persistedState.filters = JSON.parse(filters);
    }

    const itemsPerPage = localStorage.getItem('itemsPerPage');
    if (itemsPerPage) {
      persistedState.itemsPerPage = JSON.parse(itemsPerPage);
    }

    const sortOption = localStorage.getItem('sortOption');
    if (sortOption) {
      persistedState.sortOption = JSON.parse(sortOption);
    }

    return persistedState;
  } catch (error) {
    console.error('Failed to load persisted state:', error);
    return {
      darkMode: false,
      performanceMode: false,
      filters: { attributes: {} },
      itemsPerPage: 10,
      sortOption: 'newest'
    };
  }
};

export const persistState = (key: keyof AppState, value: any) => {
  if (typeof window === 'undefined') return;

  try {
    if (key === 'performanceMode' || key === 'filters' || key === 'itemsPerPage' || key === 'darkMode' || key === 'sortOption') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    console.error(`Failed to persist state for ${key}:`, error);
  }
};

export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_COLLECTION_DATA':
      return { ...state, collectionData: action.payload };

    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };

    case 'SET_ITEMS_PER_PAGE':
      persistState('itemsPerPage', action.payload);
      return { ...state, itemsPerPage: action.payload };

    case 'SET_FILTERS':
      persistState('filters', action.payload);
      return { ...state, filters: action.payload };

    case 'SET_GIFTS':
      return { ...state, gifts: action.payload };

    case 'SET_PERFORMANCE_MODE':
      persistState('performanceMode', action.payload);
      return { ...state, performanceMode: action.payload };

    case 'SET_DARK_MODE':
      persistState('darkMode', action.payload);
      return { ...state, darkMode: action.payload };

    case 'SET_ATTRIBUTES_WITH_PERCENTAGES':
      return { ...state, attributesWithPercentages: action.payload };

    case 'SET_TELEGRAM_USER':
      return { ...state, telegramUser: action.payload };

    case 'SET_SORT_OPTION':
      persistState('sortOption', action.payload);
      return { ...state, sortOption: action.payload };

    default:
      return state;
  }
};

export const AppStateContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}>({
  state: initialState,
  dispatch: () => null,
});

export const useAppState = () => useContext(AppStateContext);
