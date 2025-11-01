'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet';
import { AdsBanner } from '@/components/AdsBanner';
import { useUser } from '@/store/useAppStore';
import { useTelegram } from '@/components/providers/TelegramProvider';
import { hapticFeedback } from '@/lib/telegram';
import { PaperAirplaneIcon, StarIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

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
}

interface PortfolioHistoryPoint {
  date: string;
  total_value: number;
  gifts_count: number;
}

export const PortfolioTab: React.FC = () => {
  const user = useUser();
  const { webApp } = useTelegram();
  const [activeTab, setActiveTab] = useState<'gifts' | 'stickers'>('gifts');
  const [gifts, setGifts] = useState<PortfolioGift[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Start as false, will be set to true when loading starts
  const [totalValue, setTotalValue] = useState(0);
  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioHistoryPoint[]>([]);
  const [isGiftChartOpen, setIsGiftChartOpen] = useState(false);
  const [selectedGift, setSelectedGift] = useState<PortfolioGift | null>(null);
  const [chartType, setChartType] = useState<'24h' | '3d' | '1w' | '1m' | '3m'>('1w');
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Portfolio chart state
  const [portfolioChartType, setPortfolioChartType] = useState<'24h' | '3d' | '1w' | '1m'>('1w');
  const [portfolioChartMode, setPortfolioChartMode] = useState<'gift' | 'model'>('gift');
  const [portfolioChartData, setPortfolioChartData] = useState<any[]>([]);
  const [portfolioChartLoading, setPortfolioChartLoading] = useState(false);
  const [showPortfolioSettings, setShowPortfolioSettings] = useState(false);
  const portfolioChartCanvasRef = useRef<HTMLCanvasElement>(null);


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

  const loadPortfolio = async () => {
    if (!user?.user_id) {
      console.warn('⚠️ loadPortfolio: No user_id, aborting');
      return;
    }

    console.log('📊 loadPortfolio: Starting for user', user.user_id);
    setIsLoading(true);
    try {
      // Get Telegram initData to send with request
      const webApp = (window as any).Telegram?.WebApp || (window as any).tg;
      const initData = webApp?.initData;
      
      console.log('📊 loadPortfolio: initData available:', !!initData, 'length:', initData?.length);
      
      const headers: Record<string, string> = {};
      if (initData) {
        headers['X-Telegram-Init-Data'] = initData;
      } else {
        console.error('❌ loadPortfolio: No initData available - API will fail authentication');
      }
      
      console.log('📊 loadPortfolio: Making API request to /api/portfolio/gifts');
      
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
        
        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError') {
            toast.error('Request timed out - please try again');
            setIsLoading(false);
            return;
          } else if (fetchError.message.includes('Failed to fetch') || fetchError.message === 'Load failed') {
            toast.error('Network error - please check your connection');
          } else {
            toast.error(`Request failed: ${fetchError.message}`);
          }
        } else {
          toast.error('Failed to load portfolio - network error');
        }
        setIsLoading(false);
        return;
      }
      
      console.log('📊 loadPortfolio: Response status:', response.status);
      
      const responseText = await response.text();
      console.log('📊 loadPortfolio: Response body (first 500 chars):', responseText.substring(0, 500));
      
      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          console.log('📊 loadPortfolio: Parsed data:', { 
            success: data.success, 
            giftsCount: data.gifts?.length,
            totalValue: data.total_value 
          });
          
          if (data.success) {
            const giftsList = data.gifts || [];
            console.log('✅ Portfolio loaded successfully:', {
              giftsCount: giftsList.length,
              totalValue: data.total_value,
              gifts: giftsList.map((g: any) => ({
                title: g.title,
                slug: g.slug,
                num: g.num,
                price: g.price,
                fragment_url: g.fragment_url,
                hasPrice: g.price !== null && g.price !== undefined
              }))
            });
            
            // Ensure all required fields are present
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
              total_supply: g.total_supply || null
            }));
            
            console.log('📦 Normalized gifts:', normalizedGifts);
            console.log('📦 Setting gifts - count:', normalizedGifts.length);
            
            // Set gifts and value first
            setGifts(normalizedGifts);
            setTotalValue(data.total_value || 0);
            
            console.log('✅ Portfolio state updated - gifts:', normalizedGifts.length, 'totalValue:', data.total_value);

            // Save portfolio snapshot if not already saved today (fire and forget, don't wait)
            if (normalizedGifts.length > 0) {
              savePortfolioSnapshot(data.total_value || 0, normalizedGifts.length).catch(err => {
                console.error('Error saving snapshot (non-blocking):', err);
              });
            }
            
            // Stop loading AFTER setting all state
            setIsLoading(false);
            console.log('✅ Loading state set to false');
          } else {
            console.error('❌ Portfolio API returned success:false');
            console.error('❌ Error:', data.error);
            console.error('❌ Debug info:', data.debug);
            toast.error(data.error || 'Failed to load portfolio');
            setIsLoading(false);
          }
        } catch (parseError) {
          console.error('❌ Failed to parse portfolio response:', parseError);
          toast.error('Failed to parse portfolio data');
          setIsLoading(false);
        }
      } else {
        console.error('❌ Portfolio API error:', response.status, responseText.substring(0, 200));
        try {
          const errorData = JSON.parse(responseText);
          toast.error(errorData.error || `Failed to load portfolio (${response.status})`);
        } catch {
          toast.error(`Failed to load portfolio (${response.status})`);
        }
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading portfolio:', error);
      toast.error('Failed to load portfolio');
      setIsLoading(false);
    }
    // Note: No finally block - we explicitly set isLoading(false) in all paths above
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

  const handleUpdate = () => {
    hapticFeedback('impact', 'medium', webApp || undefined);
    loadPortfolio();
    loadPortfolioHistory();
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
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                </svg>
                <div>
                  <div className="text-3xl font-semibold text-white leading-tight">{totalValue.toFixed(2)}</div>
                  <div className={`text-sm font-medium mt-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {isPositive ? '+' : ''}{change.value.toFixed(2)} <span className="opacity-70">{isPositive ? '+' : ''}{change.percentage.toFixed(2)}%</span>
                  </div>
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
                    <div>
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
                  </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Gift List Header */}
          <div className="mx-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Total gifts {gifts.length}</h3>
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
                  className="bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg p-3 cursor-pointer hover:scale-105 transition-transform relative z-0 overflow-hidden group"
                >
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                      backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)`
                    }} />
                  </div>

                  {/* Gift Image - using fragment.com URL like Collection tab */}
                  <div className="relative z-10 mb-2">
                    <div className="aspect-square w-full rounded-lg overflow-hidden bg-gray-900/50 relative">
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
                      {/* Ribbon number badge */}
                      {gift.num && (
                        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">
                          #{gift.num}
                        </div>
                      )}
                      <div className="absolute top-2 right-2 text-xs text-white bg-black/60 px-2 py-1 rounded">
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
                      <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                      </svg>
                      <span className="font-semibold">
                        {gift.price !== null && gift.price !== undefined
                          ? gift.price.toFixed(2)
                          : 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-blue-200">
                      <span>Floor</span>
                      <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                      </svg>
                      <span>
                        {gift.price !== null && gift.price !== undefined
                          ? gift.price.toFixed(2)
                          : 'N/A'}{' '}
                        {gift.price !== null && '+0.60%'}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-blue-400/30">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          hapticFeedback('impact', 'light', webApp || undefined);
                        }}
                        className="p-1 hover:bg-white/20 rounded transition-colors"
                      >
                        <PaperAirplaneIcon className="w-4 h-4 text-white" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          hapticFeedback('impact', 'light', webApp || undefined);
                        }}
                        className="p-1 hover:bg-white/20 rounded transition-colors"
                      >
                        <StarIcon className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'stickers' && (
        <div className="text-center py-8 px-4">
          <p className="text-gray-400">Stickers tab coming soon</p>
        </div>
      )}

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
                        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                        </svg>
                        <span className="text-white text-sm font-medium">{selectedGift.price.toFixed(2)} TON</span>
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
