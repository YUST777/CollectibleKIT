'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { CheckCircle, Zap, Star, Gift, Sparkles, Crown, Gem, PartyPopper } from 'lucide-react';
import { AdPricingDrawer } from '@/components/ui/AdPricingDrawer';
import { useAppActions } from '@/store/useAppStore';
import toast from 'react-hot-toast';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

interface Ad {
  id: number;
  bgGradient?: string;
  bgColor?: string;
  mainText: string;
  subText: string;
  elementImage?: string;
  elementLottie?: string;
  link?: string;
}

interface AdsBannerProps {
  onOpenPremiumDrawer?: () => void;
  externalPremiumDrawerOpen?: boolean;
  onExternalPremiumDrawerChange?: (open: boolean) => void;
  user?: any;
}

export const AdsBanner: React.FC<AdsBannerProps> = ({ onOpenPremiumDrawer, externalPremiumDrawerOpen, onExternalPremiumDrawerChange, user }) => {
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  const { setUser } = useAppActions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [lastTouchTime, setLastTouchTime] = useState(0);
  const [lastTouchX, setLastTouchX] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [lottieData, setLottieData] = useState<Record<string, any>>({});
  const [isPremiumDrawerOpen, setIsPremiumDrawerOpen] = useState(false);
  const [isAdPricingDrawerOpen, setIsAdPricingDrawerOpen] = useState(false);
  const [isGiftsChartDrawerOpen, setIsGiftsChartDrawerOpen] = useState(false);
  const [randomPriceCardUrl, setRandomPriceCardUrl] = useState<string>('/Kissed_Frog_card.png');
  const [isImageVisible, setIsImageVisible] = useState(true);
  const [cdnData, setCdnData] = useState<any>(null);

  // Load random price card URL on mount
  useEffect(() => {
    const loadCdnData = async () => {
      try {
        const response = await fetch('/cdn_links.json');
        const data = await response.json();
        setCdnData(data);
        
        // Combine gifts and stickers
        const allItems = [...data.gifts, ...data.stickers];
        
        // Pick a random item
        const randomIndex = Math.floor(Math.random() * allItems.length);
        const randomItem = allItems[randomIndex];
        
        setRandomPriceCardUrl(randomItem.url);
      } catch (error) {
        console.error('Failed to load CDN data:', error);
      }
    };
    
    loadCdnData();
  }, [isGiftsChartDrawerOpen]);

  // Auto-rotate price cards every 2 seconds
  useEffect(() => {
    if (!isGiftsChartDrawerOpen || !cdnData) return;

    const interval = setInterval(() => {
      // Fade out
      setIsImageVisible(false);
      
      // After fade out completes, change the image and fade in
      setTimeout(() => {
        if (cdnData) {
          const allItems = [...cdnData.gifts, ...cdnData.stickers];
          const randomIndex = Math.floor(Math.random() * allItems.length);
          const randomItem = allItems[randomIndex];
          setRandomPriceCardUrl(randomItem.url);
        }
        
        // Fade in after a brief delay
        setTimeout(() => {
          setIsImageVisible(true);
        }, 50);
      }, 300); // Wait for fade out animation to complete
      
    }, 2000); // Change every 2 seconds

    return () => clearInterval(interval);
  }, [isGiftsChartDrawerOpen, cdnData]);

  const ads: Ad[] = [
    {
      id: 1,
      bgGradient: 'from-yellow-400 via-yellow-500 to-amber-600',
      mainText: 'Put your ad here',
      subText: 'Channels, projects, products',
      elementLottie: '/adno1.json',
      link: undefined // Add your link here
    },
    {
      id: 2,
      bgGradient: 'from-cyan-400 via-[#0bb3fe] to-blue-500',
      mainText: 'Gifts chart',
      subText: 'Every NFT has a price - know it live!',
      elementImage: '/adno2element.png',
      link: undefined // Add your link here
    },
    {
      id: 3,
      bgGradient: 'from-purple-500 via-pink-500 to-rose-500',
      mainText: 'Buy Premium now',
      subText: 'Get unlimited credits for 1 TON/month',
      elementLottie: '/buypreuimead.json',
      link: undefined // Add your payment link here
    },
    {
      id: 4,
      bgColor: '#030303',
      mainText: 'Join our channel',
      subText: "Don't miss any update/new project!",
      elementImage: '/adno4.jpg',
      link: 'https://t.me/The01Studio' // Add your channel link here
    }
  ];

  const handleAdClick = (adId: number, link?: string) => {
    // Open ad pricing drawer for ad #1 (Put your ad here)
    if (adId === 1) {
      setIsAdPricingDrawerOpen(true);
      return;
    }
    
    // Open gifts chart drawer for ad #2
    if (adId === 2) {
      setIsGiftsChartDrawerOpen(true);
      return;
    }
    
    // Open premium drawer for ad #3
    if (adId === 3) {
      setIsPremiumDrawerOpen(true);
      return;
    }
    
    // Open link for other ads
    if (link) {
      window.open(link, '_blank');
    }
  };

  const handleBuyPremium = async () => {
    console.log('=== AdsBanner: Buy Premium clicked ===');
    console.log('Wallet:', wallet);
    
    if (!wallet) {
      console.log('No wallet - opening TON Connect modal...');
      try {
        if (!tonConnectUI) {
          toast.error('TON Connect not initialized. Please refresh the page.');
          return;
        }
        await tonConnectUI.openModal();
      } catch (error) {
        console.error('Error opening wallet modal:', error);
        toast.error('Failed to connect wallet. Please try again.');
      }
      return;
    }

    console.log('Wallet connected! Sending 1 TON transaction...');
    try {
      const transaction = {
        messages: [
          {
            address: 'UQCFRqB2vZnGZRh3ZoZAItNidk8zpkN0uRHlhzrnwweU3mos',
            amount: '1000000000',
          }
        ],
        validUntil: Math.floor(Date.now() / 1000) + 60,
      };

      const result = await tonConnectUI?.sendTransaction(transaction);
      
      if (result) {
          // Upgrade user to premium
          try {
            // Get Telegram WebApp data
            const initData = window.Telegram?.WebApp?.initData || '';
            
            const upgradeResponse = await fetch('/api/premium/upgrade', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': initData,
              },
            });
          
          const upgradeData = await upgradeResponse.json();
          
          if (upgradeData.success) {
            toast.success('Payment successful! Premium activated! 🎉');
            console.log('✅ User upgraded to premium');
            setIsPremiumDrawerOpen(false);
            
            // Refresh user data to reflect premium status
            try {
              const initData = window.Telegram?.WebApp?.initData || '';
              const userResponse = await fetch('/api/user/info', {
                headers: {
                  'X-Telegram-Init-Data': initData,
                },
              });
              if (userResponse.ok) {
                const userData = await userResponse.json();
                setUser(userData);
                console.log('✅ User data refreshed with premium status');
              }
            } catch (err) {
              console.error('Error refreshing user data:', err);
            }
          } else {
            toast.error('Payment received but failed to activate premium. Please contact support.');
            console.error('Failed to upgrade user:', upgradeData);
          }
        } catch (error) {
          console.error('Error upgrading user to premium:', error);
          toast.error('Payment received but activation failed. Please contact support.');
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollContainerRef.current?.offsetLeft || 0));
    setScrollLeft(scrollContainerRef.current?.scrollLeft || 0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touchX = e.touches[0].pageX - (scrollContainerRef.current?.offsetLeft || 0);
    setStartX(touchX);
    setScrollLeft(scrollContainerRef.current?.scrollLeft || 0);
    setLastTouchX(touchX);
    setLastTouchTime(Date.now());
    setVelocity(0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (scrollContainerRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 1.5; // Reduced multiplier for smoother movement
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault(); // Prevent default scrolling behavior
    const x = e.touches[0].pageX - (scrollContainerRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 1.2; // Reduced multiplier for smoother touch movement
    
    // Calculate velocity for momentum scrolling
    const currentTime = Date.now();
    const timeDelta = currentTime - lastTouchTime;
    if (timeDelta > 0) {
      const distanceDelta = x - lastTouchX;
      const currentVelocity = distanceDelta / timeDelta;
      setVelocity(currentVelocity);
      setLastTouchX(x);
      setLastTouchTime(currentTime);
    }
    
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    snapToNearest();
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    snapToNearest();
  };

  const snapToNearest = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollPosition = container.scrollLeft;
    const itemWidth = container.offsetWidth;
    
    // Use velocity to determine if we should go to next/previous slide
    let targetIndex = Math.round(scrollPosition / itemWidth);
    
    // Apply momentum based on velocity
    if (Math.abs(velocity) > 0.5) {
      if (velocity > 0 && targetIndex > 0) {
        targetIndex = Math.max(0, targetIndex - 1);
      } else if (velocity < 0 && targetIndex < ads.length - 1) {
        targetIndex = Math.min(ads.length - 1, targetIndex + 1);
      }
    }
    
    setCurrentIndex(targetIndex);
    
    // Use requestAnimationFrame for smoother animation
    requestAnimationFrame(() => {
      container.scrollTo({
        left: targetIndex * itemWidth,
        behavior: 'smooth'
      });
    });
  };

  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      if (!scrollContainerRef.current || isDragging) return;
      
      // Debounce scroll events for better performance
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        
        const scrollPosition = container.scrollLeft;
        const itemWidth = container.offsetWidth;
        const index = Math.round(scrollPosition / itemWidth);
        setCurrentIndex(index);
      }, 16); // ~60fps
    };

    const container = scrollContainerRef.current;
    container?.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container?.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [isDragging]);

  // Load Lottie animations
  useEffect(() => {
    // Load ad animations
    ads.forEach(ad => {
      if (ad.elementLottie && !lottieData[ad.elementLottie]) {
        fetch(ad.elementLottie)
          .then(res => res.json())
          .then(data => {
            setLottieData(prev => ({ ...prev, [ad.elementLottie!]: data }));
          })
          .catch(err => console.error('Failed to load Lottie:', err));
      }
    });
    
    // Load TON logo
    if (!lottieData['/tonlogo.json']) {
      fetch('/tonlogo.json')
        .then(res => res.json())
        .then(data => {
          setLottieData(prev => ({ ...prev, '/tonlogo.json': data }));
        })
        .catch(err => console.error('Failed to load TON logo:', err));
    }
  }, []);

  return (
    <div className="mb-3 mx-4 relative">
      {/* Swipeable Container */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-scroll scrollbar-hide snap-x snap-mandatory cursor-grab active:cursor-grabbing touch-pan-x momentum-scroll"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch' // iOS momentum scrolling
        }}
      >
        {ads.map((ad) => (
          <div
            key={ad.id}
            className="min-w-full snap-center"
            onClick={() => !isDragging && handleAdClick(ad.id, ad.link)}
          >
            <div 
              className={`p-3 rounded-xl relative h-16 transition-transform hover:scale-[1.02] active:scale-[0.98] ${ad.bgGradient ? `bg-gradient-to-r ${ad.bgGradient}` : ''}`}
              style={ad.bgColor ? { backgroundColor: ad.bgColor } : {}}
            >
              {/* White light effect overlay - only for gradient ads */}
              {ad.bgGradient && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-white/40 rounded-xl"></div>
              )}
              
              {/* Content container */}
              <div className="relative flex items-center justify-between h-full px-4">
                {/* Left side - Text content */}
                <div className="flex flex-col items-center space-y-0.5">
                  <h3 className="text-white font-bold text-xl leading-tight text-center">
                    {ad.mainText}
                  </h3>
                  <p className="text-white/90 text-[10px] font-medium text-center leading-tight">
                    {ad.subText}
                  </p>
                </div>
                
                {/* Right side - Element with white light effect */}
                <div className="flex-shrink-0 relative">
                  {/* White light glow effect - skip for ad #4 */}
                  {ad.id !== 4 && (
                    ad.id === 1 ? (
                      <>
                        <div className="absolute inset-0 bg-white/30 rounded-full blur-sm scale-110"></div>
                        <div className="absolute inset-0 bg-white/20 rounded-full blur-md scale-125"></div>
                      </>
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-white/10 rounded-full blur-sm scale-105"></div>
                        <div className="absolute inset-0 bg-white/5 rounded-full blur-md scale-110"></div>
                      </>
                    )
                  )}
                  
                  {/* Render Lottie or Image */}
                  {ad.elementLottie && lottieData[ad.elementLottie] ? (
                    <div className="w-17 h-17 relative z-10">
                      <Lottie
                        animationData={lottieData[ad.elementLottie]}
                        loop={true}
                        autoplay={true}
                        style={{ width: ad.id === 1 ? 70 : 66.5, height: ad.id === 1 ? 70 : 66.5 }}
                      />
                    </div>
                  ) : ad.elementImage ? (
                    <Image
                      src={ad.elementImage}
                      alt={ad.mainText}
                      width={70}
                      height={70}
                      className="w-17 h-17 object-contain relative z-10"
                      priority
                    />
                  ) : null}
                </div>
              </div>
              
              {/* Additional sparkle effects - only for ad 1 */}
              {ad.id === 1 && (
                <>
                  <Sparkles className="absolute top-2 right-20 text-white/60 w-4 h-4" />
                  <Star className="absolute bottom-2 left-20 text-white/60 w-4 h-4" />
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-1.5 mt-2">
        {ads.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentIndex(index);
              scrollContainerRef.current?.scrollTo({
                left: index * (scrollContainerRef.current?.offsetWidth || 0),
                behavior: 'smooth'
              });
            }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              currentIndex === index
                ? 'w-6 bg-white'
                : 'w-1.5 bg-white/40'
            }`}
            aria-label={`Go to ad ${index + 1}`}
          />
        ))}
      </div>

      {/* Premium Features Drawer */}
      <Sheet open={externalPremiumDrawerOpen !== undefined ? externalPremiumDrawerOpen : isPremiumDrawerOpen} onOpenChange={(open) => {
        if (onExternalPremiumDrawerChange) {
          onExternalPremiumDrawerChange(open);
        } else {
          setIsPremiumDrawerOpen(open);
        }
      }}>
        <SheetContent className="bg-[#1c1c1d] flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-white text-center flex items-center justify-center gap-2">
              {lottieData['/buypreuimead.json'] && (
                <div className="w-8 h-8">
                  <Lottie
                    animationData={lottieData['/buypreuimead.json']}
                    loop={true}
                    autoplay={true}
                    style={{ width: 32, height: 32 }}
                  />
                </div>
              )}
              Choose Your Plan
            </SheetTitle>
          </SheetHeader>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto mt-6 space-y-6 pb-4">
            {/* Premium Badge */}
            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 p-6 rounded-2xl text-center">
              <div className="text-white text-3xl font-bold mb-2">
                Premium Plan
              </div>
              <div className="text-white/90 text-lg">
                1 TON/month
              </div>
              <div className="mt-3 text-white/70 text-sm flex items-center justify-center gap-1">
                <PartyPopper className="w-4 h-4" />
                <span>Unlimited everything!</span>
              </div>
            </div>

            {/* Plan Comparison Table */}
            <div className="space-y-4">
              <h3 className="text-white font-semibold text-lg text-center mb-4">
                What you get:
              </h3>
              
              {/* Comparison Table */}
              <div className="bg-[#2a2a2b] rounded-xl overflow-hidden">
                {/* Header Row */}
                <div className="grid grid-cols-2 gap-2 p-3 border-b border-gray-700">
                  <div className="text-center text-gray-400 text-sm font-medium">
                    Free Plan
                  </div>
                  <div className="text-center text-purple-400 text-sm font-bold">
                    Premium Plan
                  </div>
                </div>

                {/* Credits Row */}
                <div className="grid grid-cols-2 gap-2 p-3 border-b border-gray-700">
                  <div className="text-center">
                    <div className="text-gray-300 font-medium">20 Credits</div>
                  </div>
                  <div className="text-center flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-yellow-400 mr-1" />
                    <div className="text-white font-bold text-xl">∞ Unlimited</div>
                  </div>
                </div>

                {/* Game Wins Per Day Row */}
                <div className="grid grid-cols-2 gap-2 p-3 border-b border-gray-700">
                  <div className="text-center">
                    <div className="text-gray-300 font-medium">5 wins/day</div>
                  </div>
                  <div className="text-center flex items-center justify-center">
                    <Zap className="w-5 h-5 text-blue-400 mr-1" />
                    <div className="text-white font-bold text-lg">10 wins/day</div>
                  </div>
                </div>

                {/* Watermark Row */}
                <div className="grid grid-cols-2 gap-2 p-3 border-b border-gray-700">
                  <div className="text-center">
                    <div className="text-gray-400 text-sm">With Watermark</div>
                  </div>
                  <div className="text-center flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-1" />
                    <div className="text-green-400 font-medium">No Watermark</div>
                  </div>
                </div>

                {/* TON Rewards Row */}
                <div className="grid grid-cols-2 gap-2 p-3 border-b border-gray-700">
                  <div className="text-center">
                    <div className="text-gray-300 font-medium">0.1 TON at 100 wins</div>
                  </div>
                  <div className="text-center flex items-center justify-center">
                    <Gem className="w-5 h-5 text-yellow-400 mr-1" />
                    <div className="text-white font-bold text-lg">0.1 TON at 50 wins</div>
                  </div>
                </div>

                {/* Exclusive Features Row */}
                <div className="grid grid-cols-2 gap-2 p-3">
                  <div className="text-center">
                    <div className="text-gray-400 text-sm">Standard</div>
                  </div>
                  <div className="text-center flex items-center justify-center">
                    <Crown className="w-5 h-5 text-purple-400 mr-1" />
                    <div className="text-purple-400 font-medium">Exclusive Patterns</div>
                  </div>
                </div>
              </div>

              {/* Value Highlight */}
              <div className="bg-green-900/30 border border-green-600/30 rounded-lg p-4">
                <div className="text-green-300 font-semibold mb-1 flex items-center gap-2 justify-center">
                  {lottieData['/tonlogo.json'] ? (
                    <div className="w-7 h-7">
                      <Lottie
                        animationData={lottieData['/tonlogo.json']}
                        loop={true}
                        autoplay={true}
                        style={{ width: 28, height: 28 }}
                      />
                    </div>
                  ) : (
                    <Gem className="w-7 h-7" />
                  )}
                  <span>Monthly Subscription</span>
                </div>
                <div className="text-green-200/80 text-sm text-center">
                  Get 2x faster TON rewards & unlimited usage!
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Buy Button at Bottom */}
          <div className="mt-auto border-t border-white/10 p-4 bg-[#1c1c1d]">
            {(user?.user_type === 'premium' || user?.user_type === 'vip') ? (
              <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-lg p-4 text-center">
                <p className="text-yellow-300 font-semibold">You already have Premium!</p>
                <p className="text-yellow-200/70 text-sm mt-1">Enjoy unlimited access</p>
              </div>
            ) : (
              <>
                <Button
                  onClick={handleBuyPremium}
                  className="w-full bg-gradient-to-r from-[#0098EA] to-[#0088CC] hover:from-[#0088CC] hover:to-[#0078BB] text-white font-bold py-4 text-lg flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>Subscribe for 1 TON/month</span>
                  {lottieData['/tonlogo.json'] ? (
                    <div className="w-7 h-7">
                      <Lottie
                        animationData={lottieData['/tonlogo.json']}
                        loop={true}
                        autoplay={true}
                        style={{ width: 28, height: 28 }}
                      />
                    </div>
                  ) : (
                    <Gem className="w-7 h-7" />
                  )}
                </Button>
                <div className="text-center text-gray-400 text-xs mt-2">
                  Renews monthly • Secure payment via TON blockchain
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Ad Pricing Drawer */}
      <AdPricingDrawer 
        isOpen={isAdPricingDrawerOpen} 
        onClose={() => setIsAdPricingDrawerOpen(false)} 
      />

      {/* Gifts Chart Drawer */}
      <Sheet open={isGiftsChartDrawerOpen} onOpenChange={setIsGiftsChartDrawerOpen}>
        <SheetContent className="bg-[#1c1c1d] flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-white text-center">
              Gifts Chart
            </SheetTitle>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            {/* Text Content */}
            <div className="text-center space-y-2">
              <h3 className="text-white text-xl font-semibold">
                Want to know all the Gifts/Stickers prices live?
              </h3>
              <p className="text-gray-300 text-base">
                Use @giftschartbot
              </p>
            </div>

            {/* Image */}
            <div className="flex justify-center">
              <div className="relative">
                <Image
                  src={randomPriceCardUrl}
                  alt="Gifts Chart Example"
                  width={350}
                  height={450}
                  className={`rounded-lg transition-opacity duration-300 ${
                    isImageVisible ? 'opacity-100' : 'opacity-0'
                  }`}
                  priority
                  onError={(e) => {
                    // Fallback to local image if external URL fails
                    e.currentTarget.src = '/Kissed_Frog_card.png';
                  }}
                />
              </div>
            </div>

            {/* Description */}
            <div className="text-center text-gray-400 text-sm px-4">
              Example here is the live price of a random gift or sticker
            </div>

            {/* Open Now Button */}
            <div className="px-4">
              <Button
                onClick={() => window.open('https://t.me/giftsChartBot', '_blank')}
                className="w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-600 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-4 text-lg shadow-lg"
              >
                Open Now
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
