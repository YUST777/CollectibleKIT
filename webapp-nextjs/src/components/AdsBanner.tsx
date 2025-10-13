'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface Ad {
  id: number;
  bgGradient: string;
  mainText: string;
  subText: string;
  elementImage: string;
  link?: string;
}

export const AdsBanner: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const ads: Ad[] = [
    {
      id: 1,
      bgGradient: 'from-yellow-400 via-yellow-500 to-amber-600',
      mainText: 'Put your ad here',
      subText: 'Channels, projects, products',
      elementImage: '/adno1element.png',
      link: undefined // Add your link here
    },
    {
      id: 2,
      bgGradient: 'from-cyan-400 via-[#0bb3fe] to-blue-500',
      mainText: 'Gifts chart',
      subText: 'Every nft have a price know it live',
      elementImage: '/adno2element.png',
      link: undefined // Add your link here
    }
  ];

  const handleAdClick = (link?: string) => {
    if (link) {
      window.open(link, '_blank');
    }
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
            onClick={() => !isDragging && handleAdClick(ad.link)}
          >
            <div className={`bg-gradient-to-r ${ad.bgGradient} p-3 rounded-xl relative h-16 transition-transform hover:scale-[1.02] active:scale-[0.98]`}>
              {/* White light effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-white/40 rounded-xl"></div>
              
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
                  {/* White light glow effect - reduced for ad 2 */}
                  {ad.id === 1 ? (
                    <>
                      <div className="absolute inset-0 bg-white/30 rounded-full blur-sm scale-110"></div>
                      <div className="absolute inset-0 bg-white/20 rounded-full blur-md scale-125"></div>
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-white/10 rounded-full blur-sm scale-105"></div>
                      <div className="absolute inset-0 bg-white/5 rounded-full blur-md scale-110"></div>
                    </>
                  )}
                  
                  <Image
                    src={ad.elementImage}
                    alt={ad.mainText}
                    width={70}
                    height={70}
                    className="w-17 h-17 object-contain relative z-10"
                    priority
                  />
                </div>
              </div>
              
              {/* Additional sparkle effects - only for ad 1 */}
              {ad.id === 1 && (
                <>
                  <div className="absolute top-2 right-20 text-white/60 text-sm">✨</div>
                  <div className="absolute bottom-2 left-20 text-white/60 text-sm">⭐</div>
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
    </div>
  );
};
