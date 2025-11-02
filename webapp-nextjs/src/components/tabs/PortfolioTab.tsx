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
import { PaperAirplaneIcon, StarIcon, Cog6ToothIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });
const ModelThumbnail = dynamic(() => import('@/components/ModelThumbnail').then(mod => ({ default: mod.ModelThumbnail })), { ssr: false });

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
  is_custom?: boolean; // Flag to distinguish custom vs auto gifts
  gift_id?: number; // Database ID for custom gifts
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
  sticker_ids: string[];
  sticker_count: number;
  init_price_usd?: number;
  current_price_usd?: number;
  collection_id?: number;
  sticker_preview_url?: string;
  sticker_thumbnail_url?: string;
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
  const [selectedGiftName, setSelectedGiftName] = useState<string | null>(null);
  const [filterSearchTerm, setFilterSearchTerm] = useState('');
  const [ribbonNumber, setRibbonNumber] = useState<string>('');

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
        // Try to fetch from CoinGecko (free tier)
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd');
        if (response.ok) {
          const data = await response.json();
          if (data['the-open-network']?.usd) {
            const rate = data['the-open-network'].usd;
            setTonToUsdRate(rate);
            localStorage.setItem('ton_to_usd_rate', rate.toString());
            console.log('✅ Fetched TON price:', rate);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to fetch TON price from CoinGecko:', error);
      }
      
      // Fallback: use a cached rate or default
      const cachedRate = localStorage.getItem('ton_to_usd_rate');
      if (cachedRate) {
        setTonToUsdRate(parseFloat(cachedRate));
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
        const response = await fetch('/api/collection/gifts');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setAllGifts(data.gifts || []);
          }
        }
      } catch (error) {
        console.error('Failed to load gifts:', error);
      }
    };
    
    loadAllGifts();
  }, []);

  // Helper function to format price based on currency preference
  const formatPrice = (priceInTon: number | null | undefined): string => {
    if (priceInTon === null || priceInTon === undefined) {
      return 'N/A';
    }
    
    if (currency === 'USD') {
      return (priceInTon * tonToUsdRate).toFixed(2);
    }
    
    return priceInTon.toFixed(2);
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

  // Refresh prices for custom gifts that have null prices (only once)
  useEffect(() => {
    const fetchMissingPrices = async () => {
      const customGiftsWithoutPrice = gifts.filter(g => {
        const key = `${g.slug}-${g.num}`;
        return g.is_custom && (g.price === null || g.price === undefined) && !pricesFetchedRef.current.has(key);
      });
      
      if (customGiftsWithoutPrice.length > 0) {
        console.log('💰 Fetching prices for', customGiftsWithoutPrice.length, 'custom gifts without prices');
        
        for (const gift of customGiftsWithoutPrice) {
          const key = `${gift.slug}-${gift.num}`;
          pricesFetchedRef.current.add(key);
          
          try {
            const priceResult = await getGiftPrice(gift.title, gift.backdrop_name || null, gift.model_name || null);
            
            if (priceResult.price !== null) {
              // Update the gift with the price
              setGifts(prev => prev.map(g => {
                if (g.slug === gift.slug && g.num === gift.num && g.is_custom) {
                  return { ...g, price: priceResult.price };
                }
                return g;
              }));
              console.log('✅ Updated price for', gift.title, ':', priceResult.price);
            } else if (priceResult.error) {
              console.warn('⚠️ Price fetch failed for', gift.title, ':', priceResult.error);
            }
          } catch (error) {
            console.error('Error fetching price for', gift.title, ':', error);
          }
        }
      }
    };

    // Only run if we have custom gifts without prices
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
    
    // Load both auto and custom gifts in parallel
    const [autoGiftsResponse, customGiftsResponse] = await Promise.all([
      loadAutoGifts(),
      loadCustomGiftsFromDBAPI()
    ]);
    
    // Merge results
    const allGifts = [...(autoGiftsResponse?.gifts || []), ...(customGiftsResponse?.gifts || [])];
    const totalValue = (autoGiftsResponse?.totalValue || 0) + (customGiftsResponse?.totalValue || 0);
    
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
          setStickers(data.stickers || []);
          setStickerPortfolio(data);
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
    const confirmed = webApp?.showConfirm?.('Are you sure you want to remove this gift from your portfolio?');
    
    if (!confirmed && !window.confirm('Are you sure you want to remove this gift from your portfolio?')) {
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
    
    // Refresh prices for all gifts (both auto and custom)
    console.log('💰 Refreshing prices for all gifts...');
    const pricePromises = loadedGifts.map(async (gift) => {
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
          console.log('✅ Updated price for', gift.title, ':', priceResult.price);
        }
      } catch (error) {
        console.error('Error refreshing price for', gift.title, ':', error);
      }
    });
    
    // Don't await - let it run in background
    Promise.all(pricePromises).then(() => {
      console.log('✅ All prices refreshed');
    });
    
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
    setFilterSearchTerm('');
    setRibbonNumber('');
    setIsAddGiftDrawerOpen(true);
    hapticFeedback('selection');
  };

  const closeAddGiftDrawer = () => {
    setIsAddGiftDrawerOpen(false);
    setSelectedGiftName(null);
    setFilterSearchTerm('');
  };

  const selectGiftName = (giftName: string) => {
    setSelectedGiftName(giftName);
    setFilterSearchTerm('');
    hapticFeedback('impact');
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
          console.log('✅ Got metadata:', { modelName, backdropName, patternName });
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
      <div className="flex justify-start px-4">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('gifts')}
            className={`text-lg font-medium transition-all duration-200 ease-in-out capitalize ${
              activeTab === 'gifts'
                ? 'text-white border-b-2 border-white pb-1 scale-105'
                : 'text-gray-400 hover:text-gray-300 hover:scale-105'
            }`}
          >
            Gifts
          </button>
          <button
            onClick={() => setActiveTab('stickers')}
            className={`text-lg font-medium transition-all duration-200 ease-in-out capitalize ${
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
                <PaperAirplaneIcon className="w-4 h-4" />
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
          <div className="mx-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">Total gifts {gifts.length}</h3>
              <button
                onClick={openAddGiftDrawer}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                title="Add gift"
              >
                <PlusIcon className="w-5 h-5 text-blue-400" />
              </button>
            </div>
            <button className="text-sm text-blue-500 hover:text-blue-400 transition-colors">
              Clear filters
            </button>
          </div>


          {/* Gifts Grid */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 mt-4">Loading portfolio...</p>
            </div>
          ) : gifts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No gifts found in your profile</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 px-4 pb-4 relative z-0">
              {gifts.map((gift, index) => {
                console.log('🎁 Rendering gift:', { index, gift: { title: gift.title, slug: gift.slug, num: gift.num } });
                return (
                <div
                  key={`${gift.slug || 'gift'}-${gift.num || index}-${index}`}
                  onClick={() => handleGiftClick(gift)}
                  className="rounded-2xl p-3 cursor-pointer hover:scale-105 transition-transform relative z-0 overflow-hidden group backdrop-blur-xl bg-[#1c1d1f]/40 border border-[#242829] shadow-lg shadow-black/20"
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
                        {index + 1} of {gifts.length}
                      </div>
                    </div>
                  </div>

                  {/* Gift Info */}
                  <div className="relative z-10 space-y-1" style={{ position: 'relative' }}>
                    <h4 className="font-bold text-white text-sm truncate" style={{ position: 'relative', zIndex: 10 }}>{gift.title}</h4>
                    <p className="text-xs text-blue-200" style={{ position: 'relative', zIndex: 10 }}>#{gift.num} 1%</p>
                    
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
                          hapticFeedback('impact', 'light', webApp || undefined);
                        }}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-all backdrop-blur-sm"
                      >
                        <PaperAirplaneIcon className="w-4 h-4 text-white/80" />
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
        <div className="text-center py-16 px-4">
          <div className="mx-auto max-w-md">
            <div className="w-48 h-48 mx-auto mb-4 flex items-center justify-center">
              {duckLottieData ? (
                <Lottie
                  animationData={duckLottieData}
                  loop={true}
                  autoplay={true}
                  style={{ width: 192, height: 192 }}
                />
              ) : (
                <div className="animate-bounce text-6xl">🎨</div>
              )}
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Coming Soon</h3>
            <p className="text-gray-400 text-lg mb-6">
              Sticker portfolio tracking is on its way!
            </p>
            <div className="rounded-2xl p-6 backdrop-blur-xl bg-[#1c1d1f]/40 border border-gray-700/50">
              <p className="text-gray-300 text-sm">
                Track your sticker collection, view prices, and manage your portfolio all in one place.
              </p>
            </div>
          </div>
        </div>
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
              {/* Close Button */}
              <div className="absolute top-4 right-4 z-30">
                <button
                  onClick={() => setIsStickerDrawerOpen(false)}
                  className="text-white/70 hover:text-white p-2 bg-black/30 rounded-full backdrop-blur-sm"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </button>
              </div>

              {/* Sticker Image */}
              {selectedSticker.sticker_preview_url && (
                <div className="relative w-full max-w-xs mx-auto mt-12 mb-4 px-4">
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 shadow-2xl">
                    <img
                      src={selectedSticker.sticker_preview_url}
                      alt={selectedSticker.collection}
                      className="absolute inset-0 w-full h-full object-contain p-4"
                      onError={(e) => {
                        // Hide image if it fails to load
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Sticker Header */}
              <div className="text-center px-4 pt-4 pb-6">
                <h2 className="text-2xl font-bold text-white mb-2">{selectedSticker.collection}</h2>
                <p className="text-gray-400 text-lg">{selectedSticker.character}</p>
              </div>

              {/* Sticker Details Section */}
              <div className="px-4 pt-6 pb-8">
                <div className="space-y-4">
                  {/* Token ID */}
                  <div className="flex items-center justify-between py-3 border-b border-gray-800">
                    <span className="text-white text-sm">Token ID</span>
                    <span className="text-white text-sm font-medium">#{selectedSticker.token_id}</span>
                  </div>

                  {/* Character */}
                  <div className="flex items-center justify-between py-3 border-b border-gray-800">
                    <span className="text-white text-sm">Character</span>
                    <span className="text-white text-sm font-medium">{selectedSticker.character}</span>
                  </div>

                  {/* Sticker Count */}
                  <div className="flex items-center justify-between py-3 border-b border-gray-800">
                    <span className="text-white text-sm">Stickers</span>
                    <span className="text-white text-sm font-medium">{selectedSticker.sticker_count}</span>
                  </div>

                  {/* Sticker IDs */}
                  {selectedSticker.sticker_ids && selectedSticker.sticker_ids.length > 0 && (
                    <div className="py-3 border-b border-gray-800">
                      <span className="text-white text-sm block mb-2">Sticker IDs</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedSticker.sticker_ids.map((id, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded">
                            {id}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Initial Price */}
                  {selectedSticker.init_price_usd !== undefined && selectedSticker.init_price_usd > 0 && (
                    <div className="flex items-center justify-between py-3 border-b border-gray-800">
                      <span className="text-white text-sm">Initial Price</span>
                      <div className="flex items-center gap-1">
                        <span className="text-white text-sm font-medium">
                          ${selectedSticker.init_price_usd.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Current Price */}
                  {selectedSticker.current_price_usd !== undefined && selectedSticker.current_price_usd > 0 && (
                    <div className="flex items-center justify-between py-3 border-b border-gray-800">
                      <span className="text-white text-sm">Current Price</span>
                      <div className="flex items-center gap-1">
                        <img src="/icons/dollar.svg" alt="USD" className="w-4 h-4" />
                        <span className="text-white text-sm font-medium">
                          ${selectedSticker.current_price_usd.toFixed(2)}
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
                          ${(selectedSticker.current_price_usd - selectedSticker.init_price_usd).toFixed(2)}
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

                  {/* Collection Info */}
                  <div className="flex items-center justify-between py-3 border-b border-gray-800">
                    <span className="text-white text-sm">Collection</span>
                    <span className="text-white text-sm font-medium">{selectedSticker.collection}</span>
                  </div>
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Add Gift</h2>
              <button
                onClick={closeAddGiftDrawer}
                className="text-white/70 hover:text-white p-2 bg-black/30 rounded-full backdrop-blur-sm"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
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
                {allGifts.filter(gift => {
                  if (!filterSearchTerm) return true;
                  return gift.toLowerCase().includes(filterSearchTerm.toLowerCase());
                }).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-sm">No results found</p>
                    <p className="text-xs mt-1">Try a different search term</p>
                  </div>
                ) : (
                  allGifts
                    .filter(gift => {
                      if (!filterSearchTerm) return true;
                      return gift.toLowerCase().includes(filterSearchTerm.toLowerCase());
                    })
                    .map((gift, index) => (
                      <div
                        key={index}
                        className={`flex items-center p-3 rounded-xl bg-[#424242] hover:bg-[#4a4a4a] cursor-pointer transition-colors ${
                          gift === selectedGiftName ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => selectGiftName(gift)}
                      >
                        <div className="w-12 h-12 rounded-lg mr-3 flex items-center justify-center overflow-hidden bg-transparent">
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
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
                    ))
                )}
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
              {/* Menu Icon - Fixed position */}
              <div className="absolute top-4 right-4 z-30">
                <button
                  onClick={() => setIsGiftChartOpen(false)}
                  className="text-white/70 hover:text-white p-2 bg-black/30 rounded-full backdrop-blur-sm"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </button>
              </div>

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
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-4xl z-10">
                      ?
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
                  <div className="flex items-center justify-between py-3 border-b border-gray-800">
                    <span className="text-white text-sm">Owner</span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500"></div>
                      <span className="text-white text-sm font-medium">{user?.username || user?.first_name || 'Unknown'}</span>
                      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </div>
                  </div>

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
    </div>
  );
};
