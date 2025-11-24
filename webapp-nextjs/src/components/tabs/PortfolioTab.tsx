'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet';
import { AdsBanner } from '@/components/AdsBanner';
import { useUser } from '@/store/useAppStore';
import { useTelegram } from '@/components/providers/TelegramProvider';
import { hapticFeedback } from '@/lib/telegram';
import { getGiftPrice } from '@/lib/portalMarketService';
import { EyeIcon, EyeSlashIcon, StarIcon, Cog6ToothIcon, PlusIcon, XMarkIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { getBuyPriceInStars, starsToUsd } from '@/lib/unupgradeableGiftPrices';
import { cacheUtils } from '@/lib/cache';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });
const ModelThumbnail = dynamic(() => import('@/components/ModelThumbnail').then(mod => ({ default: mod.ModelThumbnail })), { ssr: false });

// Helper function to get collection image URL
const getCollectionImageUrl = (giftName: string): string => {
  const nameMap: { [key: string]: string } = {
    'Artisan Brick': 'Artisan_Brick',
    'Astral Shard': 'Astral_Shard',
    'B-Day Candle': 'B_Day_Candle',
    'Berry Box': 'Berry_Box',
    'Big Year': 'Big_Year',
    'Bonded Ring': 'Bonded_Ring',
    'Bow Tie': 'Bow_Tie',
    'Bunny Muffin': 'Bunny_Muffin',
    'Candy Cane': 'Candy_Cane',
    'Clover Pin': 'Clover_Pin',
    'Cookie Heart': 'Cookie_Heart',
    'Crystal Ball': 'Crystal_Ball',
    'Cupid Charm': 'Cupid_Charm',
    'Desk Calendar': 'Desk_Calendar',
    'Diamond Ring': 'Diamond_Ring',
    'Durov\'s Cap': 'Durovs_Cap',
    'Easter Egg': 'Easter_Egg',
    'Electric Skull': 'Electric_Skull',
    'Eternal Candle': 'Eternal_Candle',
    'Eternal Rose': 'Eternal_Rose',
    'Evil Eye': 'Evil_Eye',
    'Faith Amulet': 'Faith_Amulet',
    'Flying Broom': 'Flying_Broom',
    'Fresh Socks': 'Fresh_Socks',
    'Gem Signet': 'Gem_Signet',
    'Genie Lamp': 'Genie_Lamp',
    'Ginger Cookie': 'Ginger_Cookie',
    'Hanging Star': 'Hanging_Star',
    'Happy Brownie': 'Happy_Brownie',
    'Heart Locket': 'Heart_Locket',
    'Heroic Helmet': 'Heroic_Helmet',
    'Hex Pot': 'Hex_Pot',
    'Holiday Drink': 'Holiday_Drink',
    'Homemade Cake': 'Homemade_Cake',
    'Hypno Lollipop': 'Hypno_Lollipop',
    'Ice Cream': 'Ice_Cream',
    'Input Key': 'Input_Key',
    'Instant Ramen': 'Instant_Ramen',
    'Ion Gem': 'Ion_Gem',
    'Ionic Dryer': 'Ionic_Dryer',
    'Jack-in-the-Box': 'Jack_in_the_Box',
    'Jelly Bunny': 'Jelly_Bunny',
    'Jester Hat': 'Jester_Hat',
    'Jingle Bells': 'Jingle_Bells',
    'Jolly Chimp': 'Jolly_Chimp',
    'Joyful Bundle': 'Joyful_Bundle',
    'Kissed Frog': 'Kissed_Frog',
    'Light Sword': 'Light_Sword',
    'Lol Pop': 'Lol_Pop',
    'Loot Bag': 'Loot_Bag',
    'Love Candle': 'Love_Candle',
    'Love Potion': 'Love_Potion',
    'Low Rider': 'Low_Rider',
    'Lunar Snake': 'Lunar_Snake',
    'Lush Bouquet': 'Lush_Bouquet',
    'Mad Pumpkin': 'Mad_Pumpkin',
    'Magic Potion': 'Magic_Potion',
    'Mighty Arm': 'Mighty_Arm',
    'Mini Oscar': 'Mini_Oscar',
    'Moon Pendant': 'Moon_Pendant',
    'Mousse Cake': 'Mousse_Cake',
    'Nail Bracelet': 'Nail_Bracelet',
    'Neko Helmet': 'Neko_Helmet',
    'Party Sparkler': 'Party_Sparkler',
    'Perfume Bottle': 'Perfume_Bottle',
    'Pet Snake': 'Pet_Snake',
    'Plush Pepe': 'Plush_Pepe',
    'Precious Peach': 'Precious_Peach',
    'Record Player': 'Record_Player',
    'Restless Jar': 'Restless_Jar',
    'Sakura Flower': 'Sakura_Flower',
    'Santa Hat': 'Santa_Hat',
    'Scared Cat': 'Scared_Cat',
    'Sharp Tongue': 'Sharp_Tongue',
    'Signet Ring': 'Signet_Ring',
    'Skull Flower': 'Skull_Flower',
    'Sky Stilettos': 'Sky_Stilettos',
    'Sleigh Bell': 'Sleigh_Bell',
    'Snake Box': 'Snake_Box',
    'Snoop Cigar': 'Snoop_Cigar',
    'Snoop Dogg': 'Snoop_Dogg',
    'Snow Globe': 'Snow_Globe',
    'Snow Mittens': 'Snow_Mittens',
    'Spiced Wine': 'Spiced_Wine',
    'Spring Basket': 'Spring_Basket',
    'Spy Agaric': 'Spy_Agaric',
    'Star Notepad': 'Star_Notepad',
    'Stellar Rocket': 'Stellar_Rocket',
    'Swag Bag': 'SwagBag',
    'Swiss Watch': 'Swiss_Watch',
    'Tama Gadget': 'Tama_Gadget',
    'Top Hat': 'Top_Hat',
    'Toy Bear': 'Toy_Bear',
    'Trapped Heart': 'Trapped_Heart',
    'Valentine Box': 'Valentine_Box',
    'Vintage Cigar': 'Vintage_Cigar',
    'Voodoo Doll': 'Voodoo_Doll',
    'West Side Sign': 'WestsideSign',
    'Whip Cupcake': 'Whip_Cupcake',
    'Winter Wreath': 'Winter_Wreath',
    'Witch Hat': 'Witch_Hat',
    'Xmas Stocking': 'Xmas_Stocking'
  };
  
  const filename = nameMap[giftName] || giftName.replace(/\s+/g, '_');
  return `/assets/gifts/${filename}.png`;
};

// Helper function to get sticker image URL
const getStickerImageUrl = (collection: string, character: string, filename?: string): string => {
  // Convert collection and character to lowercase snake_case
  const collectionPath = collection.toLowerCase().replace(/\s+/g, '_');
  const characterPath = character.toLowerCase().replace(/\s+/g, '_');
  
  // Use provided filename or default to 1_png
  const file = filename || '1_png';
  
  // Return path to local sticker file
  return `/sticker_collections/${collectionPath}/${characterPath}/${file}`;
};

// Helper function to get gift image URL - handles both upgraded (slug format) and unupgradeable (numeric ID) gifts
const getGiftImageUrl = (gift: { image_url?: string | null; id?: string | number | null }): string | null => {
  // Use image_url if provided (should already be correct)
  if (gift.image_url) {
    return gift.image_url;
  }
  
  // If no image_url, determine from gift.id
  if (!gift.id) {
    return null;
  }
  
  const giftId = gift.id.toString();
  
  // Check if gift ID looks like a slug (upgraded gift format: "Collection-Number")
  // e.g., "TamaGadget-65287", "JollyChimp-38859", etc.
  if (giftId.includes('-') && /^[a-zA-Z]/.test(giftId)) {
    // This is an upgraded gift slug - use fragment.com URL format
    return `https://nft.fragment.com/gift/${giftId.toLowerCase()}.medium.jpg`;
  } else {
    // This is a numeric ID (unupgradeable gift) - use cdn.changes.tg URL
    return `https://cdn.changes.tg/gifts/originals/${giftId}/Original.png`;
  }
};

interface PortfolioGift {
  slug: string;
  num: number | null;
  title: string;
  model_name?: string | null;
  backdrop_name?: string | null;
  pattern_name?: string | null;
  model_rarity?: number | null;
  backdrop_rarity?: number | null;
  pattern_rarity?: number | null;
  model_display?: string;
  backdrop_display?: string;
  pattern_display?: string;
  pinned: boolean;
  fragment_url: string | null;
  price?: number | null;
  priceError?: string;
  availability_issued?: number | null;
  availability_total?: number | null;
  total_supply?: string;
  owner_username?: string | null;
  owner_name?: string | null;
  is_custom?: boolean; // Flag to distinguish custom vs auto gifts
  gift_id?: number; // Database ID for custom gifts
  is_unupgradeable?: boolean; // Can't be upgraded (no mint available)
  is_unupgraded?: boolean; // Can be upgraded but user hasn't minted yet
}

interface PortfolioHistoryPoint {
  date: string;
  total_value: number;
  gifts_count: number;
}

interface StickerNFT {
  collection: string;
  character: string;
  token_id: string;
  sticker_ids: number[];
  sticker_count: number;
  init_price_usd?: number;
  current_price_usd?: number;
  collection_id?: number;
  sticker_preview_url?: string;
  sticker_thumbnail_url?: string;
  is_custom?: boolean;
  sticker_id?: number;
  filename?: string;
}

interface StickerPortfolio {
  profile: {
    user: {
      id: string;
      name: string;
    };
    total_nfts: number;
    total_stickers: number;
  };
  stickers: StickerNFT[];
  portfolio_value: {
    collections: Array<{
      collection: string;
      count: number;
      init: number;
      current: number;
      pnl: number;
    }>;
    total_init: number;
    total_current: number;
    total_pnl: number;
  };
}

export const PortfolioTab: React.FC = () => {
  const user = useUser();
  const { webApp } = useTelegram();
  const [activeTab, setActiveTab] = useState<'gifts' | 'stickers'>('gifts');
  const [gifts, setGifts] = useState<PortfolioGift[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Start as false, will be set to true when loading starts
  const [totalValue, setTotalValue] = useState(0);
  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioHistoryPoint[]>([]);
  
  // Sticker portfolio state
  const [stickers, setStickers] = useState<StickerNFT[]>([]);
  const [stickerPortfolio, setStickerPortfolio] = useState<StickerPortfolio | null>(null);
  const [stickersLoading, setStickersLoading] = useState(false);
  const [channelGifts, setChannelGifts] = useState<any[]>([]);
  const [duckLottieData, setDuckLottieData] = useState<any>(null);
  const [isGiftChartOpen, setIsGiftChartOpen] = useState(false);
  const [selectedGift, setSelectedGift] = useState<PortfolioGift | null>(null);
  const [selectedSticker, setSelectedSticker] = useState<StickerNFT | null>(null);
  const [isStickerDrawerOpen, setIsStickerDrawerOpen] = useState(false);
  const [chartType, setChartType] = useState<'24h' | '3d' | '1w' | '1m' | '3m'>('1w');
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const pricesFetchedRef = useRef<Set<string>>(new Set());

  // Portfolio chart state
  const [portfolioChartType, setPortfolioChartType] = useState<'24h' | '3d' | '1w' | '1m'>('1w');
  const [portfolioChartMode, setPortfolioChartMode] = useState<'gift' | 'model'>('gift');
  const [portfolioChartData, setPortfolioChartData] = useState<any[]>([]);
  const [portfolioChartLoading, setPortfolioChartLoading] = useState(false);
  const [showPortfolioSettings, setShowPortfolioSettings] = useState(false);
  const portfolioChartCanvasRef = useRef<HTMLCanvasElement>(null);

  // Currency preference (stored in localStorage)
  const [currency, setCurrency] = useState<'TON' | 'USD'>('TON');
  const [tonToUsdRate, setTonToUsdRate] = useState<number>(2.5); // Default fallback rate

  // Add Gift filter drawer state
  const [isAddGiftDrawerOpen, setIsAddGiftDrawerOpen] = useState(false);
  const [allGifts, setAllGifts] = useState<string[]>([]);
  const [unupgradeableGifts, setUnupgradeableGifts] = useState<Array<{id: string, name: string, shortName: string, floorPrice: number, imageUrl: string, supply: number, buyPriceStars?: number}>>([]);
  const [selectedGiftName, setSelectedGiftName] = useState<string | null>(null);
  const [selectedUnupgradeableGift, setSelectedUnupgradeableGift] = useState<{id: string, name: string, shortName: string, floorPrice: number, imageUrl: string, supply: number, buyPriceStars?: number} | null>(null);
  const [filterSearchTerm, setFilterSearchTerm] = useState('');
  const [ribbonNumber, setRibbonNumber] = useState<string>('');
  const [useFirstHandPrice, setUseFirstHandPrice] = useState<boolean>(false); // Toggle between first-hand (stars) and second-hand (market) prices

  // Reset toggle when selected gift changes
  useEffect(() => {
    if (selectedUnupgradeableGift) {
      // Default to second-hand price (false) if available, otherwise first-hand
      setUseFirstHandPrice(!selectedUnupgradeableGift.floorPrice && !!selectedUnupgradeableGift.buyPriceStars);
    }
  }, [selectedUnupgradeableGift]);
  
  // Channel gifts state
  const [addGiftTab, setAddGiftTab] = useState<'custom' | 'channel' | 'account'>('custom');
  const [channelUsername, setChannelUsername] = useState('');
  const [accountUsername, setAccountUsername] = useState('');
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);
  const [isLoadingChannel, setIsLoadingChannel] = useState(false);
  const [isChannelGiftDrawerOpen, setIsChannelGiftDrawerOpen] = useState(false);
  const [selectedChannelGift, setSelectedChannelGift] = useState<any>(null);
  
  // Custom confirmation dialog state (for desktop where window.confirm doesn't work)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
  });

  // Add Sticker drawer state
  const [isAddStickerDrawerOpen, setIsAddStickerDrawerOpen] = useState(false);
  const [stickerCollections, setStickerCollections] = useState<Array<{name: string, samplePack: string, sampleFilename: string}>>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [stickerPacks, setStickerPacks] = useState<Array<{name: string, filename: string}>>([]);
  const [selectedPack, setSelectedPack] = useState<{name: string, filename: string} | null>(null);
  const [stickerSearchTerm, setStickerSearchTerm] = useState('');
  const [stickerPackSearchTerm, setStickerPackSearchTerm] = useState('');
  const [showStickerSettings, setShowStickerSettings] = useState(false);

  // Filter drawer state
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<{
    status?: string[]; // 'upgraded', 'unupgraded', 'channels'
    backgrounds?: string[];
    models?: string[];
    collections?: string[];
    priceMin?: number | null;
    priceMax?: number | null;
  }>({});
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState<{
    status: boolean;
    collection: boolean;
    model: boolean;
    background: boolean;
    price: boolean;
  }>({
    status: false,
    collection: false,
    model: false,
    background: false,
    price: false,
  });

  // Hidden items state management (stored in localStorage)
  const getHiddenItemsKey = () => `portfolio_hidden_items_${user?.user_id || 'default'}`;
  
  const getHiddenItems = (): Set<string> => {
    try {
      const key = getHiddenItemsKey();
      const stored = localStorage.getItem(key);
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Error reading hidden items:', e);
    }
    return new Set<string>();
  };

  const setHiddenItems = (hiddenSet: Set<string>) => {
    try {
      const key = getHiddenItemsKey();
      localStorage.setItem(key, JSON.stringify(Array.from(hiddenSet)));
    } catch (e) {
      console.warn('Error saving hidden items:', e);
    }
  };

  // Filter function - checks if a gift matches all active filters
  const matchesFilters = (gift: PortfolioGift): boolean => {
    // Status filter (upgraded, unupgraded, channels)
    if (filters.status && filters.status.length > 0) {
      const isUpgraded = !gift.is_unupgradeable && !gift.is_unupgraded;
      const isUnupgraded = gift.is_unupgradeable || gift.is_unupgraded;
      // Check if gift is channel-related (channel gifts might have specific properties)
      // For now, we'll check if it's a custom gift that might be from a channel
      const giftAny = gift as any;
      const isChannel = giftAny.is_channel || (giftAny.is_custom === false) || false;
      
      const statusMatch = filters.status.some(status => {
        if (status === 'upgraded' && isUpgraded) return true;
        if (status === 'unupgraded' && isUnupgraded) return true;
        if (status === 'channels' && isChannel) return true;
        return false;
      });
      
      if (!statusMatch) return false;
    }
    if (filters.backgrounds && filters.backgrounds.length > 0) {
      if (!gift.backdrop_name || !filters.backgrounds.includes(gift.backdrop_name)) {
        return false;
      }
    }
    if (filters.models && filters.models.length > 0) {
      if (!gift.model_name || !filters.models.includes(gift.model_name)) {
        return false;
      }
    }
    if (filters.collections && filters.collections.length > 0) {
      if (!gift.title || !filters.collections.includes(gift.title)) {
        return false;
      }
    }
    if (filters.priceMin !== null && filters.priceMin !== undefined) {
      const price = gift.price || 0;
      if (price < filters.priceMin) return false;
    }
    if (filters.priceMax !== null && filters.priceMax !== undefined) {
      const price = gift.price || 0;
      if (price > filters.priceMax) return false;
    }
    return true;
  };

  // Get filtered gifts (for display only)
  const filteredGifts = gifts.filter(matchesFilters);

  const recalculateTotalValue = () => {
    const hidden = getHiddenItems();
    
    // Calculate channel gifts value excluding hidden ones
    const channelGiftsValue = channelGifts.reduce((sum: number, cg: any) => {
      const isHidden = hidden.has(`channel_${cg.channel_id}`);
      return sum + (isHidden ? 0 : (cg.total_value || 0));
    }, 0);
    
    // Calculate custom gifts value excluding hidden AND filtered ones
    const customGiftsValue = gifts.filter(g => g.is_custom).reduce((sum: number, g: any) => {
      const giftId = `custom_${g.slug || g.title}_${g.num || ''}`;
      const isHidden = hidden.has(giftId);
      const isFiltered = !matchesFilters(g);
      return sum + (isHidden || isFiltered ? 0 : (g.price || 0));
    }, 0);
    
    // Calculate auto gifts value excluding hidden AND filtered ones
    const autoGiftsValue = gifts.filter(g => !g.is_custom).reduce((sum: number, g: any) => {
      const giftId = `auto_${g.slug || g.title}_${g.num || ''}`;
      const isHidden = hidden.has(giftId);
      const isFiltered = !matchesFilters(g);
      return sum + (isHidden || isFiltered ? 0 : (g.price || 0));
    }, 0);
    
    const newTotalValue = autoGiftsValue + customGiftsValue + channelGiftsValue;
    setTotalValue(newTotalValue);
  };

  const toggleGiftHidden = (giftId: string) => {
    const hidden = getHiddenItems();
    if (hidden.has(giftId)) {
      hidden.delete(giftId);
    } else {
      hidden.add(giftId);
    }
    setHiddenItems(hidden);
    // Immediately recalculate total value
    recalculateTotalValue();
    return !hidden.has(giftId);
  };

  const toggleChannelGiftHidden = (channelId: string) => {
    const giftId = `channel_${channelId}`;
    return toggleGiftHidden(giftId);
  };

  const toggleStickerHidden = (stickerId: string) => {
    const giftId = `sticker_${stickerId}`;
    return toggleGiftHidden(giftId);
  };

  const isGiftHidden = (giftId: string): boolean => {
    return getHiddenItems().has(giftId);
  };

  const isChannelGiftHidden = (channelId: string): boolean => {
    return isGiftHidden(`channel_${channelId}`);
  };

  const isStickerHidden = (stickerId: string): boolean => {
    return isGiftHidden(`sticker_${stickerId}`);
  };

  // Load currency preference from localStorage
  useEffect(() => {
    const savedCurrency = localStorage.getItem('portfolio_currency') as 'TON' | 'USD' | null;
    if (savedCurrency) {
      setCurrency(savedCurrency);
    }
  }, []);

  // Fetch TON to USD exchange rate
  useEffect(() => {
    const fetchTonPrice = async () => {
      try {
        // Try to fetch from our cached API endpoint (1 hour cache)
        const response = await fetch('/api/ton-price');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.rate) {
            setTonToUsdRate(data.rate);
            localStorage.setItem('ton_to_usd_rate', data.rate.toString());
            console.log('✅ TON price loaded:', data.rate, data.cached ? '(cached)' : '(fresh)');
            return;
          }
        }
      } catch (error) {
        console.error('Failed to fetch TON price from API:', error);
      }
      
      // Fallback: use a cached rate or default
      const cachedRate = localStorage.getItem('ton_to_usd_rate');
      if (cachedRate) {
        setTonToUsdRate(parseFloat(cachedRate));
        console.log('✅ TON price from localStorage:', cachedRate);
      }
    };
    
    fetchTonPrice();
  }, []);

  // Load duck animation for Coming Soon section
  useEffect(() => {
    fetch('/coding-duck.json')
      .then(res => res.json())
      .then(data => setDuckLottieData(data))
      .catch(err => console.error('Failed to load coding duck animation:', err));
  }, []);

  // Load all gifts for filter
  useEffect(() => {
    const loadAllGifts = async () => {
      try {
        // Use cacheUtils which handles caching and API calls
        const gifts = await cacheUtils.getGifts();
        setAllGifts(gifts || []);
      } catch (error) {
        console.error('Failed to load gifts:', error);
        // Set empty array on error to prevent undefined issues
        setAllGifts([]);
      }
    };
    
    const loadUnupgradeableGifts = async () => {
      try {
        const response = await fetch('/api/portfolio/unupgradeable-gifts');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Add buy prices to each gift
            const giftsWithBuyPrices = (data.gifts || []).map((gift: any) => ({
              ...gift,
              buyPriceStars: getBuyPriceInStars(gift.id)
            }));
            setUnupgradeableGifts(giftsWithBuyPrices);
          }
        }
      } catch (error) {
        console.error('Failed to load unupgradeable gifts:', error);
      }
    };
    
    loadAllGifts();
    loadUnupgradeableGifts();
  }, []);

  // Helper function to format price based on currency preference (for TON prices)
  const formatPrice = (priceInTon: number | null | undefined): string => {
    if (priceInTon === null || priceInTon === undefined) {
      return 'N/A';
    }
    
    if (currency === 'USD') {
      return (priceInTon * tonToUsdRate).toFixed(2);
    }
    
    return priceInTon.toFixed(2);
  };

  // Helper function to format price based on currency preference (for USD prices like stickers)
  const formatUsdPrice = (priceInUsd: number | null | undefined): string => {
    if (priceInUsd === null || priceInUsd === undefined) {
      return 'N/A';
    }
    
    if (currency === 'TON') {
      return (priceInUsd / tonToUsdRate).toFixed(2);
    }
    
    return priceInUsd.toFixed(2);
  };

  // Helper to get currency icon and symbol
  const getCurrencyDisplay = () => {
    if (currency === 'USD') {
      return { icon: '/icons/dollar.svg', symbol: '$', label: 'USD' };
    }
    return { icon: '/icons/ton.svg', symbol: '', label: 'TON' };
  };

  // Render chart when data changes or chart type changes
  useEffect(() => {
    if (chartData.length > 0 && chartCanvasRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
      renderChart();
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData, chartType]);

  // Also re-render on window resize and drawer open to prevent squeezing
  useEffect(() => {
    const handleResize = () => {
      if (chartData.length > 0 && chartCanvasRef.current) {
        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
          renderChart();
        });
      }
    };

    // Also observe container size changes
    const canvas = chartCanvasRef.current;
    let resizeObserver: ResizeObserver | null = null;
    
    if (canvas && isGiftChartOpen) {
      const container = canvas.parentElement;
      if (container) {
        resizeObserver = new ResizeObserver(() => {
          handleResize();
        });
        resizeObserver.observe(container);
      }
    }

    window.addEventListener('resize', handleResize);
    
    // Re-render when drawer opens
    if (isGiftChartOpen && chartData.length > 0) {
      setTimeout(() => handleResize(), 200);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [chartData, isGiftChartOpen]);

  const renderChart = () => {
    const canvas = chartCanvasRef.current;
    if (!canvas || chartData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with proper dimensions to prevent squeezing
    const container = canvas.parentElement;
    const containerWidth = container?.clientWidth || 400;
    const containerHeight = container?.clientHeight || 400;
    const width = containerWidth;
    const height = Math.max(containerHeight, 350); // Minimum height for proper display
    
    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Adjust all dimensions for the scale
    const scaledWidth = width;
    const scaledHeight = height;

    // Transparent background - no fill
    ctx.clearRect(0, 0, scaledWidth, scaledHeight);

    // Setup padding and dimensions - minimal padding for clean look
    const paddingTop = 20;
    const paddingBottom = 20;
    const paddingLeft = 10;
    const paddingRight = 10;
    const chartWidth = scaledWidth - paddingLeft - paddingRight;
    const chartHeight = scaledHeight - paddingTop - paddingBottom;

    // Extract price data - handle both weekChart (priceUsd) and lifeChart (priceUsd) formats
    const prices = chartData.map((point: any) => {
      // weekChart has priceUsd, lifeChart also has priceUsd
      return parseFloat(point.priceUsd || point.price || 0) || 0;
    });
    const maxPrice = Math.max(...prices, 1);
    const minPrice = Math.min(...prices, 0);
    const priceRange = maxPrice - minPrice || 1;

    // Calculate scales
    const xScale = (index: number) => {
      if (prices.length <= 1) return paddingLeft + chartWidth / 2;
      return paddingLeft + (index / (prices.length - 1)) * chartWidth;
    };
    const yScale = (price: number) => {
      if (priceRange === 0) return paddingTop + chartHeight / 2;
      const normalized = (price - minPrice) / priceRange;
      return paddingTop + chartHeight * (1 - normalized);
    };

    // No grid lines for clean look

    // Create smooth curve using quadratic bezier curves for romantic look
    const getSmoothPath = () => {
      const path = new Path2D();
      if (prices.length === 0) return path;
      
      path.moveTo(xScale(0), yScale(prices[0]));
      
      if (prices.length === 1) {
        path.lineTo(xScale(0), scaledHeight - paddingBottom);
        return path;
      }

      // Use bezier curves for smooth, romantic lines
      for (let i = 0; i < prices.length - 1; i++) {
        const x0 = xScale(i);
        const y0 = yScale(prices[i]);
        const x1 = xScale(i + 1);
        const y1 = yScale(prices[i + 1]);
        
        const cpX = (x0 + x1) / 2;
        const cpY0 = y0;
        const cpY1 = y1;
        
        path.bezierCurveTo(cpX, cpY0, cpX, cpY1, x1, y1);
      }
      
      return path;
    };

    // Clean green gradient for area fill
    const areaGradient = ctx.createLinearGradient(0, paddingTop, 0, scaledHeight - paddingBottom);
    areaGradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)'); // Bright green near line
    areaGradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.15)'); // Medium green
    areaGradient.addColorStop(1, 'rgba(34, 197, 94, 0)'); // Transparent at bottom

    // Draw gradient area with smooth path
    ctx.fillStyle = areaGradient;
    ctx.beginPath();
    ctx.moveTo(xScale(0), scaledHeight - paddingBottom);
    
    // Draw the line path to create the top boundary
    if (prices.length > 0) {
      ctx.moveTo(xScale(0), yScale(prices[0]));
      if (prices.length > 1) {
        for (let i = 0; i < prices.length - 1; i++) {
          const x0 = xScale(i);
          const y0 = yScale(prices[i]);
          const x1 = xScale(i + 1);
          const y1 = yScale(prices[i + 1]);
          const cpX = (x0 + x1) / 2;
          ctx.bezierCurveTo(cpX, y0, cpX, y1, x1, y1);
    }
      }
    }
    
    ctx.lineTo(xScale(prices.length - 1), scaledHeight - paddingBottom);
    ctx.lineTo(xScale(0), scaledHeight - paddingBottom);
    ctx.closePath();
    ctx.fill();

    // Clean bright green line
    ctx.strokeStyle = '#22c55e'; // Bright green
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 0; // No shadow for clean look
    
    // Draw smooth line path
    ctx.beginPath();
    if (prices.length > 0) {
    ctx.moveTo(xScale(0), yScale(prices[0]));
      if (prices.length > 1) {
        for (let i = 0; i < prices.length - 1; i++) {
          const x0 = xScale(i);
          const y0 = yScale(prices[i]);
          const x1 = xScale(i + 1);
          const y1 = yScale(prices[i + 1]);
          const cpX = (x0 + x1) / 2;
          ctx.bezierCurveTo(cpX, y0, cpX, y1, x1, y1);
    }
      }
    }
    ctx.stroke();
  };

  // Load portfolio data
  useEffect(() => {
    console.log('📊 PortfolioTab useEffect triggered');
    console.log('📊 PortfolioTab - user object:', user);
    console.log('📊 PortfolioTab - user_id:', user?.user_id);
    
    if (user?.user_id) {
      console.log('📊 ✅ User ID available, loading portfolio for user:', user.user_id);
      loadPortfolio();
      loadPortfolioHistory();
      if (activeTab === 'stickers') {
        loadStickers();
      }
    } else {
      console.warn('⚠️ PortfolioTab: No user_id available');
      console.warn('⚠️ PortfolioTab - user state:', {
        hasUser: !!user,
        userId: user?.user_id,
        username: user?.username
      });
      setIsLoading(false); // Ensure loading is false if no user
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_id]); // Only depend on user_id, not the functions

  // Load stickers when tab changes
  useEffect(() => {
    if (activeTab === 'stickers' && user?.user_id && !stickersLoading && !stickerPortfolio) {
      loadStickers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Save gifts to cache whenever they change
  useEffect(() => {
    if (user?.user_id && gifts.length > 0) {
      const cacheKey = `portfolio_gifts_${user.user_id}`;
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          gifts: gifts,
          totalValue: totalValue,
          timestamp: Date.now()
        }));
        console.log('✅ Custom gifts saved to cache');
      } catch (e) {
        console.warn('⚠️ Error saving custom gifts to cache:', e);
      }
    }
  }, [gifts, totalValue, user?.user_id]);

  // Batched price fetching function
  const fetchPricesInBatches = async (giftsToFetch: any[], maxGifts: number = 100, batchSize: number = 10, delayMs: number = 500) => {
    // Limit to max gifts
    const limitedGifts = giftsToFetch.slice(0, maxGifts);
    const totalGifts = limitedGifts.length;
    
    if (totalGifts === 0) {
      return;
    }
    
    console.log(`💰 Fetching prices for ${totalGifts} gifts in batches of ${batchSize}...`);
    
    let completed = 0;
    const loadingToast = toast.loading(`Fetching prices: 0/${totalGifts}`);
    
    // Process in batches
    for (let i = 0; i < limitedGifts.length; i += batchSize) {
      const batch = limitedGifts.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(totalGifts / batchSize);
      
      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} gifts)`);
      
      // Fetch prices for this batch in parallel
      const batchPromises = batch.map(async (gift) => {
        const key = `${gift.slug}-${gift.num}`;
        try {
          const priceResult = await getGiftPrice(gift.title, gift.backdrop_name || null, gift.model_name || null);
          if (priceResult.price !== null) {
            setGifts(prev => prev.map(g => {
              if (g.slug === gift.slug && g.num === gift.num) {
                return { ...g, price: priceResult.price };
              }
              return g;
            }));
            completed++;
            console.log(`✅ [${completed}/${totalGifts}] Updated price for ${gift.title}: ${priceResult.price}`);
            return true;
          }
        } catch (error) {
          console.error(`❌ Error fetching price for ${gift.title}:`, error);
        }
        completed++;
        return false;
      });
      
      // Wait for batch to complete
      await Promise.all(batchPromises);
      
      // Update progress toast
      toast.loading(`Fetching prices: ${completed}/${totalGifts}`, { id: loadingToast });
      
      // Delay before next batch (except for the last batch)
      if (i + batchSize < limitedGifts.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    // Final update
    toast.dismiss(loadingToast);
    toast.success(`Prices fetched for ${completed} gifts`);
    console.log(`✅ Price fetching complete: ${completed}/${totalGifts} gifts processed`);
  };

  // Fetch prices for gifts that don't have prices (initial load)
  useEffect(() => {
    const fetchMissingPrices = async () => {
      // Get all gifts without prices (both auto and custom) that we haven't fetched yet
      const giftsWithoutPrice = gifts.filter(g => {
        const key = `${g.slug}-${g.num}`;
        return (g.price === null || g.price === undefined) && !pricesFetchedRef.current.has(key);
      });
      
      if (giftsWithoutPrice.length > 0) {
        // Mark all as fetched to prevent duplicate requests
        giftsWithoutPrice.forEach(g => {
          const key = `${g.slug}-${g.num}`;
          pricesFetchedRef.current.add(key);
        });
        
        console.log(`💰 Auto-fetching prices for ${giftsWithoutPrice.length} gifts without prices...`);
        
        // Use batched fetching (max 100, 10 per batch, 500ms delay)
        fetchPricesInBatches(giftsWithoutPrice, 100, 10, 500);
      }
    };

    // Only run if we have gifts without prices
    if (gifts.length > 0) {
      fetchMissingPrices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gifts.length]); // Only trigger when gift count changes (not on every update)

  const loadPortfolio = async (): Promise<any[]> => {
    if (!user?.user_id) {
      console.warn('⚠️ loadPortfolio: No user_id, aborting');
      return [];
    }

    console.log('📊 loadPortfolio: Starting for user', user.user_id);
    
    setIsLoading(true);
    
    // Load auto, custom, and channel gifts in parallel
    const [autoGiftsResponse, customGiftsResponse, channelGiftsResponse] = await Promise.all([
      loadAutoGifts(),
      loadCustomGiftsFromDBAPI(),
      loadChannelGiftsFromDBAPI()
    ]);
    
    // Merge results
    const allGifts = [...(autoGiftsResponse?.gifts || []), ...(customGiftsResponse?.gifts || [])];
    const hidden = getHiddenItems();
    
    // Calculate channel gifts value excluding hidden ones
    const channelGiftsValue = (channelGiftsResponse || []).reduce((sum: number, cg: any) => {
      const isHidden = hidden.has(`channel_${cg.channel_id}`);
      return sum + (isHidden ? 0 : (cg.total_value || 0));
    }, 0);
    
    // Calculate custom gifts value excluding hidden ones
    const customGiftsValue = (customGiftsResponse?.gifts || []).reduce((sum: number, g: any) => {
      const giftId = `custom_${g.slug || g.title}_${g.num || ''}`;
      const isHidden = hidden.has(giftId);
      return sum + (isHidden ? 0 : (g.price || 0));
    }, 0);
    
    // Calculate auto gifts value excluding hidden ones
    const autoGiftsValue = (autoGiftsResponse?.gifts || []).reduce((sum: number, g: any) => {
      const giftId = `auto_${g.title}_${g.num || ''}`;
      const isHidden = hidden.has(giftId);
      return sum + (isHidden ? 0 : (g.price || 0));
    }, 0);
    
    const totalValue = autoGiftsValue + customGiftsValue + channelGiftsValue;
    
    // Set channel gifts separately
    setChannelGifts(channelGiftsResponse || []);
    
    setGifts(allGifts);
    setTotalValue(totalValue);
    
    // Cache the merged result
    const cacheKey = `portfolio_gifts_${user.user_id}`;
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        gifts: allGifts,
        totalValue: totalValue,
        timestamp: Date.now()
      }));
      console.log('✅ Portfolio data cached');
    } catch (e) {
      console.warn('⚠️ Error caching portfolio data:', e);
    }
    
    setIsLoading(false);
    return allGifts;
  };

  const loadAutoGifts = async () => {
    if (!user?.user_id) {
      console.warn('⚠️ loadAutoGifts: No user_id, aborting');
      return null;
    }

    console.log('📊 loadAutoGifts: Starting for user', user.user_id);
    
    // Check cache first for auto gifts
    const cacheKey = `portfolio_gifts_${user.user_id}`;
    const cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
    
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const age = Date.now() - parsed.timestamp;
        const cachedAutoGifts = parsed.gifts?.filter((g: any) => !g.is_custom) || [];
        
        if (age < cacheExpiry && cachedAutoGifts.length > 0) {
          console.log('✅ Using cached auto gifts (age:', Math.round(age / 1000), 'seconds)');
          return {
            gifts: cachedAutoGifts,
            totalValue: parsed.totalValue || 0
          };
        }
      }
    } catch (e) {
      console.warn('⚠️ Error reading cache:', e);
    }
    
    try {
      // Get Telegram initData to send with request
      const webApp = (window as any).Telegram?.WebApp || (window as any).tg;
      const initData = webApp?.initData;
      
      console.log('📊 loadAutoGifts: initData available:', !!initData, 'length:', initData?.length);
      
      const headers: Record<string, string> = {};
      if (initData) {
        headers['X-Telegram-Init-Data'] = initData;
      } else {
        console.error('❌ loadAutoGifts: No initData available - API will fail authentication');
      }
      
      console.log('📊 loadAutoGifts: Making API request to /api/portfolio/gifts');
      
      // Create abort controller for timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, 90000); // 90 second timeout
      
      let response: Response;
      try {
        response = await fetch('/api/portfolio/gifts', {
          headers,
          signal: abortController.signal
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('❌ Fetch error:', fetchError);
        return null;
      }
      
      console.log('📊 loadAutoGifts: Response status:', response.status);
      
      if (response.ok) {
      const responseText = await response.text();
        console.log('📊 loadAutoGifts: Response body (first 500 chars):', responseText.substring(0, 500));
      
        try {
          const data = JSON.parse(responseText);
          console.log('📊 loadAutoGifts: Parsed data:', { 
            success: data.success, 
            giftsCount: data.gifts?.length,
            totalValue: data.total_value 
          });
          
          if (data.success) {
            const giftsList = data.gifts || [];
            
            // Normalize gifts with is_custom: false
            const normalizedGifts = giftsList.map((g: any) => ({
              slug: g.slug || '',
              num: g.num || null,
              title: g.title || 'Unknown Gift',
              model_name: g.model_name || null,
              backdrop_name: g.backdrop_name || null,
              pattern_name: g.pattern_name || null,
              model_rarity: g.model_rarity || null,
              backdrop_rarity: g.backdrop_rarity || null,
              pattern_rarity: g.pattern_rarity || null,
              model_display: g.model_display || null,
              backdrop_display: g.backdrop_display || null,
              pattern_display: g.pattern_display || null,
              pinned: g.pinned || false,
              fragment_url: g.fragment_url || null,
              price: g.price !== null && g.price !== undefined ? g.price : null,
              priceError: g.priceError || undefined,
              availability_issued: g.availability_issued || null,
              availability_total: g.availability_total || null,
              total_supply: g.total_supply || null,
              is_custom: false, // Auto-fetched gifts are not custom
              gift_id: g.id || undefined
            }));
            
            console.log('✅ Auto gifts loaded:', normalizedGifts.length);
            return {
                gifts: normalizedGifts,
              totalValue: data.total_value || 0
            };
          } else {
            console.error('❌ API returned success:false, error:', data.error);
            return null;
          }
        } catch (parseError) {
          console.error('❌ Failed to parse portfolio response:', parseError);
          return null;
        }
      } else {
        const errorText = await response.text();
        console.error('❌ loadAutoGifts: Response not OK:', response.status, errorText);
        return null;
      }
    } catch (error) {
      console.error('❌ loadAutoGifts error:', error);
      return null;
    }
    return null;
  };

  const loadCustomGiftsFromDBAPI = async () => {
    if (!user?.user_id) return null;
    
        try {
      const { getAuthHeaders } = await import('@/lib/apiClient');
      const headers = getAuthHeaders();
      
      const response = await fetch('/api/portfolio/custom-gifts', {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.gifts && data.gifts.length > 0) {
          console.log('✅ Loaded', data.gifts.length, 'custom gifts from database');
          
          const customGiftsFromDB = data.gifts.map((g: any) => {
            const slugLower = (g.slug || '').toLowerCase().replace(/\s+/g, '');
            const fragmentUrl = slugLower && g.num ? `https://nft.fragment.com/gift/${slugLower}-${g.num}.medium.jpg` : null;
            
            return {
              slug: g.slug || '',
              num: g.num || null,
              title: g.title || 'Unknown Gift',
              model_name: g.model_name || null,
              backdrop_name: g.backdrop_name || null,
              pattern_name: g.pattern_name || null,
              model_rarity: g.model_rarity || null,
              backdrop_rarity: g.backdrop_rarity || null,
              pattern_rarity: g.pattern_rarity || null,
              model_display: g.model_name || undefined,
              backdrop_display: g.backdrop_name || undefined,
              pattern_display: g.pattern_name || undefined,
              pinned: g.pinned || false,
              fragment_url: fragmentUrl,
              price: g.price || null,
              priceError: undefined,
              availability_issued: g.availability_issued || null,
              availability_total: g.availability_total || null,
              total_supply: g.total_supply || undefined,
              owner_username: g.owner_username || null,
              owner_name: g.owner_name || null,
              is_custom: true,
              gift_id: g.id
            };
          });
          
          const totalValue = customGiftsFromDB.reduce((sum: number, g: PortfolioGift) => sum + (g.price || 0), 0);
          
          return {
            gifts: customGiftsFromDB,
            totalValue
          };
        }
      }
    } catch (error) {
      console.error('Error loading custom gifts from database:', error);
    }
    
    return null;
  };

  const loadChannelGiftsFromDBAPI = async () => {
    if (!user?.user_id) return null;
    
    try {
      const { getAuthHeaders } = await import('@/lib/apiClient');
      const headers = getAuthHeaders();
      
      const response = await fetch('/api/portfolio/channel-gifts-db', {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.gifts && data.gifts.length > 0) {
          console.log('✅ Loaded', data.gifts.length, 'gifts from database');
          
          // Parse the gifts (both channel and account)
          const giftsFromDB = data.gifts.map((cg: any) => {
            const giftsList = JSON.parse(cg.gifts_json || '[]');
            const isAccount = cg.type === 'account';
            console.log('📦 Gift parsed:', {
              type: cg.type,
              username: cg.channel_username,
              gifts_breakdown: giftsList,
              first_gift: giftsList[0]
            });
            return {
              is_channel: !isAccount,
              is_account: isAccount,
              channel_username: cg.channel_username,
              channel_id: cg.id, // Use database ID
              total_gifts: cg.total_gifts,
              total_value: cg.total_value,
              gifts_breakdown: giftsList,
              created_at: cg.created_at
            };
          });
          
          console.log('✅ Gifts loaded from DB:', giftsFromDB);
          return giftsFromDB;
        }
      }
    } catch (error) {
      console.error('Error loading gifts from database:', error);
    }
    
    return null;
  };

  const loadCustomStickersFromDBAPI = async () => {
    if (!user?.user_id) return null;
    
    try {
      const { getAuthHeaders } = await import('@/lib/apiClient');
      const headers = getAuthHeaders();
      
      const response = await fetch('/api/portfolio/custom-stickers', {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.stickers && data.stickers.length > 0) {
          console.log('✅ Loaded', data.stickers.length, 'custom stickers from database');
          
          const customStickersFromDB: StickerNFT[] = data.stickers.map((s: any) => ({
            collection: s.collection || '',
            character: s.character || '',
            token_id: s.token_id || `CUSTOM-${s.id}`,
            sticker_ids: [],
            sticker_count: 1,
            init_price_usd: s.init_price_usd || undefined,
            current_price_usd: s.current_price_usd || undefined,
            is_custom: true,
            sticker_id: s.id,
            filename: s.filename || undefined
          }));
          
          return customStickersFromDB;
        }
      }
    } catch (error) {
      console.error('Error loading custom stickers from database:', error);
    }
    
    return null;
  };

  const loadPortfolioHistory = async () => {
    if (!user?.user_id) return;

    try {
      const webApp = (window as any).Telegram?.WebApp || (window as any).tg;
      const initData = webApp?.initData;
      
      const headers: Record<string, string> = {};
      if (initData) {
        headers['X-Telegram-Init-Data'] = initData;
      }
      
      const response = await fetch('/api/portfolio/chart', {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        setPortfolioHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error loading portfolio history:', error);
    }
  };

  const loadStickers = async () => {
    if (!user?.user_id) {
      console.warn('⚠️ loadStickers: No user_id, aborting');
      return;
    }

    console.log('📊 loadStickers: Starting for user', user.user_id);
    setStickersLoading(true);
    try {
      // Use the centralized getAuthHeaders function
      const { getAuthHeaders } = await import('@/lib/apiClient');
      const headers = getAuthHeaders();
      
      // Automatically refresh initData if not available
      if (!headers['X-Telegram-Init-Data']) {
        console.warn('⚠️ loadStickers: No initData in headers, attempting automatic refresh...');
        
        const { refreshTelegramWebApp, getAuthHeaders: getHeadersAgain } = await import('@/lib/apiClient');
        
        // Try refreshing WebApp
        refreshTelegramWebApp();
        
        // Wait a moment for WebApp to update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try getting headers again
        const refreshedHeaders = getHeadersAgain();
        if (refreshedHeaders['X-Telegram-Init-Data']) {
          console.log('✅ Got initData after automatic refresh');
          Object.assign(headers, refreshedHeaders);
        } else {
          // Last resort: try reloading the page (but warn user first)
          console.error('❌ loadStickers: No initData available after refresh');
          console.error('❌ Debug:', {
            hasTelegram: !!(window as any).Telegram,
            hasWebApp: !!(window as any).Telegram?.WebApp,
            hasTg: !!(window as any).tg,
          });
          toast.error('Telegram authentication required - refreshing page...');
          
          // Auto-refresh the page to get fresh initData
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          
          setStickersLoading(false);
          return;
        }
      }
      
      const initData = headers['X-Telegram-Init-Data'];
      console.log('✅ loadStickers: initData found, length:', initData.length);
      console.log('✅ loadStickers: initData preview:', initData.substring(0, 100) + '...');
      
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, 60000); // 60 second timeout
      
      try {
        console.log('📊 loadStickers: Making API request with headers:', {
          hasInitData: !!headers['X-Telegram-Init-Data'],
          initDataLength: headers['X-Telegram-Init-Data']?.length,
          initDataPreview: headers['X-Telegram-Init-Data']?.substring(0, 100)
        });
        
        const response = await fetch('/api/portfolio/stickers', {
          headers,
          signal: abortController.signal
        });
        clearTimeout(timeoutId);
        
        console.log('📊 loadStickers: Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Stickers API error:', response.status, errorText);
          
          // Try to parse error for better error message
          try {
            const errorData = JSON.parse(errorText);
            if (response.status === 401) {
              // Authentication expired - user needs to reopen from Telegram
              toast.error('Authentication expired. Please close and reopen the app from Telegram to refresh your login.', {
                duration: 8000
              });
            } else if (errorData.error) {
              toast.error(`Sticker portfolio: ${errorData.error}`);
            } else {
              toast.error('Failed to load sticker portfolio');
            }
          } catch (e) {
            if (response.status === 401) {
              toast.error('Authentication expired. Please close and reopen the app from Telegram.', {
                duration: 8000
              });
            } else {
              toast.error('Failed to load sticker portfolio');
            }
          }
          setStickersLoading(false);
          return;
        }
        
        const data = await response.json();
        console.log('✅ Sticker portfolio loaded:', {
          success: data.success,
          stickersCount: data.stickers?.length,
          portfolioValue: data.portfolio_value
        });
        
        if (data.success) {
          // Load and merge custom stickers
          const customStickers = await loadCustomStickersFromDBAPI();
          const allStickers = [...(data.stickers || []), ...(customStickers || [])];
          
          // Calculate totals including custom stickers
          let totalInit = data.portfolio_value?.total_init || 0;
          let totalCurrent = data.portfolio_value?.total_current || 0;
          
          // Add custom sticker values
          customStickers?.forEach(sticker => {
            totalInit += sticker.init_price_usd || 0;
            totalCurrent += sticker.current_price_usd || 0;
          });
          
          const totalPnl = totalCurrent - totalInit;
          
          // Update portfolio with combined totals
          setStickers(allStickers);
          setStickerPortfolio({
            ...data,
            portfolio_value: {
              ...data.portfolio_value,
              total_init: totalInit,
              total_current: totalCurrent,
              total_pnl: totalPnl
            }
          });
        } else {
          toast.error(data.error || 'Failed to load sticker portfolio');
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError') {
            toast.error('Request timed out');
          } else {
            toast.error('Failed to load sticker portfolio');
          }
        }
      }
    } catch (error) {
      console.error('❌ Error loading stickers:', error);
      toast.error('Failed to load sticker portfolio');
    } finally {
      setStickersLoading(false);
    }
  };

  const savePortfolioSnapshot = async (value: number, count: number) => {
    try {
      // Get Telegram initData to send with request
      const webApp = (window as any).Telegram?.WebApp || (window as any).tg;
      const initData = webApp?.initData;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (initData) {
        headers['X-Telegram-Init-Data'] = initData;
      }
      
      await fetch('/api/portfolio/chart', {
        method: 'POST',
        headers,
        body: JSON.stringify({ totalValue: value, giftsCount: count }),
      });
    } catch (error) {
      console.error('Error saving portfolio snapshot:', error);
    }
  };

  const handleGiftClick = async (gift: PortfolioGift) => {
    hapticFeedback('impact', 'light', webApp || undefined);
    setSelectedGift(gift);
    setIsGiftChartOpen(true);
    // Load with current chart type (defaults to '1w')
    loadChartData(gift.title, chartType);
  };

  const handleDeleteGift = async (gift: PortfolioGift, index: number) => {
    hapticFeedback('impact', 'light', webApp || undefined);
    
    // Show confirmation
    // On desktop, Telegram's showConfirm doesn't work properly, so use window.confirm directly
    // On mobile, try Telegram's showConfirm first, then fallback to window.confirm
    let confirmed = false;
    const confirmMessage = 'Are you sure you want to remove this gift from your portfolio?';
    
    // Check if we're on desktop (Telegram desktop app)
    // Telegram desktop has issues with showConfirm, so detect it more aggressively
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : '';
    const isDesktop = webApp?.platform === 'tdesktop' || 
                      webApp?.platform === 'desktop' ||
                      userAgent.includes('Desktop') ||
                      userAgent.includes('Windows') ||
                      userAgent.includes('Macintosh') ||
                      userAgent.includes('Linux') ||
                      (!userAgent.includes('Mobile') && !userAgent.includes('Android') && !userAgent.includes('iPhone'));
    
    console.log('Delete confirmation - Platform:', webApp?.platform, 'isDesktop:', isDesktop, 'UserAgent:', userAgent);
    
    // Always use custom dialog on desktop (window.confirm doesn't work in Telegram Desktop webview)
    if (isDesktop) {
      console.log('Using custom confirmation dialog (desktop detected)');
      // Use a Promise-based custom dialog
      confirmed = await new Promise<boolean>((resolve) => {
        setConfirmDialog({
          isOpen: true,
          message: confirmMessage,
          onConfirm: () => {
            setConfirmDialog({ isOpen: false, message: '', onConfirm: () => {}, onCancel: () => {} });
            resolve(true);
          },
          onCancel: () => {
            setConfirmDialog({ isOpen: false, message: '', onConfirm: () => {}, onCancel: () => {} });
            resolve(false);
          },
        });
      });
    } else {
      // On mobile, try Telegram's showConfirm first
      try {
        if (webApp?.showConfirm && typeof webApp.showConfirm === 'function') {
          try {
            const result: any = webApp.showConfirm(confirmMessage);
            console.log('Telegram showConfirm result:', result, 'type:', typeof result);
            // WebApp.showConfirm can return a promise or boolean
            if (result && typeof result === 'object' && 'then' in result && typeof result.then === 'function') {
              confirmed = await (result as Promise<boolean>);
            } else if (typeof result === 'boolean') {
              confirmed = result;
            } else {
              // If result is void/undefined, use window.confirm as fallback
              console.log('Telegram showConfirm returned undefined, using window.confirm');
              confirmed = window.confirm(confirmMessage);
            }
          } catch (e) {
            console.log('WebApp confirm failed, using window.confirm:', e);
            confirmed = window.confirm(confirmMessage);
          }
        } else {
          console.log('webApp.showConfirm not available, using window.confirm');
          confirmed = window.confirm(confirmMessage);
        }
      } catch (e) {
        console.error('Error showing confirmation:', e);
        confirmed = window.confirm(confirmMessage);
      }
    }
    
    console.log('Final confirmed value:', confirmed);
    
    if (!confirmed) {
      return;
    }
    
    try {
      const { getAuthHeaders } = await import('@/lib/apiClient');
      const headers = getAuthHeaders();
      
      // Check if it's a custom gift by trying to get gift ID from localStorage
      // or we need to track custom gifts differently
      const customGifts = await fetch('/api/portfolio/custom-gifts', {
        headers
      }).then(r => r.json());
      
      // Find if this gift is a custom gift
      const customGift = customGifts.success ? customGifts.gifts.find((cg: any) => 
        cg.slug === gift.slug && cg.num === gift.num
      ) : null;
      
      if (customGift) {
        // Delete from custom gifts API
        const response = await fetch(`/api/portfolio/custom-gifts?id=${customGift.id}`, {
          method: 'DELETE',
          headers
        });
        
        if (response.ok) {
          toast.success('Custom gift removed');
          // Reload portfolio
          loadPortfolio();
        } else {
          toast.error('Failed to remove custom gift');
        }
      } else {
        // For now, we can't delete auto gifts from Telegram
        // Just remove from local state
        const newGifts = gifts.filter((_, i) => i !== index);
        setGifts(newGifts);
        toast.success('Gift removed from view');
      }
    } catch (error) {
      console.error('Error deleting gift:', error);
      toast.error('Failed to remove gift');
    }
  };

  const handleDeleteChannelGifts = async (channelGift: any, event?: React.MouseEvent) => {
    // Stop event propagation immediately to prevent parent onClick
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    // Also prevent the drawer from opening by closing it immediately if it's opening
    setIsChannelGiftDrawerOpen(false);
    
    hapticFeedback('impact', 'light', webApp || undefined);
    
    // Show confirmation
    // On desktop, Telegram's showConfirm doesn't work properly, so use window.confirm directly
    // On mobile, try Telegram's showConfirm first, then fallback to window.confirm
    let confirmed = false;
    const confirmMessage = 'Are you sure you want to remove this channel from your portfolio?';
    
    // Check if we're on desktop (Telegram desktop app)
    // Telegram desktop has issues with showConfirm, so detect it more aggressively
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : '';
    const isDesktop = webApp?.platform === 'tdesktop' || 
                      webApp?.platform === 'desktop' ||
                      userAgent.includes('Desktop') ||
                      userAgent.includes('Windows') ||
                      userAgent.includes('Macintosh') ||
                      userAgent.includes('Linux') ||
                      (!userAgent.includes('Mobile') && !userAgent.includes('Android') && !userAgent.includes('iPhone'));
    
    console.log('Delete confirmation - Platform:', webApp?.platform, 'isDesktop:', isDesktop, 'UserAgent:', userAgent);
    
    // Always use custom dialog on desktop (window.confirm doesn't work in Telegram Desktop webview)
    if (isDesktop) {
      console.log('Using custom confirmation dialog (desktop detected)');
      // Use a Promise-based custom dialog
      confirmed = await new Promise<boolean>((resolve) => {
        setConfirmDialog({
          isOpen: true,
          message: confirmMessage,
          onConfirm: () => {
            setConfirmDialog({ isOpen: false, message: '', onConfirm: () => {}, onCancel: () => {} });
            resolve(true);
          },
          onCancel: () => {
            setConfirmDialog({ isOpen: false, message: '', onConfirm: () => {}, onCancel: () => {} });
            resolve(false);
          },
        });
      });
    } else {
      // On mobile, try Telegram's showConfirm first
        try {
      if (webApp?.showConfirm && typeof webApp.showConfirm === 'function') {
        try {
          const result: any = webApp.showConfirm(confirmMessage);
            console.log('Telegram showConfirm result:', result, 'type:', typeof result);
          // WebApp.showConfirm can return a promise or boolean
          if (result && typeof result === 'object' && 'then' in result && typeof result.then === 'function') {
            confirmed = await (result as Promise<boolean>);
          } else if (typeof result === 'boolean') {
            confirmed = result;
          } else {
            // If result is void/undefined, use window.confirm as fallback
              console.log('Telegram showConfirm returned undefined, using window.confirm');
            confirmed = window.confirm(confirmMessage);
          }
        } catch (e) {
          console.log('WebApp confirm failed, using window.confirm:', e);
          confirmed = window.confirm(confirmMessage);
        }
      } else {
          console.log('webApp.showConfirm not available, using window.confirm');
        confirmed = window.confirm(confirmMessage);
      }
    } catch (e) {
      console.error('Error showing confirmation:', e);
      confirmed = window.confirm(confirmMessage);
      }
    }
    
    console.log('Final confirmed value:', confirmed);
    
    if (!confirmed) {
      return;
    }
    
    try {
      const { getAuthHeaders } = await import('@/lib/apiClient');
      const headers = getAuthHeaders();
      
      // Delete channel gifts
      const response = await fetch(`/api/portfolio/channel-gifts-db?id=${channelGift.channel_id}`, {
        method: 'DELETE',
        headers
      });
      
      if (response.ok) {
        toast.success('Channel gifts removed');
        // Reload portfolio
        loadPortfolio();
      } else {
        toast.error('Failed to remove channel gifts');
      }
    } catch (error) {
      console.error('Error deleting channel gifts:', error);
      toast.error('Failed to remove channel gifts');
    }
  };

  const handleDeleteSticker = async (sticker: StickerNFT, index: number) => {
    hapticFeedback('impact', 'light', webApp || undefined);
    
    // Show confirmation
    // On desktop, Telegram's showConfirm doesn't work properly, so use window.confirm directly
    // On mobile, try Telegram's showConfirm first, then fallback to window.confirm
    let confirmed = false;
    const confirmMessage = 'Are you sure you want to remove this sticker from your portfolio?';
    
    // Check if we're on desktop (Telegram desktop app)
    // Telegram desktop has issues with showConfirm, so detect it more aggressively
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : '';
    const isDesktop = webApp?.platform === 'tdesktop' || 
                      webApp?.platform === 'desktop' ||
                      userAgent.includes('Desktop') ||
                      userAgent.includes('Windows') ||
                      userAgent.includes('Macintosh') ||
                      userAgent.includes('Linux') ||
                      (!userAgent.includes('Mobile') && !userAgent.includes('Android') && !userAgent.includes('iPhone'));
    
    console.log('Delete confirmation - Platform:', webApp?.platform, 'isDesktop:', isDesktop, 'UserAgent:', userAgent);
    
    // Always use custom dialog on desktop (window.confirm doesn't work in Telegram Desktop webview)
    if (isDesktop) {
      console.log('Using custom confirmation dialog (desktop detected)');
      // Use a Promise-based custom dialog
      confirmed = await new Promise<boolean>((resolve) => {
        setConfirmDialog({
          isOpen: true,
          message: confirmMessage,
          onConfirm: () => {
            setConfirmDialog({ isOpen: false, message: '', onConfirm: () => {}, onCancel: () => {} });
            resolve(true);
          },
          onCancel: () => {
            setConfirmDialog({ isOpen: false, message: '', onConfirm: () => {}, onCancel: () => {} });
            resolve(false);
          },
        });
      });
    } else {
      // On mobile, try Telegram's showConfirm first
      try {
        if (webApp?.showConfirm && typeof webApp.showConfirm === 'function') {
          try {
            const result: any = webApp.showConfirm(confirmMessage);
            console.log('Telegram showConfirm result:', result, 'type:', typeof result);
            // WebApp.showConfirm can return a promise or boolean
            if (result && typeof result === 'object' && 'then' in result && typeof result.then === 'function') {
              confirmed = await (result as Promise<boolean>);
            } else if (typeof result === 'boolean') {
              confirmed = result;
            } else {
              // If result is void/undefined, use window.confirm as fallback
              console.log('Telegram showConfirm returned undefined, using window.confirm');
              confirmed = window.confirm(confirmMessage);
            }
          } catch (e) {
            console.log('WebApp confirm failed, using window.confirm:', e);
            confirmed = window.confirm(confirmMessage);
          }
        } else {
          console.log('webApp.showConfirm not available, using window.confirm');
          confirmed = window.confirm(confirmMessage);
        }
      } catch (e) {
        console.error('Error showing confirmation:', e);
        confirmed = window.confirm(confirmMessage);
      }
    }
    
    console.log('Final confirmed value:', confirmed);
    
    if (!confirmed) {
      return;
    }
    
    try {
      const { getAuthHeaders } = await import('@/lib/apiClient');
      const headers = getAuthHeaders();
      
      if (sticker.is_custom && sticker.sticker_id) {
        // Delete from custom stickers API
        const response = await fetch(`/api/portfolio/custom-stickers?id=${sticker.sticker_id}`, {
          method: 'DELETE',
          headers
        });
        
        if (response.ok) {
          toast.success('Custom sticker removed');
          // Reload stickers
          loadStickers();
        } else {
          toast.error('Failed to remove custom sticker');
        }
      } else {
        // For now, we can't delete auto stickers from Telegram
        // Just remove from local state
        const newStickers = stickers.filter((_, i) => i !== index);
        setStickers(newStickers);
        toast.success('Sticker removed from view');
      }
    } catch (error) {
      console.error('Error deleting sticker:', error);
      toast.error('Failed to remove sticker');
    }
  };

  const loadChartData = async (collectionName: string, type?: '24h' | '3d' | '1w' | '1m' | '3m') => {
    const chartTypeToUse = type || chartType;
    setChartLoading(true);
    try {
      const chartUrl = `/api/portfolio/gift-chart?name=${encodeURIComponent(collectionName)}&type=${chartTypeToUse}`;
      console.log('📊 Loading chart data:', chartUrl);
      
      const response = await fetch(chartUrl);
      
      if (!response.ok) {
        console.error('Chart API response not OK:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        setChartData([]);
        toast.error(`Failed to load chart: ${response.status}`);
        return;
      }
      
      const result = await response.json();
      console.log('📊 Chart data received:', { success: result.success, dataLength: result.data?.length });
      
      if (result.success && result.data && Array.isArray(result.data)) {
        if (result.data.length > 0) {
        setChartData(result.data);
      } else {
          console.warn('Chart data is empty array');
        setChartData([]);
          toast.error('No chart data available for this period');
        }
      } else {
        console.error('Failed to load chart data:', result.error || 'Unknown error');
        setChartData([]);
        toast.error(result.error || 'Failed to load chart data');
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
      setChartData([]);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('fetch') || errorMessage === 'Load failed') {
        toast.error('Network error: Could not load chart data');
      } else {
        toast.error(`Error: ${errorMessage}`);
      }
    } finally {
      setChartLoading(false);
    }
  };

  const handleUpdate = async () => {
    hapticFeedback('impact', 'medium', webApp || undefined);
    
    // Clear cache to force fresh data
    if (user?.user_id) {
      const cacheKey = `portfolio_gifts_${user.user_id}`;
      localStorage.removeItem(cacheKey);
      console.log('🗑️ Cache cleared for refresh');
    }
    
    const loadedGifts = await loadPortfolio();
    loadPortfolioHistory();
    if (activeTab === 'stickers') {
      loadStickers();
    }
    
    // Fetch prices in batches (max 100 gifts, 10 per batch, 500ms delay)
    fetchPricesInBatches(loadedGifts, 100, 10, 500);
    
    toast.success('Portfolio updated');
  };

  const handleShare = () => {
    hapticFeedback('impact', 'medium', webApp || undefined);
    // Share portfolio functionality
    if (webApp?.shareToStory) {
      // Could share portfolio summary image
      toast.success('Share functionality coming soon');
    }
  };

  // Add Gift drawer functions
  const openAddGiftDrawer = () => {
    setSelectedGiftName(null);
    setSelectedUnupgradeableGift(null);
    setFilterSearchTerm('');
    setRibbonNumber('');
    setIsAddGiftDrawerOpen(true);
    hapticFeedback('selection');
  };

  const closeAddGiftDrawer = () => {
    setIsAddGiftDrawerOpen(false);
    setSelectedGiftName(null);
    setSelectedUnupgradeableGift(null);
    setFilterSearchTerm('');
  };

  const selectGiftName = (giftName: string) => {
    setSelectedGiftName(giftName);
    setFilterSearchTerm('');
    hapticFeedback('impact');
  };

  const handleSaveUnupgradeableGift = async () => {
    if (!selectedUnupgradeableGift || !ribbonNumber) {
      toast.error('Please select a gift and enter quantity');
      return;
    }

    const quantity = parseInt(ribbonNumber);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    const gift = selectedUnupgradeableGift;
    const totalValue = gift.floorPrice > 0 ? quantity * gift.floorPrice : null;
    
    const newGift: PortfolioGift = {
      slug: gift.shortName.toLowerCase().replace(/\s+/g, ''),
      num: quantity,
      title: `${gift.name} x${quantity}`,
      model_name: null,
      backdrop_name: null,
      pattern_name: null,
      model_rarity: null,
      backdrop_rarity: null,
      pattern_rarity: null,
      model_display: undefined,
      backdrop_display: undefined,
      pattern_display: undefined,
      pinned: false,
      fragment_url: gift.imageUrl,
      price: totalValue,
      priceError: undefined,
      availability_issued: null,
      availability_total: null,
      total_supply: gift.supply.toString(),
      owner_username: null,
      owner_name: null,
      is_custom: true,
      is_unupgradeable: true
    };

    // Add to gifts
    setGifts(prev => [...prev, newGift]);
    closeAddGiftDrawer();
    toast.success(`${quantity}x ${gift.name} added to portfolio!`);

    // Save to database via API for cross-device sync
    try {
      const { getAuthHeaders } = await import('@/lib/apiClient');
      const headers = getAuthHeaders();
      
      await fetch('/api/portfolio/custom-gifts', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ gift: newGift })
      });
    } catch (error) {
      console.error('Failed to save gift to database:', error);
    }
  };

  const handleSaveGift = async () => {
    if (!selectedGiftName || !ribbonNumber) {
      toast.error('Please select a gift and enter a number');
      return;
    }

    const ribbonNum = parseInt(ribbonNumber);
    if (isNaN(ribbonNum) || ribbonNum <= 0) {
      toast.error('Please enter a valid gift number');
      return;
    }

    // Show loading toast
    const loadingToast = toast.loading('Fetching gift metadata and price...');

    // Generate fragment URL
    const slugLower = selectedGiftName.toLowerCase().replace(/\s+/g, '');
    const fragmentUrl = `https://nft.fragment.com/gift/${slugLower}-${ribbonNum}.medium.jpg`;

    // Fetch metadata first
    let modelName = null;
    let backdropName = null;
    let patternName = null;
    let ownerUsername = null;
    let ownerName = null;
    let price = null;

    try {
      console.log('📊 Fetching metadata for', slugLower, ribbonNum);
      const metadataResponse = await fetch(`/api/portfolio/gift-metadata?gift_name=${encodeURIComponent(slugLower)}&item_id=${ribbonNum}`);
      
      console.log('📊 Metadata response status:', metadataResponse.status);
      
      if (metadataResponse.ok) {
        const metadata = await metadataResponse.json();
        console.log('📊 Metadata response:', metadata);
        
        if (metadata.success && metadata.model) {
          modelName = metadata.model;
          backdropName = metadata.backdrop;
          patternName = metadata.symbol;
          ownerUsername = metadata.owner_username;
          ownerName = metadata.owner_name;
          console.log('✅ Got metadata:', { modelName, backdropName, patternName, ownerUsername, ownerName });
        } else {
          console.warn('⚠️ Metadata fetch returned success:false or no model');
        }
      } else {
        const errorText = await metadataResponse.text();
        console.error('⚠️ Metadata fetch failed:', metadataResponse.status, errorText);
      }
    } catch (error) {
      console.error('⚠️ Failed to fetch metadata:', error);
    }

    // Fetch price with metadata
    try {
      const priceResult = await getGiftPrice(selectedGiftName, modelName, backdropName);
      if (priceResult.price !== null) {
        price = priceResult.price;
        console.log('✅ Got price:', price);
      }
    } catch (error) {
      console.error('⚠️ Failed to fetch price:', error);
    }

    // Create new gift with metadata and price
    const newGift: PortfolioGift = {
      slug: slugLower,
      num: ribbonNum,
      title: selectedGiftName,
      model_name: modelName,
      backdrop_name: backdropName,
      pattern_name: patternName,
      model_rarity: null,
      backdrop_rarity: null,
      pattern_rarity: null,
      model_display: modelName || undefined,
      backdrop_display: backdropName || undefined,
      pattern_display: patternName || undefined,
      pinned: false,
      fragment_url: fragmentUrl,
      price: price,
      priceError: undefined,
      availability_issued: null,
      availability_total: null,
      total_supply: undefined,
      owner_username: ownerUsername,
      owner_name: ownerName,
      is_custom: true // Mark as custom gift
    };

    // Add to gifts
    setGifts(prev => [...prev, newGift]);
    closeAddGiftDrawer();
    toast.dismiss(loadingToast);
    toast.success('Gift added to portfolio!');

    // Save to database via API for cross-device sync
    try {
      const { getAuthHeaders } = await import('@/lib/apiClient');
      const headers = getAuthHeaders();
      
      const response = await fetch('/api/portfolio/custom-gifts', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ gift: newGift })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Custom gift saved to database:', result);
      } else {
        console.error('⚠️ Failed to save custom gift to database:', response.status);
      }
    } catch (error) {
      console.error('❌ Error saving custom gift to database:', error);
      // Don't show error to user as the gift is already added locally
    }
  };

  // Fetch channel gifts
  const fetchChannelGifts = async () => {
    if (!channelUsername.trim()) {
      toast.error('Please enter a channel username');
      return;
    }
    
    setIsLoadingChannel(true);
    try {
      const response = await fetch(`/api/portfolio/channel-gifts?channel=${encodeURIComponent(channelUsername.trim())}`);
      const data = await response.json();
      
      if (data.success) {
        // Save channel gifts to database
        console.log('📦 Raw channel gifts data from Python:', data.gifts);
        console.log('📦 First gift ID:', data.gifts?.[0]?.id);
        
        const { getAuthHeaders } = await import('@/lib/apiClient');
        const headers = getAuthHeaders();
        
        const saveResponse = await fetch('/api/portfolio/channel-gifts-db', {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            channelData: {
              channel_username: data.channel_username,
              channel_id: data.channel_id?.toString(),
              total_gifts: data.total_gifts,
              total_value: data.total_value,
              gifts: data.gifts
            }
          })
        });
        
        const saveResult = await saveResponse.json();
        
        if (saveResult.success) {
          console.log('Channel gifts saved:', saveResult);
          toast.success(`Added ${data.total_gifts} gifts worth $${data.total_value.toFixed(2)}!`);
          // Close drawer and refresh
          closeAddGiftDrawer();
          // Reload portfolio to show new channel gifts
          loadPortfolio();
        } else {
          toast.error('Failed to save channel gifts');
        }
      } else {
        toast.error(data.error || 'Failed to fetch channel gifts');
      }
    } catch (error) {
      console.error('Error fetching channel gifts:', error);
      toast.error('Failed to fetch channel gifts');
    } finally {
      setIsLoadingChannel(false);
    }
  };
  
  // Fetch account gifts
  const fetchAccountGifts = async () => {
    if (!accountUsername.trim()) {
      toast.error('Please enter an account username');
      return;
    }
    
    setIsLoadingAccount(true);
    try {
      const response = await fetch(`/api/portfolio/account-gifts?account=${encodeURIComponent(accountUsername.trim())}`);
      const data = await response.json();
      
      if (data.success) {
        // Save account gifts to database
        console.log('📦 Raw account gifts data from Python:', data.gifts);
        console.log('📦 First gift ID:', data.gifts?.[0]?.id);
        
        const { getAuthHeaders } = await import('@/lib/apiClient');
        const headers = getAuthHeaders();
        
        const saveResponse = await fetch('/api/portfolio/channel-gifts-db', {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            type: 'account',
            channelData: {
              account_username: data.account_username,
              account_id: data.account_id?.toString(),
              total_gifts: data.total_gifts,
              total_value: data.total_value,
              gifts: data.gifts
            }
          })
        });
        
        const saveResult = await saveResponse.json();
        
        if (saveResult.success) {
          console.log('Account gifts saved:', saveResult);
          toast.success(`Added ${data.total_gifts} gifts worth $${data.total_value.toFixed(2)}!`);
          // Close drawer and refresh
          closeAddGiftDrawer();
          // Reload portfolio to show new account gifts
          loadPortfolio();
        } else {
          toast.error('Failed to save account gifts');
        }
      } else {
        toast.error(data.error || 'Failed to fetch account gifts');
      }
    } catch (error) {
      console.error('Error fetching account gifts:', error);
      toast.error('Failed to fetch account gifts');
    } finally {
      setIsLoadingAccount(false);
    }
  };
  
  // Add Sticker drawer functions
  const openAddStickerDrawer = async () => {
    setSelectedCollection(null);
    setSelectedPack(null);
    setStickerSearchTerm('');
    setStickerPackSearchTerm('');
    hapticFeedback('selection');
    // Load sticker collections before opening
    await loadStickerCollections();
    setIsAddStickerDrawerOpen(true);
  };

  const closeAddStickerDrawer = () => {
    setIsAddStickerDrawerOpen(false);
    setSelectedCollection(null);
    setSelectedPack(null);
    setStickerSearchTerm('');
    setStickerPackSearchTerm('');
  };

  const loadStickerCollections = async () => {
    try {
      console.log('Loading sticker collections...');
      const response = await fetch('/api/portfolio/sticker-collections');
      console.log('Collections response:', response.status, response.ok);
      if (response.ok) {
        const data = await response.json();
        console.log('Collections data:', data);
        if (data.success && data.collections) {
          console.log('Setting collections:', data.collections.length);
          setStickerCollections(data.collections);
        }
      }
    } catch (error) {
      console.error('Error loading sticker collections:', error);
    }
  };

  const selectCollection = (collection: string) => {
    setSelectedCollection(collection);
    setStickerSearchTerm('');
    setSelectedPack(null);
    setStickerPackSearchTerm('');
    // Load sticker packs for this collection
    loadStickerPacks(collection);
    hapticFeedback('impact');
  };

  const loadStickerPacks = async (collection: string) => {
    try {
      const response = await fetch(`/api/portfolio/sticker-packs?collection=${encodeURIComponent(collection)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.packs) {
          setStickerPacks(data.packs);
        }
      }
    } catch (error) {
      console.error('Error loading sticker packs:', error);
    }
  };

  const selectPack = (pack: {name: string, filename: string}) => {
    setSelectedPack(pack);
    hapticFeedback('impact');
  };

  const handleSaveSticker = async () => {
    if (!selectedCollection || !selectedPack) {
      toast.error('Please select a collection and sticker pack');
      return;
    }

    const loadingToast = toast.loading('Fetching sticker price...');

    let initPrice = undefined;
    let currentPrice = undefined;

    try {
      // Fetch price from stickers.tools API
      const collectionFormatted = selectedCollection.toLowerCase().replace(/\s+/g, '_');
      const packFormatted = selectedPack.name.toLowerCase().replace(/\s+/g, '_');
      const response = await fetch(`/api/portfolio/sticker-price?collection=${encodeURIComponent(collectionFormatted)}&pack=${encodeURIComponent(packFormatted)}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          initPrice = data.init_price_usd || undefined;
          currentPrice = data.current_price_usd || undefined;
        }
      }
    } catch (error) {
      console.error('Error fetching sticker price:', error);
    }

    const newSticker: StickerNFT = {
      collection: selectedCollection,
      character: selectedPack.name,
      token_id: `CUSTOM-${Date.now()}`,
      sticker_ids: [],
      sticker_count: 1,
      init_price_usd: initPrice,
      current_price_usd: currentPrice,
      filename: selectedPack.filename
    };

    // Add to stickers
    setStickers(prev => [...prev, newSticker]);
    closeAddStickerDrawer();
    toast.dismiss(loadingToast);
    toast.success('Sticker added to portfolio!');

    // Save to database via API for cross-device sync
    try {
      const { getAuthHeaders } = await import('@/lib/apiClient');
      const headers = getAuthHeaders();
      
      const response = await fetch('/api/portfolio/custom-stickers', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sticker: newSticker })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Custom sticker saved to database:', result);
      } else {
        console.error('⚠️ Failed to save custom sticker to database:', response.status);
      }
    } catch (error) {
      console.error('❌ Error saving custom sticker to database:', error);
      // Don't show error to user as the sticker is already added locally
    }
  };

  // Calculate portfolio change
  const calculateChange = () => {
    if (portfolioHistory.length < 2) return { value: 0, percentage: 0 };

    const latest = portfolioHistory[portfolioHistory.length - 1]?.total_value || totalValue;
    const previous = portfolioHistory[portfolioHistory.length - 2]?.total_value || latest;

    const valueChange = latest - previous;
    const percentageChange = previous !== 0 ? (valueChange / previous) * 100 : 0;

    return {
      value: valueChange,
      percentage: percentageChange
    };
  };

  const change = calculateChange();
  const isPositive = change.value >= 0;

  // Load portfolio aggregated chart data
  const loadPortfolioChartData = async () => {
    if (gifts.length === 0) {
      setPortfolioChartData([]);
      setPortfolioChartLoading(false);
      return;
    }

    console.log('📊 Loading portfolio chart data for', gifts.length, 'gifts');
    setPortfolioChartLoading(true);
    try {
      const webApp = (window as any).Telegram?.WebApp || (window as any).tg;
      const initData = webApp?.initData;
      
      const headers: Record<string, string> = {};
      if (initData) {
        headers['X-Telegram-Init-Data'] = initData;
    }

      const chartUrl = `/api/portfolio/aggregated-chart?type=${portfolioChartType}&mode=${portfolioChartMode}`;
      console.log('📊 Fetching portfolio chart:', chartUrl, 'for', gifts.length, 'gifts');
      
      // Send gifts data in request body to avoid slow API call
      const response = await fetch(chartUrl, { 
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ gifts })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Portfolio chart API error:', response.status, errorText);
        setPortfolioChartData([]);
        return;
      }
      
      const result = await response.json();
      console.log('📊 Portfolio chart response:', { success: result.success, dataLength: result.data?.length });
      
      if (result.success && result.data && Array.isArray(result.data)) {
        if (result.data.length > 0) {
          console.log('✅ Portfolio chart data loaded:', result.data.length, 'points');
          setPortfolioChartData(result.data);
        } else {
          console.warn('⚠️ Portfolio chart data is empty');
          setPortfolioChartData([]);
        }
      } else {
        console.error('❌ Invalid portfolio chart response:', result);
        setPortfolioChartData([]);
      }
    } catch (error) {
      console.error('❌ Error loading portfolio chart data:', error);
      setPortfolioChartData([]);
    } finally {
      setPortfolioChartLoading(false);
    }
  };

  // Render portfolio chart when data changes
  useEffect(() => {
    if (portfolioChartData.length > 0 && portfolioChartCanvasRef.current) {
      setTimeout(() => {
        renderPortfolioChartCanvas();
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioChartData, portfolioChartType]);

  // Resize observer for portfolio chart container
  useEffect(() => {
    const canvas = portfolioChartCanvasRef.current;
    if (!canvas) return;
    
    const container = canvas.parentElement;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      if (portfolioChartData.length > 0) {
        renderPortfolioChartCanvas();
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioChartData]);

  // Load portfolio chart when gifts or chart settings change
  useEffect(() => {
    if (gifts.length > 0) {
      loadPortfolioChartData();
    } else {
      setPortfolioChartData([]);
      setPortfolioChartLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gifts.length, portfolioChartType, portfolioChartMode]);

  // Render portfolio chart on canvas
  const renderPortfolioChartCanvas = () => {
    const canvas = portfolioChartCanvasRef.current;
    if (!canvas || portfolioChartData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = canvas.parentElement;
    const containerWidth = container?.clientWidth || 400;
    const containerHeight = 64; // Fixed height for small chart
    const width = containerWidth;
    const height = containerHeight;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    
    const scaledWidth = width;
    const scaledHeight = height;

    // Transparent background - no fill
    ctx.clearRect(0, 0, scaledWidth, scaledHeight);

    const paddingTop = 4;
    const paddingBottom = 4;
    const paddingLeft = 4;
    const paddingRight = 4;
    const chartWidth = scaledWidth - paddingLeft - paddingRight;
    const chartHeight = scaledHeight - paddingTop - paddingBottom;

    const prices = portfolioChartData.map((point: any) => {
      return parseFloat(point.priceUsd || point.price || 0) || 0;
    });
    
    if (prices.length === 0) return;
    
    const maxPrice = Math.max(...prices, 1);
    const minPrice = Math.min(...prices, 0);
    const priceRange = maxPrice - minPrice || 1;

    const xScale = (index: number) => {
      if (prices.length <= 1) return paddingLeft + chartWidth / 2;
      return paddingLeft + (index / (prices.length - 1)) * chartWidth;
    };
    
    const yScale = (price: number) => {
      if (priceRange === 0) return paddingTop + chartHeight / 2;
      const normalized = (price - minPrice) / priceRange;
      return paddingTop + chartHeight * (1 - normalized);
    };

    // Clean green gradient for area fill
    const areaGradient = ctx.createLinearGradient(0, paddingTop, 0, scaledHeight - paddingBottom);
    areaGradient.addColorStop(0, 'rgba(34, 197, 94, 0.25)'); // Bright green near line
    areaGradient.addColorStop(0.7, 'rgba(34, 197, 94, 0.1)'); // Medium green
    areaGradient.addColorStop(1, 'rgba(34, 197, 94, 0)'); // Transparent at bottom

    ctx.fillStyle = areaGradient;
    ctx.beginPath();
    ctx.moveTo(xScale(0), scaledHeight - paddingBottom);
    
    if (prices.length > 0) {
      ctx.moveTo(xScale(0), yScale(prices[0]));
      if (prices.length > 1) {
        for (let i = 0; i < prices.length - 1; i++) {
          const x0 = xScale(i);
          const y0 = yScale(prices[i]);
          const x1 = xScale(i + 1);
          const y1 = yScale(prices[i + 1]);
          const cpX = (x0 + x1) / 2;
          ctx.bezierCurveTo(cpX, y0, cpX, y1, x1, y1);
        }
      }
    }
    
    ctx.lineTo(xScale(prices.length - 1), scaledHeight - paddingBottom);
    ctx.lineTo(xScale(0), scaledHeight - paddingBottom);
    ctx.closePath();
    ctx.fill();

    // Clean bright green line
    ctx.strokeStyle = '#22c55e'; // Bright green
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    if (prices.length > 0) {
      ctx.moveTo(xScale(0), yScale(prices[0]));
      if (prices.length > 1) {
        for (let i = 0; i < prices.length - 1; i++) {
          const x0 = xScale(i);
          const y0 = yScale(prices[i]);
          const x1 = xScale(i + 1);
          const y1 = yScale(prices[i + 1]);
          const cpX = (x0 + x1) / 2;
          ctx.bezierCurveTo(cpX, y0, cpX, y1, x1, y1);
        }
      }
    }
    ctx.stroke();
  };

  return (
    <div className="space-y-4 py-4 animate-fade-in">
      {/* Ads Banner */}
      <AdsBanner />

      {/* Inner Tabs */}
      <div className="flex justify-start px-3 sm:px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex space-x-4 sm:space-x-6 md:space-x-8">
          <button
            onClick={() => setActiveTab('gifts')}
            className={`text-base sm:text-lg font-medium transition-all duration-200 ease-in-out capitalize ${
              activeTab === 'gifts'
                ? 'text-white border-b-2 border-white pb-1 scale-105'
                : 'text-gray-400 hover:text-gray-300 hover:scale-105'
            }`}
          >
            Gifts
          </button>
          <button
            onClick={() => setActiveTab('stickers')}
            className={`text-base sm:text-lg font-medium transition-all duration-200 ease-in-out capitalize ${
              activeTab === 'stickers'
                ? 'text-white border-b-2 border-white pb-1 scale-105'
                : 'text-gray-400 hover:text-gray-300 hover:scale-105'
            }`}
          >
            Stickers
          </button>
        </div>
      </div>

      {activeTab === 'gifts' && (
        <>
          {/* Portfolio Summary Card - Glassy Design */}
          <div className="mx-4 rounded-2xl p-4 backdrop-blur-xl bg-[#1c1d1f]/40 border border-gray-700/50 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">
                  <span className="text-blue-400">{gifts.length} gift{gifts.length !== 1 ? 's' : ''}</span>
                </span>
                <span className="text-gray-600">·</span>
                <button
                  onClick={handleUpdate}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Update
                </button>
              </div>
              <button
                onClick={handleShare}
                className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-sm font-medium"
              >
                Share
<EyeIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center gap-1 text-3xl font-semibold text-white leading-tight">
                  <img src={getCurrencyDisplay().icon} alt={getCurrencyDisplay().label} className="w-5 h-5" />
                  {formatPrice(totalValue)}
                </div>
                <div className={`text-sm font-medium mt-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {isPositive ? '+' : ''}{formatPrice(change.value)} <span className="opacity-70">{isPositive ? '+' : ''}{change.percentage.toFixed(2)}%</span>
                </div>
              </div>
              <div className="flex-1 ml-4 relative h-16">
                {portfolioChartLoading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
                ) : portfolioChartData.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                    No chart data
                  </div>
                ) : null}
                <canvas 
                  ref={portfolioChartCanvasRef} 
                  className="w-full h-16 absolute inset-0" 
                  style={{ display: portfolioChartLoading || portfolioChartData.length === 0 ? 'none' : 'block' }} 
                />
                
                {/* Settings Icon */}
                <button
                  onClick={() => setShowPortfolioSettings(!showPortfolioSettings)}
                  className="absolute bottom-0 right-0 p-1.5 bg-gray-700/80 hover:bg-gray-700 rounded-full transition-colors"
                  title="Chart Settings"
                >
                  <Cog6ToothIcon className="w-3.5 h-3.5 text-gray-300" />
                </button>

                {/* Settings Panel */}
                {showPortfolioSettings && (
                  <>
                    <div 
                      className="fixed inset-0 z-[5]" 
                      onClick={() => setShowPortfolioSettings(false)}
                    />
                    <div className="absolute bottom-8 right-0 bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl z-[10] min-w-[200px]">
                    <div className="mb-3">
                      <div className="text-xs text-gray-400 mb-2">Chart Mode</div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setPortfolioChartMode('gift');
                            setShowPortfolioSettings(false);
                          }}
                          className={`px-3 py-1.5 text-xs rounded ${portfolioChartMode === 'gift' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'}`}
                        >
                          Gift
                        </button>
                        <button
                          onClick={() => {
                            setPortfolioChartMode('model');
                            setShowPortfolioSettings(false);
                          }}
                          className={`px-3 py-1.5 text-xs rounded ${portfolioChartMode === 'model' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'}`}
                        >
                          Model
                        </button>
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="text-xs text-gray-400 mb-2">Time Period</div>
                      <div className="flex flex-wrap gap-2">
                        {(['24h', '3d', '1w', '1m'] as const).map((type) => (
                          <button
                            key={type}
                            onClick={() => {
                              setPortfolioChartType(type);
                              setShowPortfolioSettings(false);
                            }}
                            className={`px-2 py-1 text-xs rounded ${portfolioChartType === type ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'}`}
                          >
                            {type.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-2">Currency</div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setCurrency('TON');
                            localStorage.setItem('portfolio_currency', 'TON');
                            setShowPortfolioSettings(false);
                          }}
                          className={`px-3 py-1.5 text-xs rounded flex items-center gap-1 ${currency === 'TON' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'}`}
                        >
                          <img src="/icons/ton.svg" alt="TON" className="w-3 h-3" />
                          TON
                        </button>
                        <button
                          onClick={() => {
                            setCurrency('USD');
                            localStorage.setItem('portfolio_currency', 'USD');
                            setShowPortfolioSettings(false);
                          }}
                          className={`px-3 py-1.5 text-xs rounded flex items-center gap-1 ${currency === 'USD' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'}`}
                        >
                          <img src="/icons/dollar.svg" alt="USD" className="w-3 h-3" />
                          USD
                        </button>
                      </div>
                    </div>
                  </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Gift List Header */}
          <div className="mx-3 sm:mx-4 md:mx-6 lg:mx-8 flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-semibold text-white">
                Total gifts {Object.keys(filters).some(k => filters[k as keyof typeof filters] !== null && filters[k as keyof typeof filters] !== undefined) ? filteredGifts.length : gifts.length}
                {Object.keys(filters).some(k => filters[k as keyof typeof filters] !== null && filters[k as keyof typeof filters] !== undefined) && (
                  <span className="text-gray-400 text-sm font-normal"> / {gifts.length}</span>
                )}
              </h3>
              <button
                onClick={openAddGiftDrawer}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                title="Add gift"
              >
                <PlusIcon className="w-5 h-5 text-blue-400" />
              </button>
            </div>
            <button 
              onClick={() => setIsFilterDrawerOpen(true)}
              className="text-sm text-blue-500 hover:text-blue-400 transition-colors"
            >
              Add filter
            </button>
          </div>


          {/* Gifts Grid */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 mt-4">Loading portfolio...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 px-3 sm:px-4 md:px-6 lg:px-8 pb-4 relative z-0 max-w-7xl mx-auto">
              {filteredGifts.map((gift, index) => {
                console.log('🎁 Rendering gift:', { index, gift: { title: gift.title, slug: gift.slug, num: gift.num } });
                // Determine gift ID based on whether it's custom or auto
                const giftId = gift.is_custom 
                  ? `custom_${gift.slug || gift.title}_${gift.num || ''}`
                  : `auto_${gift.slug || gift.title}_${gift.num || ''}`;
                const isHidden = isGiftHidden(giftId);
                return (
                <div
                  key={`${gift.slug || 'gift'}-${gift.num || index}-${index}`}
                  onClick={() => handleGiftClick(gift)}
                  className={`rounded-2xl p-3 cursor-pointer hover:scale-105 transition-all relative z-0 overflow-hidden group backdrop-blur-xl bg-[#1c1d1f]/40 border border-[#242829] shadow-lg shadow-black/20 ${isHidden ? 'opacity-60 blur-sm' : ''}`}
                >

                  {/* Gift Image - using fragment.com URL like Collection tab */}
                  <div className="relative z-10 mb-2">
                    <div className="aspect-square w-full rounded-xl overflow-hidden bg-gray-900/30 backdrop-blur-sm border border-[#242829] relative">
                      {gift.fragment_url ? (
                        // Use fragment.com image URL (same format as Collection tab)
                        <img
                          src={gift.fragment_url}
                          alt={gift.title}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback if image fails to load
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const fallback = target.parentElement?.querySelector('.fallback-placeholder');
                            if (fallback) {
                              (fallback as HTMLElement).style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      {/* Fallback placeholder if image fails or doesn't exist */}
                      <div className="fallback-placeholder absolute inset-0 w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-gray-400 text-2xl" style={{ display: gift.fragment_url ? 'none' : 'flex' }}>
                        ?
                      </div>
                      {/* Ribbon number badge - glassy style */}
                      {gift.num && (
                        <div className="absolute top-2 left-2 backdrop-blur-md bg-black/50 text-white text-xs font-bold px-2 py-1 rounded-lg border border-[#242829]">
                          #{gift.num}
                        </div>
                      )}
                      <div className="absolute top-2 right-2 text-xs text-white backdrop-blur-md bg-black/50 px-2 py-1 rounded-lg border border-[#242829]">
                        {index + 1} of {filteredGifts.length}
                      </div>
                    </div>
                  </div>

                  {/* Gift Info */}
                  <div className="relative z-10 space-y-1" style={{ position: 'relative' }}>
                    <h4 className="font-bold text-white text-xs sm:text-sm truncate" style={{ position: 'relative', zIndex: 10 }}>{gift.title}</h4>
                    <p className="text-[10px] sm:text-xs text-blue-200" style={{ position: 'relative', zIndex: 10 }}>#{gift.num} 1%</p>
                    
                    <div className="flex items-center gap-1 text-xs text-white mt-2">
                      <span className="text-blue-200">Est. price</span>
                      <img src={getCurrencyDisplay().icon} alt={getCurrencyDisplay().label} className="w-3 h-3" />
                      <span className="font-semibold">
                        {formatPrice(gift.price)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-blue-200">
                      <span>Floor</span>
                      <img src={getCurrencyDisplay().icon} alt={getCurrencyDisplay().label} className="w-3 h-3" />
                      <span>
                        {formatPrice(gift.price)}{' '}
                        {gift.price !== null && gift.price !== undefined && '+0.60%'}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#242829]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Use the same giftId that was determined above for blur effect
                          toggleGiftHidden(giftId);
                          hapticFeedback('impact', 'light', webApp || undefined);
                        }}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-all backdrop-blur-sm"
                        title={isHidden ? "Show in portfolio" : "Hide from portfolio"}
                      >
                        {isHidden ? (
                          <EyeSlashIcon className="w-4 h-4 text-white/80" />
                        ) : (
                          <EyeIcon className="w-4 h-4 text-white/80" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          hapticFeedback('impact', 'light', webApp || undefined);
                        }}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-all backdrop-blur-sm"
                      >
                        <StarIcon className="w-4 h-4 text-white/80" />
                      </button>
                      {gift.is_custom && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Open drawer with this gift's info to edit
                          setSelectedGiftName(gift.title);
                          setRibbonNumber(gift.num?.toString() || '');
                          setIsAddGiftDrawerOpen(true);
                          hapticFeedback('selection');
                        }}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-all backdrop-blur-sm"
                        title="Edit gift"
                      >
                        <Cog6ToothIcon className="w-4 h-4 text-white/80" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGift(gift, index);
                        }}
                        className="p-1.5 hover:bg-red-500/20 rounded-lg transition-all backdrop-blur-sm"
                        title="Delete gift"
                      >
                        <XMarkIcon className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
              
              {/* Channel Gifts */}
              {channelGifts.map((cg, cgIndex) => {
                console.log('🎁 Rendering channel gift:', {
                  username: cg.channel_username,
                  gifts_breakdown: cg.gifts_breakdown,
                  gifts_count: cg.gifts_breakdown?.length
                });
                const isHidden = isChannelGiftHidden(cg.channel_id);
                return (
                <div
                  key={`channel-gifts-${cg.channel_id}-${cgIndex}`}
                  onClick={(e) => {
                    // Don't open drawer if clicking on a button or button container
                    const target = e.target as HTMLElement;
                    const isButton = target.closest('button') !== null;
                    const isActionContainer = target.closest('[data-action-container]') !== null;
                    
                    if (isButton || isActionContainer) {
                      return;
                    }
                    
                    setSelectedChannelGift(cg);
                    setIsChannelGiftDrawerOpen(true);
                    hapticFeedback('impact', 'light', webApp || undefined);
                  }}
                  className={`rounded-2xl p-3 cursor-pointer hover:scale-105 transition-all relative z-0 overflow-hidden group backdrop-blur-xl bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-[#242829] shadow-lg shadow-black/20 ${isHidden ? 'opacity-60 blur-sm' : ''}`}
                >
                  {/* Channel Gifts Preview Grid */}
                  <div className="relative z-10 mb-2">
                    <div className="aspect-square w-full rounded-xl overflow-hidden bg-gray-900/30 backdrop-blur-sm border border-[#242829] relative">
                      <div className="grid grid-cols-2 gap-1 p-2 h-full">
                        {cg.gifts_breakdown?.slice(0, 4).map((gift: any, giftIndex: number) => {
                          const imageUrl = getGiftImageUrl(gift);
                          console.log('🖼️ Rendering gift preview:', {
                            gift,
                            id: gift.id,
                            name: gift.name,
                            count: gift.count,
                            url: imageUrl
                          });
                          return (
                          <div key={giftIndex} className="relative aspect-square bg-gray-800/50 rounded-lg overflow-hidden">
                            {imageUrl && (
                              <img 
                                src={imageUrl} 
                                alt={gift.name || 'Gift'} 
                                className="absolute inset-0 w-full h-full object-cover"
                                onError={(e) => {
                                  console.error('❌ Image failed to load:', e);
                                  e.currentTarget.style.display = 'none';
                                }}
                                onLoad={() => console.log('✅ Image loaded successfully')}
                              />
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-blue-600/90 text-white text-xs font-bold text-center py-0.5">
                              x{gift.count}
                            </div>
                          </div>
                        )})}
                        {cg.gifts_breakdown?.length === 0 && (
                          <div className="col-span-2 flex items-center justify-center text-gray-400 text-xs">
                            No gifts
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Channel Info */}
                  <div className="relative z-10 space-y-1">
                    <h4 className="font-bold text-white text-sm truncate">@{cg.channel_username}</h4>
                    <p className="text-xs text-blue-200">{cg.total_gifts} gifts</p>
                    
                    <div className="flex items-center gap-1 text-xs text-white mt-2">
                      <span className="text-blue-200">Total value</span>
                      <img src={getCurrencyDisplay().icon} alt={getCurrencyDisplay().label} className="w-3 h-3" />
                      <span className="font-semibold">
                        {formatPrice(cg.total_value)}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div 
                      data-action-container="true"
                      className="flex items-center gap-2 mt-2 pt-2 border-t border-[#242829] relative z-50"
                      onClick={(e) => {
                        // Stop all clicks in this container from bubbling to parent
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      onMouseDown={(e) => {
                        // Also stop mousedown events (desktop issue)
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          toggleChannelGiftHidden(cg.channel_id);
                          hapticFeedback('impact', 'light', webApp || undefined);
                        }}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-all backdrop-blur-sm"
                        title={isChannelGiftHidden(cg.channel_id) ? "Show in portfolio" : "Hide from portfolio"}
                      >
                        {isChannelGiftHidden(cg.channel_id) ? (
                          <EyeSlashIcon className="w-4 h-4 text-white/80" />
                        ) : (
                          <EyeIcon className="w-4 h-4 text-white/80" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          hapticFeedback('impact', 'light', webApp || undefined);
                        }}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-all backdrop-blur-sm"
                      >
                        <StarIcon className="w-4 h-4 text-white/80" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          // Use setTimeout to ensure this runs after any parent handlers
                          setTimeout(() => {
                            handleDeleteChannelGifts(cg, e);
                          }, 0);
                        }}
                        onMouseDown={(e) => {
                          // Prevent parent onClick on mousedown too (desktop issue)
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        onMouseUp={(e) => {
                          // Also prevent on mouseup
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        className="p-1.5 hover:bg-red-500/20 rounded-lg transition-all backdrop-blur-sm cursor-pointer"
                        style={{ pointerEvents: 'auto', position: 'relative', zIndex: 100 }}
                        title="Delete channel gifts"
                      >
                        <XMarkIcon className="w-4 h-4 text-red-400 pointer-events-none" />
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
              
              {/* Add Gift Box */}
              <div
                onClick={openAddGiftDrawer}
                className="rounded-2xl p-3 cursor-pointer hover:scale-105 transition-transform relative z-0 overflow-hidden group backdrop-blur-xl bg-[#1c1d1f]/40 border border-[#242829] shadow-lg shadow-black/20 border-dashed"
              >
                <div className="relative z-10 mb-2">
                  <div className="aspect-square w-full rounded-xl overflow-hidden bg-gray-900/30 backdrop-blur-sm border border-[#242829] relative flex items-center justify-center">
                    <div className="text-gray-400 flex flex-col items-center gap-2">
                      <PlusIcon className="w-12 h-12" />
                      <span className="text-xs font-medium">Add Gift</span>
                    </div>
                  </div>
                </div>
                <div className="relative z-10 space-y-1">
                  <h4 className="font-bold text-gray-400 text-sm truncate">Custom Gift</h4>
                  <p className="text-xs text-gray-500">Click to add</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'stickers' && (
        <>
          {/* Portfolio Summary Card - Glassy Design */}
          <div className="mx-4 rounded-2xl p-4 backdrop-blur-xl bg-[#1c1d1f]/40 border border-gray-700/50 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">
                  <span className="text-blue-400">{stickers.length} NFT{stickers.length !== 1 ? 's' : ''}</span>
                </span>
                <span className="text-gray-600">·</span>
                <button
                  onClick={() => loadStickers()}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="flex items-end justify-between relative">
              <div>
                <div className="flex items-center gap-1 text-3xl font-semibold text-white leading-tight">
                  <img src={getCurrencyDisplay().icon} alt={getCurrencyDisplay().label} className="w-5 h-5" />
                  {formatUsdPrice(stickerPortfolio?.portfolio_value?.total_current || 0)}
                </div>
                <div className={`text-sm font-medium mt-1 ${(stickerPortfolio?.portfolio_value?.total_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(stickerPortfolio?.portfolio_value?.total_pnl || 0) >= 0 ? '+' : ''}
                  {formatUsdPrice(stickerPortfolio?.portfolio_value?.total_pnl || 0)}
                  {' '}
                  <span className="opacity-70">
                    ({stickerPortfolio?.portfolio_value?.total_pnl && stickerPortfolio?.portfolio_value?.total_init
                      ? `${((stickerPortfolio.portfolio_value.total_pnl / stickerPortfolio.portfolio_value.total_init) * 100).toFixed(2)}%`
                      : '0%'})
                  </span>
                </div>
              </div>
              
              {/* Settings Icon */}
              <button
                onClick={() => setShowStickerSettings(!showStickerSettings)}
                className="absolute bottom-0 right-0 p-1.5 bg-gray-700/80 hover:bg-gray-700 rounded-full transition-colors"
                title="Settings"
              >
                <Cog6ToothIcon className="w-3.5 h-3.5 text-gray-300" />
              </button>
            </div>

            {/* Settings Panel */}
            {showStickerSettings && (
              <>
                <div 
                  className="fixed inset-0 z-[5]" 
                  onClick={() => setShowStickerSettings(false)}
                />
                <div className="absolute bottom-8 right-0 bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl z-[10] min-w-[200px]">
                  <div className="mb-3">
                    <div className="text-xs text-gray-400 mb-2">Currency</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setCurrency('TON');
                          localStorage.setItem('portfolio_currency', 'TON');
                          setShowStickerSettings(false);
                        }}
                        className={`px-3 py-1.5 text-xs rounded flex items-center gap-1 ${currency === 'TON' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'}`}
                      >
                        <img src="/icons/ton.svg" alt="TON" className="w-3 h-3" />
                        TON
                      </button>
                      <button
                        onClick={() => {
                          setCurrency('USD');
                          localStorage.setItem('portfolio_currency', 'USD');
                          setShowStickerSettings(false);
                        }}
                        className={`px-3 py-1.5 text-xs rounded flex items-center gap-1 ${currency === 'USD' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'}`}
                      >
                        <img src="/icons/dollar.svg" alt="USD" className="w-3 h-3" />
                        USD
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Stickers Grid */}
          {stickersLoading ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 mt-4">Loading stickers...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 px-3 sm:px-4 md:px-6 lg:px-8 pb-4 relative z-0 max-w-7xl mx-auto">
              {stickers.map((sticker, index) => {
                const isHidden = sticker.sticker_id ? isStickerHidden(sticker.sticker_id.toString()) : false;
                return (
                <div
                  key={`${sticker.collection}-${sticker.token_id}-${index}`}
                  className={`rounded-2xl p-3 cursor-pointer hover:scale-105 transition-all relative z-0 overflow-hidden group backdrop-blur-xl bg-[#1c1d1f]/40 border border-[#242829] shadow-lg shadow-black/20 ${isHidden ? 'opacity-60 blur-sm' : ''}`}
                >
                  {/* Sticker Image */}
                  <div className="relative z-10 mb-2">
                    <div 
                      className="aspect-square w-full rounded-xl overflow-hidden bg-gradient-to-br from-blue-900/30 to-purple-900/30 backdrop-blur-sm border border-[#242829] relative flex items-center justify-center"
                      onClick={() => {
                        setSelectedSticker(sticker);
                        setIsStickerDrawerOpen(true);
                        hapticFeedback('impact', 'light', webApp || undefined);
                      }}
                    >
                      <img 
                        src={getStickerImageUrl(sticker.collection, sticker.character, sticker.filename)}
                        alt={sticker.character}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          // Fallback to palette emoji if image fails to load
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.parentElement) {
                            const fallback = document.createElement('div');
                            fallback.className = 'text-gray-400 text-2xl absolute';
                            fallback.textContent = '🎨';
                            e.currentTarget.parentElement.appendChild(fallback);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Sticker Info */}
                  <div className="relative z-10 space-y-1" style={{ position: 'relative' }}>
                    <h4 className="font-bold text-white text-sm truncate" style={{ position: 'relative', zIndex: 10 }}>{sticker.collection}</h4>
                    <p className="text-xs text-blue-200 truncate" style={{ position: 'relative', zIndex: 10 }}>{sticker.character}</p>
                    
                    <div className="flex items-center gap-1 text-xs text-white mt-2">
                      <span className="text-blue-200">Price</span>
                      <img src={getCurrencyDisplay().icon} alt={getCurrencyDisplay().label} className="w-3 h-3" />
                      <span className="font-semibold">
                        {formatUsdPrice(sticker.current_price_usd || 0)}
                      </span>
                    </div>

                    {sticker.init_price_usd && sticker.current_price_usd && (
                      <div className="flex items-center gap-1 text-xs">
                        <span className={`${
                          (sticker.current_price_usd - sticker.init_price_usd) >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {(sticker.current_price_usd - sticker.init_price_usd) >= 0 ? '+' : ''}
                          {formatUsdPrice(sticker.current_price_usd - sticker.init_price_usd)}
                          {' '}
                          ({(((sticker.current_price_usd - sticker.init_price_usd) / sticker.init_price_usd) * 100).toFixed(2)}%)
                        </span>
        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#242829]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (sticker.sticker_id) {
                            toggleStickerHidden(sticker.sticker_id.toString());
                          }
                          hapticFeedback('impact', 'light', webApp || undefined);
                        }}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-all backdrop-blur-sm"
                        title={sticker.sticker_id && isStickerHidden(sticker.sticker_id.toString()) ? "Show in portfolio" : "Hide from portfolio"}
                      >
                        {sticker.sticker_id && isStickerHidden(sticker.sticker_id.toString()) ? (
                          <EyeSlashIcon className="w-4 h-4 text-white/80" />
                        ) : (
                          <EyeIcon className="w-4 h-4 text-white/80" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          hapticFeedback('impact', 'light', webApp || undefined);
                        }}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-all backdrop-blur-sm"
                      >
                        <StarIcon className="w-4 h-4 text-white/80" />
                      </button>
                      {sticker.is_custom && sticker.sticker_id && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Implement edit sticker functionality
                              hapticFeedback('selection');
                            }}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-all backdrop-blur-sm"
                            title="Edit sticker"
                          >
                            <Cog6ToothIcon className="w-4 h-4 text-white/80" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSticker(sticker, index);
                            }}
                            className="p-1.5 hover:bg-red-500/20 rounded-lg transition-all backdrop-blur-sm"
                            title="Delete sticker"
                          >
                            <XMarkIcon className="w-4 h-4 text-red-400" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
              {/* Add Sticker Box */}
              <div
                onClick={openAddStickerDrawer}
                className="rounded-2xl p-3 cursor-pointer hover:scale-105 transition-transform relative z-0 overflow-hidden group backdrop-blur-xl bg-[#1c1d1f]/40 border border-[#242829] shadow-lg shadow-black/20 border-dashed"
              >
                <div className="relative z-10 mb-2">
                  <div className="aspect-square w-full rounded-xl overflow-hidden bg-gray-900/30 backdrop-blur-sm border border-[#242829] relative flex items-center justify-center">
                    <div className="text-gray-400 flex flex-col items-center gap-2">
                      <PlusIcon className="w-12 h-12" />
                      <span className="text-xs font-medium">Add Sticker</span>
                    </div>
                  </div>
                </div>
                <div className="relative z-10 space-y-1">
                  <h4 className="font-bold text-gray-400 text-sm truncate">Custom Sticker</h4>
                  <p className="text-xs text-gray-500">Click to add</p>
            </div>
          </div>
        </div>
          )}
        </>
      )}

      {/* Sticker Detail Drawer */}
      <Sheet open={isStickerDrawerOpen} onOpenChange={setIsStickerDrawerOpen}>
        <SheetContent 
          className="bg-[#1c1d1f] rounded-t-3xl p-0" 
          style={{ 
            height: '90vh', 
            maxHeight: '90vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <SheetTitle className="sr-only">{selectedSticker?.collection || 'Sticker Details'}</SheetTitle>
          
          {selectedSticker && (
            <div className="pb-20">

              {/* Sticker Image */}
                <div className="relative w-full max-w-xs mx-auto mt-12 mb-4 px-4">
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 shadow-2xl">
                    <img
                    src={getStickerImageUrl(selectedSticker.collection, selectedSticker.character, selectedSticker.filename)}
                      alt={selectedSticker.collection}
                      className="absolute inset-0 w-full h-full object-contain p-4"
                      onError={(e) => {
                        // Hide image if it fails to load
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                </div>

              {/* Sticker Header */}
              <div className="text-center px-4 pt-4 pb-6">
                <h2 className="text-2xl font-bold text-white mb-2">{selectedSticker.collection}</h2>
                <p className="text-gray-400 text-lg">{selectedSticker.character}</p>
              </div>

              {/* Sticker Details Section */}
              <div className="px-4 pt-6 pb-8">
                <div className="space-y-4">
                  {/* Collection */}
                  <div className="flex items-center justify-between py-3 border-b border-gray-800">
                    <span className="text-white text-sm">Collection</span>
                    <span className="text-white text-sm font-medium">{selectedSticker.collection}</span>
                  </div>

                  {/* Sticker Pack */}
                  <div className="flex items-center justify-between py-3 border-b border-gray-800">
                    <span className="text-white text-sm">Sticker Pack</span>
                    <span className="text-white text-sm font-medium">{selectedSticker.character}</span>
                  </div>

                  {/* Initial Price → Current Price */}
                  {selectedSticker.init_price_usd !== undefined && selectedSticker.current_price_usd !== undefined && (
                  <div className="flex items-center justify-between py-3 border-b border-gray-800">
                      <span className="text-white text-sm">Price</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">
                          {formatUsdPrice(selectedSticker.init_price_usd)}
                          </span>
                        <span className="text-gray-600">→</span>
                        <span className="text-white text-sm font-medium">
                          {formatUsdPrice(selectedSticker.current_price_usd)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* PNL */}
                  {selectedSticker.init_price_usd !== undefined && selectedSticker.current_price_usd !== undefined && (
                    <div className="flex items-center justify-between py-3 border-b border-gray-800">
                      <span className="text-white text-sm">Profit/Loss</span>
                      <div className="flex items-center gap-1">
                        <span className={`text-sm font-medium ${
                          (selectedSticker.current_price_usd - selectedSticker.init_price_usd) >= 0 
                            ? 'text-green-400' 
                            : 'text-red-400'
                        }`}>
                          {(selectedSticker.current_price_usd - selectedSticker.init_price_usd) >= 0 ? '+' : ''}
                          {formatUsdPrice(selectedSticker.current_price_usd - selectedSticker.init_price_usd)}
                        </span>
                        <span className={`text-xs ${
                          (selectedSticker.current_price_usd - selectedSticker.init_price_usd) >= 0 
                            ? 'text-green-400' 
                            : 'text-red-400'
                        }`}>
                          ({(((selectedSticker.current_price_usd - selectedSticker.init_price_usd) / selectedSticker.init_price_usd) * 100).toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Gift Filter Drawer */}
      <Sheet open={isAddGiftDrawerOpen} onOpenChange={setIsAddGiftDrawerOpen}>
        <SheetContent 
          className="bg-[#1c1d1f] rounded-t-3xl p-0" 
          style={{ 
            height: '90vh', 
            maxHeight: '90vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <SheetTitle className="sr-only">Add Gift</SheetTitle>
          
          <div className="p-6 pb-20">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">Add Gift</h2>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setAddGiftTab('custom')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  addGiftTab === 'custom'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#424242] text-gray-300 hover:bg-[#4a4a4a]'
                }`}
              >
                Custom Gift
              </button>
              <button
                onClick={() => setAddGiftTab('channel')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  addGiftTab === 'channel'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#424242] text-gray-300 hover:bg-[#4a4a4a]'
                }`}
              >
                Channel
              </button>
              <button
                onClick={() => setAddGiftTab('account')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  addGiftTab === 'account'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#424242] text-gray-300 hover:bg-[#4a4a4a]'
                }`}
              >
                Account
              </button>
            </div>
            
            {addGiftTab === 'custom' ? (
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  value={filterSearchTerm}
                  onChange={(e) => setFilterSearchTerm(e.target.value)}
                  placeholder="Search collections..."
                  className="w-full px-4 py-2.5 pl-10 backdrop-blur-sm bg-white/10 border border-[#242829] text-white rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
                />
                <svg 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {filterSearchTerm && (
                  <button
                    onClick={() => setFilterSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Filter Options List */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {(() => {
                  const filteredRegularGifts = allGifts.filter(gift => {
                  if (!filterSearchTerm) return true;
                  return gift.toLowerCase().includes(filterSearchTerm.toLowerCase());
                  });
                  
                  const filteredUnupgradeableGifts = unupgradeableGifts.filter(gift => {
                    if (!filterSearchTerm) return true;
                    return gift.name.toLowerCase().includes(filterSearchTerm.toLowerCase());
                  });
                  
                  const totalResults = filteredRegularGifts.length + filteredUnupgradeableGifts.length;
                  
                  return totalResults === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-sm">No results found</p>
                    <p className="text-xs mt-1">Try a different search term</p>
                  </div>
                ) : (
                    <>
                      {filteredRegularGifts.map((gift, index) => (
                        <div
                          key={`regular-${index}`}
                        className={`flex items-center p-3 rounded-xl bg-[#424242] hover:bg-[#4a4a4a] cursor-pointer transition-colors ${
                          gift === selectedGiftName ? 'ring-2 ring-blue-500' : ''
                        }`}
                          onClick={() => {
                            setSelectedGiftName(gift);
                            setSelectedUnupgradeableGift(null);
                          }}
                      >
                        <div className="w-12 h-12 rounded-lg mr-3 flex items-center justify-center overflow-hidden bg-transparent">
                            <img 
                              src={getCollectionImageUrl(gift)}
                              alt={gift}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling;
                                if (fallback) {
                                  (fallback as HTMLElement).style.display = 'flex';
                                }
                              }}
                            />
                            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold" style={{ display: 'none' }}>
                            {gift.charAt(0)}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-white">{gift}</div>
                        </div>
                        {gift === selectedGiftName && (
                          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      ))}
                      {filteredUnupgradeableGifts.map((gift, index) => (
                        <div
                          key={`unupgradeable-${gift.id}`}
                          className={`flex items-center p-3 rounded-xl bg-[#2d4a2d] hover:bg-[#355a35] cursor-pointer transition-colors ${
                            selectedUnupgradeableGift?.id === gift.id ? 'ring-2 ring-blue-500' : ''
                          }`}
                          onClick={() => {
                            setSelectedUnupgradeableGift(gift);
                            setSelectedGiftName(null);
                          }}
                        >
                          <div className="w-12 h-12 rounded-lg mr-3 flex items-center justify-center overflow-hidden bg-transparent">
                            <img 
                              src={gift.imageUrl}
                              alt={gift.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling;
                                if (fallback) {
                                  (fallback as HTMLElement).style.display = 'flex';
                                }
                              }}
                            />
                            <div className="w-full h-full bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white font-bold" style={{ display: 'none' }}>
                              {gift.name.charAt(0)}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-white">{gift.name}</div>
                            {gift.floorPrice > 0 && (
                              <div className="text-xs text-green-300 mt-0.5">
                                Sale: {formatPrice(gift.floorPrice)} {getCurrencyDisplay().label}
                              </div>
                            )}
                          </div>
                          {selectedUnupgradeableGift?.id === gift.id && (
                            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
              
              {/* Number Input and OK Button */}
              {selectedGiftName && (
                <div className="mt-6 pt-4 border-t border-gray-700 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Gift Number</label>
                    <input
                      type="text"
                      value={ribbonNumber}
                      onChange={(e) => setRibbonNumber(e.target.value)}
                      className="w-full px-4 py-2.5 backdrop-blur-sm bg-white/10 border border-[#242829] text-white rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
                      placeholder="Enter gift number (e.g. 155 or 300000)"
                    />
                  </div>
                  <button
                    onClick={handleSaveGift}
                    className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all"
                  >
                    Add Gift
                  </button>
                </div>
              )}
              {selectedUnupgradeableGift && (
                <div className="mt-6 pt-4 border-t border-gray-700 space-y-3">
                  {/* Price Toggle Switch */}
                  {((selectedUnupgradeableGift.buyPriceStars && typeof selectedUnupgradeableGift.buyPriceStars === 'number') || (selectedUnupgradeableGift.floorPrice && selectedUnupgradeableGift.floorPrice > 0)) && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 border border-gray-700">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-300">
                          {useFirstHandPrice ? '1st Hand Price' : '2nd Hand Price'}
                        </span>
                        <span className="text-xs text-gray-400 mt-0.5">
                          {useFirstHandPrice ? 'Official Telegram market' : 'MRKT/Quant market'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUseFirstHandPrice(!useFirstHandPrice)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          useFirstHandPrice ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            useFirstHandPrice ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  )}
                  
                  {/* Price Display */}
                  <div className="p-3 rounded-lg bg-gray-800/30 border border-gray-700">
                    {useFirstHandPrice ? (
                      selectedUnupgradeableGift.buyPriceStars && typeof selectedUnupgradeableGift.buyPriceStars === 'number' ? (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300 text-sm">Price:</span>
                          <span className="text-blue-300 font-medium text-sm">
                            {selectedUnupgradeableGift.buyPriceStars} ⭐ = ${starsToUsd(selectedUnupgradeableGift.buyPriceStars).toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">First-hand price not available</div>
                      )
                    ) : (
                      selectedUnupgradeableGift.floorPrice > 0 ? (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300 text-sm">Price:</span>
                          <span className="text-green-300 font-medium text-sm">
                            {formatPrice(selectedUnupgradeableGift.floorPrice)} {getCurrencyDisplay().label}
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">Second-hand price not available</div>
                      )
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={ribbonNumber}
                      onChange={(e) => setRibbonNumber(e.target.value)}
                      className="w-full px-4 py-2.5 backdrop-blur-sm bg-white/10 border border-[#242829] text-white rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50"
                      placeholder="How many? (e.g. 15 or 100)"
                    />
                    {ribbonNumber && !isNaN(Number(ribbonNumber)) && Number(ribbonNumber) > 0 && (
                      <div className="mt-2 text-sm space-y-1">
                        {useFirstHandPrice ? (
                          selectedUnupgradeableGift.buyPriceStars && typeof selectedUnupgradeableGift.buyPriceStars === 'number' ? (
                            <div className="text-blue-300">
                              Total value: {Number(ribbonNumber) * selectedUnupgradeableGift.buyPriceStars} ⭐ = ${(starsToUsd(selectedUnupgradeableGift.buyPriceStars) * Number(ribbonNumber)).toFixed(2)}
                            </div>
                          ) : null
                        ) : (
                          selectedUnupgradeableGift.floorPrice > 0 ? (
                            <div className="text-green-300">
                              Total value: {formatPrice(Number(ribbonNumber) * selectedUnupgradeableGift.floorPrice)} {getCurrencyDisplay().label}
                            </div>
                          ) : null
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSaveUnupgradeableGift}
                    disabled={!ribbonNumber || isNaN(Number(ribbonNumber)) || Number(ribbonNumber) <= 0}
                    className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-green-600 hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                  >
                    Add Gift
                  </button>
                </div>
              )}
              </div>
            ) : addGiftTab === 'channel' ? (
              <div className="space-y-6">
                {/* Channel Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Channel Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                    <input
                      type="text"
                      value={channelUsername}
                      onChange={(e) => setChannelUsername(e.target.value)}
                      placeholder="Enter channel username"
                      className="w-full px-4 py-2.5 pl-9 backdrop-blur-sm bg-white/10 border border-[#242829] text-white rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Enter a public Telegram channel username</p>
                </div>
                
                {/* Add Button */}
                <button
                  onClick={fetchChannelGifts}
                  disabled={isLoadingChannel || !channelUsername.trim()}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {isLoadingChannel ? 'Loading...' : 'Add Channel Gifts'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Account Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Account Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                    <input
                      type="text"
                      value={accountUsername}
                      onChange={(e) => setAccountUsername(e.target.value)}
                      placeholder="Enter account username"
                      className="w-full px-4 py-2.5 pl-9 backdrop-blur-sm bg-white/10 border border-[#242829] text-white rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Enter a public Telegram account username</p>
                </div>
                
                {/* Add Button */}
                <button
                  onClick={fetchAccountGifts}
                  disabled={isLoadingAccount || !accountUsername.trim()}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {isLoadingAccount ? 'Loading...' : 'Add Account Gifts'}
                </button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Sticker Drawer */}
      <Sheet open={isAddStickerDrawerOpen} onOpenChange={setIsAddStickerDrawerOpen}>
        <SheetContent 
          className="bg-[#1c1d1f] rounded-t-3xl p-0" 
          style={{ 
            height: '90vh', 
            maxHeight: '90vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <SheetTitle className="sr-only">Add Sticker</SheetTitle>
          
          <div className="p-6 pb-20">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">Add Sticker</h2>
            </div>
            
            <div className="space-y-6">
              {/* Collection Selection */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Select Collection</h3>
                {/* Search Bar */}
                <div className="relative mb-3">
                  <input
                    type="text"
                    value={stickerSearchTerm}
                    onChange={(e) => setStickerSearchTerm(e.target.value)}
                    placeholder="Search collections..."
                    className="w-full px-4 py-2.5 pl-10 backdrop-blur-sm bg-white/10 border border-[#242829] text-white rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
                  />
                  <svg 
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {stickerSearchTerm && (
                    <button
                      onClick={() => setStickerSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Collections List */}
                <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                  {stickerCollections.filter(collection => {
                    if (!stickerSearchTerm) return true;
                    return collection.name.toLowerCase().includes(stickerSearchTerm.toLowerCase());
                  }).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p className="text-sm">No results found</p>
                      <p className="text-xs mt-1">Try a different search term</p>
                    </div>
                  ) : (
                    stickerCollections
                      .filter(collection => {
                        if (!stickerSearchTerm) return true;
                        return collection.name.toLowerCase().includes(stickerSearchTerm.toLowerCase());
                      })
                      .map((collection, index) => (
                        <div
                          key={index}
                          className={`flex items-center p-3 rounded-xl bg-[#424242] hover:bg-[#4a4a4a] cursor-pointer transition-colors ${
                            collection.name === selectedCollection ? 'ring-2 ring-blue-500' : ''
                          }`}
                          onClick={() => selectCollection(collection.name)}
                        >
                          <div className="w-12 h-12 rounded-lg mr-3 flex items-center justify-center overflow-hidden">
                            <img
                              src={getStickerImageUrl(collection.name, collection.samplePack, collection.sampleFilename)}
                              alt={collection.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.parentElement) {
                                  const fallback = document.createElement('div');
                                  fallback.className = 'w-full h-full bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold';
                                  fallback.textContent = collection.name.charAt(0);
                                  e.currentTarget.parentElement.appendChild(fallback);
                                }
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-white">{collection.name}</div>
                          </div>
                          {collection.name === selectedCollection && (
                            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Sticker Pack Selection */}
              {selectedCollection && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Select Sticker Pack</h3>
                  {/* Search Bar */}
                  <div className="relative mb-3">
                    <input
                      type="text"
                      value={stickerPackSearchTerm}
                      onChange={(e) => setStickerPackSearchTerm(e.target.value)}
                      placeholder="Search sticker packs..."
                      className="w-full px-4 py-2.5 pl-10 backdrop-blur-sm bg-white/10 border border-[#242829] text-white rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
                    />
                    <svg 
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {stickerPackSearchTerm && (
                      <button
                        onClick={() => setStickerPackSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Sticker Packs List */}
                  <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                    {stickerPacks.filter(pack => {
                      if (!stickerPackSearchTerm) return true;
                      return pack.name.toLowerCase().includes(stickerPackSearchTerm.toLowerCase());
                    }).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="text-sm">No packs found</p>
                        <p className="text-xs mt-1">Try a different search term</p>
                      </div>
                    ) : (
                      stickerPacks
                        .filter(pack => {
                          if (!stickerPackSearchTerm) return true;
                          return pack.name.toLowerCase().includes(stickerPackSearchTerm.toLowerCase());
                        })
                        .map((pack, index) => (
                          <div
                            key={index}
                            className={`flex items-center p-3 rounded-xl bg-[#424242] hover:bg-[#4a4a4a] cursor-pointer transition-colors ${
                              selectedPack && pack.name === selectedPack.name ? 'ring-2 ring-blue-500' : ''
                            }`}
                            onClick={() => selectPack(pack)}
                          >
                            <div className="w-12 h-12 rounded-lg mr-3 flex items-center justify-center overflow-hidden">
                              <img
                                src={getStickerImageUrl(selectedCollection || '', pack.name, pack.filename)}
                                alt={pack.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.parentElement) {
                                    const fallback = document.createElement('div');
                                    fallback.className = 'w-full h-full bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold';
                                    fallback.textContent = pack.name.charAt(0);
                                    e.currentTarget.parentElement.appendChild(fallback);
                                  }
                                }}
                              />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-white">{pack.name}</div>
                            </div>
                            {selectedPack && pack.name === selectedPack.name && (
                              <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}

              {/* OK Button */}
              {selectedPack && (
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <button
                    onClick={handleSaveSticker}
                    className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all"
                  >
                    Add Sticker
                  </button>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Gift Detail Drawer - Single Scrollable Container */}
      <Sheet open={isGiftChartOpen} onOpenChange={setIsGiftChartOpen}>
        <SheetContent 
          className="bg-[#1c1d1f] rounded-t-3xl p-0" 
          style={{ 
            height: '90vh', 
            maxHeight: '90vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* Visually hidden title for accessibility */}
          <SheetTitle className="sr-only">{selectedGift?.title || 'Gift Details'}</SheetTitle>
          
          {selectedGift && (
            <div className="pb-20">

              {/* Gift Image */}
              <div className="relative w-full max-w-xs mx-auto mt-12 mb-4 px-4">
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 shadow-2xl">
                  {/* Background pattern */}
                  <div className="absolute inset-0 opacity-20 z-0">
                    <div className="absolute inset-0" style={{
                      backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px)`
                    }} />
                  </div>
                  
                  {/* Gift image with better cropping */}
                  {selectedGift.fragment_url ? (
                    <div className="absolute inset-3 flex items-center justify-center z-10">
                      <img
                        src={selectedGift.fragment_url}
                        alt={selectedGift.title}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          // Fallback to collection image if fragment_url fails
                          const collectionImageUrl = getCollectionImageUrl(selectedGift.title);
                          e.currentTarget.src = collectionImageUrl;
                        }}
                      />
                    </div>
                  ) : (
                    <div className="absolute inset-3 flex items-center justify-center z-10">
                      <img
                        src={getCollectionImageUrl(selectedGift.title)}
                        alt={selectedGift.title}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Gift Name and Number */}
              <div className="text-center px-4 mb-6">
                <h2 className="text-xl font-semibold text-white mb-1">{selectedGift.title}</h2>
                <p className="text-gray-400 text-sm">
                  Collectible #{selectedGift.num?.toLocaleString() || 'N/A'}
                </p>
              </div>

              {/* Attributes Section - Continuous with image section */}
              <div className="px-4 pt-6 pb-8">
                <div className="space-y-4">
                  {/* Owner */}
                  {selectedGift.owner_username && (
                  <div className="flex items-center justify-between py-3 border-b border-gray-800">
                    <span className="text-white text-sm">Owner</span>
                      <a
                        href={`https://t.me/${selectedGift.owner_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          hapticFeedback('selection');
                        }}
                      >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500"></div>
                        <span className="text-white text-sm font-medium">{selectedGift.owner_name || selectedGift.owner_username}</span>
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      </a>
                    </div>
                  )}

                  {/* Model */}
                  {selectedGift.model_name && (
                    <div className="flex items-center justify-between py-3 border-b border-gray-800">
                      <span className="text-white text-sm">Model</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">{selectedGift.model_name}</span>
                        {selectedGift.model_rarity !== null && selectedGift.model_rarity !== undefined && (
                          <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                            {selectedGift.model_rarity.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Symbol/Pattern */}
                  {selectedGift.pattern_name && (
                    <div className="flex items-center justify-between py-3 border-b border-gray-800">
                      <span className="text-white text-sm">Symbol</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">{selectedGift.pattern_name}</span>
                        {selectedGift.pattern_rarity !== null && selectedGift.pattern_rarity !== undefined && (
                          <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                            {selectedGift.pattern_rarity.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Backdrop */}
                  {selectedGift.backdrop_name && (
                    <div className="flex items-center justify-between py-3 border-b border-gray-800">
                      <span className="text-white text-sm">Backdrop</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">{selectedGift.backdrop_name}</span>
                        {selectedGift.backdrop_rarity !== null && selectedGift.backdrop_rarity !== undefined && (
                          <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                            {selectedGift.backdrop_rarity.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Quantity */}
                  {(selectedGift.availability_issued !== null || selectedGift.availability_total !== null) && (
                    <div className="flex items-center justify-between py-3 border-b border-gray-800">
                      <span className="text-white text-sm">Quantity</span>
                      <span className="text-white text-sm font-medium">
                        {selectedGift.availability_issued?.toLocaleString() || 'N/A'}/
                        {selectedGift.availability_total?.toLocaleString() || 'N/A'} issued
                      </span>
                    </div>
                  )}

                  {/* Price (if available) */}
                  {selectedGift.price !== null && selectedGift.price !== undefined && (
                    <div className="flex items-center justify-between py-3 border-b border-gray-800">
                      <span className="text-white text-sm">Est. Price</span>
                      <div className="flex items-center gap-1">
                        <img src={getCurrencyDisplay().icon} alt={getCurrencyDisplay().label} className="w-4 h-4" />
                        <span className="text-white text-sm font-medium">{formatPrice(selectedGift.price)} {getCurrencyDisplay().label}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Gift Chart Section */}
              {selectedGift && (
                <div className="px-4 pt-6 pb-4">
                  {/* Chart Type Toggle */}
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {(['24h', '3d', '1w', '1m', '3m'] as const).map((type) => (
                    <button
                        key={type}
                      onClick={() => {
                          setChartType(type);
                          loadChartData(selectedGift.title, type);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          chartType === type
                            ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white shadow-lg shadow-pink-500/50'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                      }`}
                    >
                        {type.toUpperCase()}
                    </button>
                    ))}
                  </div>
                  
                  {/* Chart Canvas */}
                  <div className="w-full rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 border border-gray-700/50 shadow-2xl" style={{ minHeight: '400px' }}>
                    {chartLoading ? (
                      <div className="text-center py-16 text-gray-400 flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
                        <span>Loading chart data...</span>
                      </div>
                    ) : chartData.length > 0 ? (
                      <div className="w-full" style={{ height: '400px', minHeight: '400px' }}>
                      <canvas
                        ref={chartCanvasRef}
                          className="w-full h-full"
                          style={{ display: 'block' }}
                      />
                      </div>
                    ) : (
                      <div className="text-center py-16 text-gray-500">
                        <p className="text-lg mb-2">Chart not available</p>
                        <p className="text-sm text-gray-600">No price data found for this period</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Channel Gift Breakdown Drawer */}
      <Sheet open={isChannelGiftDrawerOpen} onOpenChange={setIsChannelGiftDrawerOpen}>
        <SheetContent className="h-[80vh] bg-[#1a1b1e] border-t border-gray-800 overflow-y-auto">
          <SheetTitle className="sr-only">Channel Gifts Breakdown</SheetTitle>
          <div className="p-6 pb-20">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">{selectedChannelGift?.channel_username && `@${selectedChannelGift.channel_username}`}</h2>
              <p className="text-sm text-gray-400 mt-1">Channel Gifts Breakdown</p>
            </div>

            {selectedChannelGift && (
              <div className="space-y-4">
                {/* Total Summary */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-[#242829]">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Total Gifts</span>
                    <span className="text-white font-bold text-xl">{selectedChannelGift.total_gifts}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-purple-800">
                    <span className="text-gray-300 text-sm">Total Value</span>
                    <div className="flex items-center gap-1">
                      <img src={getCurrencyDisplay().icon} alt={getCurrencyDisplay().label} className="w-4 h-4" />
                      <span className="text-white font-bold text-lg">{formatPrice(selectedChannelGift.total_value)}</span>
                    </div>
                  </div>
                </div>

                {/* Individual Gift Items */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white mb-3">Gift Receipt</h3>
                  {selectedChannelGift.gifts_breakdown?.map((gift: any, index: number) => {
                    const unitPrice = gift.price_per_unit || gift.price || 0;
                    const totalPrice = gift.total_value || (gift.count || 0) * unitPrice;
                    return (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-4 rounded-xl bg-[#424242] hover:bg-[#4a4a4a] transition-colors border border-gray-700"
                    >
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-800/50 flex-shrink-0 border border-gray-600">
                        {getGiftImageUrl(gift) && (
                          <img 
                            src={getGiftImageUrl(gift) || ''} 
                            alt={gift.name || 'Gift'} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                        <div className="text-white font-semibold text-sm break-words">{gift.name || 'Unknown Gift'}</div>
                        <div className="text-xs space-y-0.5">
                          {/* Show buy price for unupgradeable gifts if available */}
                          {gift.id && (() => {
                            const buyPriceStars = getBuyPriceInStars(gift.id.toString());
                            if (buyPriceStars && typeof buyPriceStars === 'number') {
                              return (
                                <div className="text-blue-300 text-xs break-words">
                                  Buy: {buyPriceStars} ⭐ = ${starsToUsd(buyPriceStars).toFixed(2)}
                                </div>
                              );
                            }
                            return null;
                          })()}
                          {/* Show sale price if available */}
                          {unitPrice > 0 && (
                            <div className="text-green-300 text-xs break-words">
                              Sale: {formatPrice(unitPrice)} {getCurrencyDisplay().label} each
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 flex flex-col items-end justify-center gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-xs">x{gift.count || 0}</span>
                          <span className="text-gray-400 text-xs">=</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <img src={getCurrencyDisplay().icon} alt={getCurrencyDisplay().label} className="w-4 h-4" />
                          <span className="text-green-400 font-bold text-base whitespace-nowrap">
                            {formatPrice(totalPrice)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                  })}
                  {(!selectedChannelGift.gifts_breakdown || selectedChannelGift.gifts_breakdown.length === 0) && (
                    <div className="text-center py-8 text-gray-400">
                      <p>No gifts found</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Filter Drawer */}
      <Sheet open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
        <SheetContent 
          className="bg-[#1c1d1f] rounded-t-3xl p-0" 
          style={{ 
            height: '90vh', 
            maxHeight: '90vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <SheetTitle className="sr-only">Filters</SheetTitle>
          
          <div className="p-6 pb-24">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">Filters</h2>
            </div>
            
            {/* Filter Content */}
            <div className="space-y-2">
              {/* Status Filter - Collapsible */}
              <div className="bg-[#2a2a2a] rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedSections({ ...expandedSections, status: !expandedSections.status })}
                  className="w-full flex items-center justify-between p-4 text-white hover:bg-[#333333] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#424242] flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white">
                        <path fillRule="evenodd" clipRule="evenodd" d="M3.46447 20.5355C4.92893 22 7.28595 22 12 22C16.714 22 19.0711 22 20.5355 20.5355C22 19.0711 22 16.714 22 12C22 7.28595 22 4.92893 20.5355 3.46447C19.0711 2 16.714 2 12 2C7.28595 2 4.92893 2 3.46447 3.46447C2 4.92893 2 7.28595 2 12C2 16.714 2 19.0711 3.46447 20.5355ZM8 7C7.44772 7 7 7.44772 7 8V10C7 10.5523 7.44772 11 8 11H10C10.5523 11 11 10.5523 11 10V8C11 7.44772 10.5523 7 10 7H8ZM14 7C13.4477 7 13 7.44772 13 8V10C13 10.5523 13.4477 11 14 11H16C16.5523 11 17 10.5523 17 10V8C17 7.44772 16.5523 7 16 7H14ZM7 14C7 13.4477 7.44772 13 8 13H10C10.5523 13 11 13.4477 11 14V16C11 16.5523 10.5523 17 10 17H8C7.44772 17 7 16.5523 7 16V14ZM13 14C13 13.4477 13.4477 13 14 13H16C16.5523 13 17 13.4477 17 14V16C17 16.5523 16.5523 17 16 17H14C13.4477 17 13 16.5523 13 16V14Z" fill="currentColor"/>
                      </svg>
                    </div>
                    <span className="font-semibold text-lg">Status</span>
                  </div>
                  {expandedSections.status ? (
                    <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                {expandedSections.status && (
                  <div className="px-4 pb-4 space-y-2">
                    {['upgraded', 'unupgraded', 'channels'].map((status) => {
                      const isSelected = filters.status?.includes(status) || false;
                      return (
                        <label key={status} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#333333] cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const current = filters.status || [];
                                if (e.target.checked) {
                                  setFilters({ ...filters, status: [...current, status] });
                                } else {
                                  setFilters({ ...filters, status: current.filter(s => s !== status) });
                                }
                              }}
                              className="w-5 h-5 rounded-lg border-2 border-gray-500 bg-transparent checked:bg-blue-600 checked:border-blue-600 appearance-none cursor-pointer transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                            />
                            {isSelected && (
                              <svg className="absolute top-0 left-0 w-5 h-5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            )}
                          </div>
                          <span className="text-white flex-1 capitalize">{status}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>


              {/* Background Filter - Collapsible */}
              <div className="bg-[#2a2a2a] rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedSections({ ...expandedSections, background: !expandedSections.background })}
                  className="w-full flex items-center justify-between p-4 text-white hover:bg-[#333333] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#424242] flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white">
                        <path d="M3.46447 20.5355C4.92893 22 7.28595 22 12 22C16.714 22 19.0711 22 20.5355 20.5355C22 19.0711 22 16.714 22 12C22 7.28595 22 4.92893 20.5355 3.46447C19.0711 2 16.714 2 12 2C7.28595 2 4.92893 2 3.46447 3.46447C2 4.92893 2 7.28595 2 12C2 16.714 2 19.0711 3.46447 20.5355ZM8 7C7.44772 7 7 7.44772 7 8V10C7 10.5523 7.44772 11 8 11H10C10.5523 11 11 10.5523 11 10V8C11 7.44772 10.5523 7 10 7H8ZM14 7C13.4477 7 13 7.44772 13 8V10C13 10.5523 13.4477 11 14 11H16C16.5523 11 17 10.5523 17 10V8C17 7.44772 16.5523 7 16 7H14ZM7 14C7 13.4477 7.44772 13 8 13H10C10.5523 13 11 13.4477 11 14V16C11 16.5523 10.5523 17 10 17H8C7.44772 17 7 16.5523 7 16V14ZM13 14C13 13.4477 13.4477 13 14 13H16C16.5523 13 17 13.4477 17 14V16C17 16.5523 16.5523 17 16 17H14C13.4477 17 13 16.5523 13 16V14Z" fill="currentColor"/>
                      </svg>
                    </div>
                    <span className="font-semibold text-lg">Background</span>
                  </div>
                  {expandedSections.background ? (
                    <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                {expandedSections.background && (
                  <div className="px-4 pb-4 space-y-2 max-h-64 overflow-y-auto">
                    {Array.from(new Set(gifts.map(g => g.backdrop_name).filter(Boolean))).sort().map((bg) => {
                      const isSelected = filters.backgrounds?.includes(bg || '') || false;
                      return (
                        <label key={bg} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#333333] cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const current = filters.backgrounds || [];
                                if (e.target.checked) {
                                  setFilters({ ...filters, backgrounds: [...current, bg || ''] });
                                } else {
                                  setFilters({ ...filters, backgrounds: current.filter(b => b !== bg) });
                                }
                              }}
                              className="w-5 h-5 rounded-lg border-2 border-gray-500 bg-transparent checked:bg-blue-600 checked:border-blue-600 appearance-none cursor-pointer transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                            />
                            {isSelected && (
                              <svg className="absolute top-0 left-0 w-5 h-5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            )}
                          </div>
                          <span className="text-white flex-1">{bg}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Model Filter - Collapsible */}
              <div className="bg-[#2a2a2a] rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedSections({ ...expandedSections, model: !expandedSections.model })}
                  className="w-full flex items-center justify-between p-4 text-white hover:bg-[#333333] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#424242] flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white">
                        <path fillRule="evenodd" clipRule="evenodd" d="M3.46447 20.5355C4.92893 22 7.28595 22 12 22C16.714 22 19.0711 22 20.5355 20.5355C22 19.0711 22 16.714 22 12C22 7.28595 22 4.92893 20.5355 3.46447C19.0711 2 16.714 2 12 2C7.28595 2 4.92893 2 3.46447 3.46447C2 4.92893 2 7.28595 2 12C2 16.714 2 19.0711 3.46447 20.5355ZM18.75 16C18.75 16.4142 18.4142 16.75 18 16.75H6C5.58579 16.75 5.25 16.4142 5.25 16C5.25 15.5858 5.58579 15.25 6 15.25H18C18.4142 15.25 18.75 15.5858 18.75 16ZM18 12.75C18.4142 12.75 18.75 12.4142 18.75 12C18.75 11.5858 18.4142 11.25 18 11.25H6C5.58579 11.25 5.25 11.5858 5.25 12C5.25 12.4142 5.58579 12.75 6 12.75H18ZM18.75 8C18.75 8.41421 18.4142 8.75 18 8.75H6C5.58579 8.75 5.25 8.41421 5.25 8C5.25 7.58579 5.58579 7.25 6 7.25H18C18.4142 7.25 18.75 7.58579 18.75 8Z" fill="currentColor"/>
                      </svg>
                    </div>
                    <span className="font-semibold text-lg">Model</span>
                  </div>
                  {expandedSections.model ? (
                    <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                {expandedSections.model && (
                  <div className="px-4 pb-4 space-y-2 max-h-64 overflow-y-auto">
                    {Array.from(new Set(gifts.map(g => g.model_name).filter(Boolean))).sort().map((model) => {
                      const isSelected = filters.models?.includes(model || '') || false;
                      return (
                        <label key={model} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#333333] cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const current = filters.models || [];
                                if (e.target.checked) {
                                  setFilters({ ...filters, models: [...current, model || ''] });
                                } else {
                                  setFilters({ ...filters, models: current.filter(m => m !== model) });
                                }
                              }}
                              className="w-5 h-5 rounded-lg border-2 border-gray-500 bg-transparent checked:bg-blue-600 checked:border-blue-600 appearance-none cursor-pointer transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                            />
                            {isSelected && (
                              <svg className="absolute top-0 left-0 w-5 h-5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            )}
                          </div>
                          <span className="text-white flex-1">{model}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Collection Filter - Collapsible */}
              <div className="bg-[#2a2a2a] rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedSections({ ...expandedSections, collection: !expandedSections.collection })}
                  className="w-full flex items-center justify-between p-4 text-white hover:bg-[#333333] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#424242] flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white">
                        <path d="M11.2498 2C7.03145 2.00411 4.84888 2.07958 3.46423 3.46423C2.07958 4.84888 2.00411 7.03145 2 11.2498H6.91352C6.56255 10.8114 6.30031 10.2943 6.15731 9.72228C5.61906 7.56926 7.56926 5.61906 9.72228 6.15731C10.2943 6.30031 10.8114 6.56255 11.2498 6.91352V2Z" fill="currentColor"/>
                        <path d="M2 12.7498C2.00411 16.9681 2.07958 19.1506 3.46423 20.5353C4.84888 21.9199 7.03145 21.9954 11.2498 21.9995V14.1234C10.4701 15.6807 8.8598 16.7498 6.99976 16.7498C6.58555 16.7498 6.24976 16.414 6.24976 15.9998C6.24976 15.5856 6.58555 15.2498 6.99976 15.2498C8.53655 15.2498 9.82422 14.1831 10.1628 12.7498H2Z" fill="currentColor"/>
                        <path d="M12.7498 21.9995C16.9681 21.9954 19.1506 21.9199 20.5353 20.5353C21.9199 19.1506 21.9954 16.9681 21.9995 12.7498H13.8367C14.1753 14.1831 15.463 15.2498 16.9998 15.2498C17.414 15.2498 17.7498 15.5856 17.7498 15.9998C17.7498 16.414 17.414 16.7498 16.9998 16.7498C15.1397 16.7498 13.5294 15.6807 12.7498 14.1234V21.9995Z" fill="currentColor"/>
                        <path d="M21.9995 11.2498C21.9954 7.03145 21.9199 4.84888 20.5353 3.46423C19.1506 2.07958 16.9681 2.00411 12.7498 2V6.91352C13.1882 6.56255 13.7053 6.30031 14.2772 6.15731C16.4303 5.61906 18.3805 7.56926 17.8422 9.72228C17.6992 10.2943 17.437 10.8114 17.086 11.2498H21.9995Z" fill="currentColor"/>
                        <path d="M9.35847 7.61252C10.47 7.8904 11.2498 8.88911 11.2498 10.0348V11.2498H10.0348C8.88911 11.2498 7.8904 10.47 7.61252 9.35847C7.34891 8.30403 8.30403 7.34891 9.35847 7.61252Z" fill="currentColor"/>
                        <path d="M12.7498 10.0348V11.2498H13.9647C15.1104 11.2498 16.1091 10.47 16.387 9.35847C16.6506 8.30403 15.6955 7.34891 14.6411 7.61252C13.5295 7.8904 12.7498 8.88911 12.7498 10.0348Z" fill="currentColor"/>
                      </svg>
                    </div>
                    <span className="font-semibold text-lg">Collection</span>
                  </div>
                  {expandedSections.collection ? (
                    <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                {expandedSections.collection && (
                  <div className="px-4 pb-4 space-y-2 max-h-64 overflow-y-auto">
                    {Array.from(new Set(gifts.map(g => g.title).filter(Boolean))).sort().map((collection) => {
                      const isSelected = filters.collections?.includes(collection || '') || false;
                      return (
                        <label key={collection} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#333333] cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const current = filters.collections || [];
                                if (e.target.checked) {
                                  setFilters({ ...filters, collections: [...current, collection || ''] });
                                } else {
                                  setFilters({ ...filters, collections: current.filter(c => c !== collection) });
                                }
                              }}
                              className="w-5 h-5 rounded-lg border-2 border-gray-500 bg-transparent checked:bg-blue-600 checked:border-blue-600 appearance-none cursor-pointer transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                            />
                            {isSelected && (
                              <svg className="absolute top-0 left-0 w-5 h-5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            )}
                          </div>
                          <span className="text-white flex-1">{collection}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Price Range Filter - Collapsible */}
              <div className="bg-[#2a2a2a] rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedSections({ ...expandedSections, price: !expandedSections.price })}
                  className="w-full flex items-center justify-between p-4 text-white hover:bg-[#333333] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#424242] flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white">
                        <path fillRule="evenodd" clipRule="evenodd" d="M20.4105 9.86058C20.3559 9.8571 20.2964 9.85712 20.2348 9.85715L20.2194 9.85715H17.8015C15.8086 9.85715 14.1033 11.4382 14.1033 13.5C14.1033 15.5618 15.8086 17.1429 17.8015 17.1429H20.2194L20.2348 17.1429C20.2964 17.1429 20.3559 17.1429 20.4105 17.1394C21.22 17.0879 21.9359 16.4495 21.9961 15.5577C22.0001 15.4992 22 15.4362 22 15.3778L22 15.3619V11.6381L22 11.6222C22 11.5638 22.0001 11.5008 21.9961 11.4423C21.9359 10.5506 21.22 9.91209 20.4105 9.86058ZM17.5872 14.4714C18.1002 14.4714 18.5162 14.0365 18.5162 13.5C18.5162 12.9635 18.1002 12.5286 17.5872 12.5286C17.0741 12.5286 16.6581 12.9635 16.6581 13.5C16.6581 14.0365 17.0741 14.4714 17.5872 14.4714Z" fill="currentColor"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M20.2341 18.6C20.3778 18.5963 20.4866 18.7304 20.4476 18.8699C20.2541 19.562 19.947 20.1518 19.4542 20.6485C18.7329 21.3755 17.8183 21.6981 16.6882 21.8512C15.5902 22 14.1872 22 12.4158 22H10.3794C8.60803 22 7.20501 22 6.10697 21.8512C4.97692 21.6981 4.06227 21.3755 3.34096 20.6485C2.61964 19.9215 2.29953 18.9997 2.1476 17.8608C1.99997 16.7541 1.99999 15.3401 2 13.5548V13.4452C1.99998 11.6599 1.99997 10.2459 2.1476 9.13924C2.29953 8.00031 2.61964 7.07848 3.34096 6.35149C4.06227 5.62451 4.97692 5.30188 6.10697 5.14876C7.205 4.99997 8.60802 4.99999 10.3794 5L12.4158 5C14.1872 4.99998 15.5902 4.99997 16.6882 5.14876C17.8183 5.30188 18.7329 5.62451 19.4542 6.35149C19.947 6.84817 20.2541 7.43804 20.4476 8.13012C20.4866 8.26959 20.3778 8.40376 20.2341 8.4L17.8015 8.40001C15.0673 8.40001 12.6575 10.5769 12.6575 13.5C12.6575 16.4231 15.0673 18.6 17.8015 18.6L20.2341 18.6ZM5.61446 8.88572C5.21522 8.88572 4.89157 9.21191 4.89157 9.61429C4.89157 10.0167 5.21522 10.3429 5.61446 10.3429H9.46988C9.86912 10.3429 10.1928 10.0167 10.1928 9.61429C10.1928 9.21191 9.86912 8.88572 9.46988 8.88572H5.61446Z" fill="currentColor"/>
                        <path d="M7.77668 4.02439L9.73549 2.58126C10.7874 1.80625 12.2126 1.80625 13.2645 2.58126L15.2336 4.03197C14.4103 3.99995 13.4909 3.99998 12.4829 4H10.3123C9.39123 3.99998 8.5441 3.99996 7.77668 4.02439Z" fill="currentColor"/>
                      </svg>
                    </div>
                    <span className="font-semibold text-lg">Price Range</span>
                  </div>
                  {expandedSections.price ? (
                    <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                {expandedSections.price && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-gray-400 text-sm mb-1 block">Min</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={filters.priceMin || ''}
                          onChange={(e) => setFilters({ ...filters, priceMin: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-full py-2.5 px-3 rounded-lg bg-[#424242] text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base placeholder-gray-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-gray-400 text-sm mb-1 block">Max</label>
                        <input
                          type="number"
                          placeholder="100000"
                          value={filters.priceMax || ''}
                          onChange={(e) => setFilters({ ...filters, priceMax: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-full py-2.5 px-3 rounded-lg bg-[#424242] text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base placeholder-gray-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fixed Bottom Action Buttons */}
          <div className="fixed bottom-0 left-0 right-0 bg-[#1c1d1f] border-t border-gray-700 p-4 z-10 safe-area-bottom">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setFilters({});
                  setExpandedSections({
                    status: false,
                    collection: false,
                    model: false,
                    background: false,
                    price: false,
                  });
                  setIsFilterDrawerOpen(false);
                }}
                className="flex-1 py-3 px-4 rounded-xl font-semibold bg-[#424242] text-white hover:bg-[#4a4a4a] transition-colors text-base"
              >
                Clear All
              </button>
              <button
                onClick={() => {
                  setIsFilterDrawerOpen(false);
                  hapticFeedback('impact', 'light', webApp || undefined);
                }}
                className="flex-1 py-3 px-4 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors text-base shadow-lg shadow-blue-600/30"
              >
                OK
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Custom Confirmation Dialog for Desktop */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 animate-fade-in">
          <div className="bg-[#1c1d1f] rounded-2xl p-6 w-[90%] max-w-md relative animate-slide-up border border-gray-700">
            {/* Close Button */}
            <button
              onClick={confirmDialog.onCancel}
              className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            
            {/* Content */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white pr-8">{confirmDialog.message}</h2>
              
              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={confirmDialog.onCancel}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold bg-[#424242] text-white hover:bg-[#4a4a4a] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
