'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { CheckCircle, Zap, Star, Gift, Sparkles, Crown, Gem, PartyPopper } from 'lucide-react';

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

export const AdsBanner: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [lottieData, setLottieData] = useState<Record<string, any>>({});
  const [isPremiumDrawerOpen, setIsPremiumDrawerOpen] = useState(false);

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
      subText: 'Every nft have a price know it live',
      elementImage: '/adno2element.png',
      link: undefined // Add your link here
    },
    {
      id: 3,
      bgGradient: 'from-purple-500 via-pink-500 to-rose-500',
      mainText: 'Buy Premium now',
      subText: 'Have 300 Credits for 1 TON !!',
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

  const handleBuyPremium = () => {
    // TODO: Integrate with payment system
    console.log('Buy Premium clicked');
    // You can add payment logic here
    setIsPremiumDrawerOpen(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollContainerRef.current?.offsetLeft || 0));
    setScrollLeft(scrollContainerRef.current?.scrollLeft || 0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].pageX - (scrollContainerRef.current?.offsetLeft || 0));
    setScrollLeft(scrollContainerRef.current?.scrollLeft || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (scrollContainerRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - (scrollContainerRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2;
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
    const index = Math.round(scrollPosition / itemWidth);
    setCurrentIndex(index);
    container.scrollTo({
      left: index * itemWidth,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current || isDragging) return;
      const container = scrollContainerRef.current;
      const scrollPosition = container.scrollLeft;
      const itemWidth = container.offsetWidth;
      const index = Math.round(scrollPosition / itemWidth);
      setCurrentIndex(index);
    };

    const container = scrollContainerRef.current;
    container?.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
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
        className="flex overflow-x-scroll scrollbar-hide snap-x snap-mandatory cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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
      <Sheet open={isPremiumDrawerOpen} onOpenChange={setIsPremiumDrawerOpen}>
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
              Premium Features
            </SheetTitle>
          </SheetHeader>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto mt-6 space-y-6 pb-4">
            {/* Premium Badge */}
            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 p-6 rounded-2xl text-center">
              <div className="text-white text-3xl font-bold mb-2">
                300 Credits
              </div>
              <div className="text-white/90 text-lg">
                For only 1 TON
              </div>
              <div className="mt-3 text-white/70 text-sm flex items-center justify-center gap-1">
                <PartyPopper className="w-4 h-4" />
                <span>Best value package!</span>
              </div>
            </div>

            {/* Features List */}
            <div className="space-y-4">
              <h3 className="text-white font-semibold text-lg mb-4">What you get:</h3>
              
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-white font-medium">300 Credits</div>
                  <div className="text-gray-400 text-sm">Process 300 images without watermark</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-white font-medium">No Watermarks</div>
                  <div className="text-gray-400 text-sm">All your images will be clean and professional</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Gift className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-white font-medium">Exclusive Features</div>
                  <div className="text-gray-400 text-sm">Access to premium tools and effects</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-white font-medium">Custom Watermarks</div>
                  <div className="text-gray-400 text-sm">Add your own branding to images</div>
                </div>
              </div>
            </div>

            {/* Value Highlight */}
            <div className="bg-green-900/30 border border-green-600/30 rounded-lg p-4">
              <div className="text-green-300 font-semibold mb-1 flex items-center gap-2">
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
                <span>Amazing Value</span>
              </div>
              <div className="text-green-200/80 text-sm">
                That's less than 0.0034 TON per image!
              </div>
            </div>
          </div>

          {/* Fixed Buy Button at Bottom */}
          <div className="mt-auto border-t border-white/10 p-4 bg-[#1c1c1d]">
            <Button
              onClick={handleBuyPremium}
              className="w-full bg-gradient-to-r from-[#0098EA] to-[#0088CC] hover:from-[#0088CC] hover:to-[#0078BB] text-white font-bold py-4 text-lg flex items-center justify-center gap-2 shadow-lg"
            >
              <span>Buy Now for 1 TON</span>
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
              Secure payment via TON blockchain
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
