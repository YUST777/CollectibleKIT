'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface OnboardingTrailerProps {
  onComplete: () => void;
}

const OnboardingTrailer: React.FC<OnboardingTrailerProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const slides = [
    {
      image: '/assets/toolstriler.png',
      title: 'Tools',
      description: 'Powerful tools for creating and managing your collectibles'
    },
    {
      image: '/assets/gamestrialer.png',
      title: 'Games',
      description: 'Play daily games to earn credits and unlock rewards'
    },
    {
      image: '/assets/ton trailer.json', // We'll handle this Lottie animation
      title: 'TON Rewards',
      description: 'Convert credits to TON and withdraw to your wallet'
    }
  ];

  // Auto-advance slides
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentSlide < slides.length - 1) {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentSlide(prev => prev + 1);
          setIsTransitioning(false);
        }, 300);
      } else {
        onComplete();
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentSlide, slides.length, onComplete]);

  // Handle swipe gestures
  const handleSwipe = (direction: 'left' | 'right') => {
    if (isTransitioning) return;

    if (direction === 'left' && currentSlide < slides.length - 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide(prev => prev + 1);
        setIsTransitioning(false);
      }, 300);
    } else if (direction === 'right' && currentSlide > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide(prev => prev - 1);
        setIsTransitioning(false);
      }, 300);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Fullscreen mobile view */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        {/* Main content - image or video */}
        <div className="w-full h-full flex items-center justify-center">
          {currentSlide === 2 ? (
            // Lottie animation for TON trailer
            <div className="w-full h-full">
              {/* We'll load Lottie JSON here */}
              <div className="w-full h-full bg-gradient-to-br from-yellow-600/20 to-orange-600/20 flex items-center justify-center">
                <div className="text-center px-8">
                  <h1 className="text-4xl font-bold text-yellow-400 mb-4">TON Rewards</h1>
                  <p className="text-white text-lg">{slides[currentSlide].description}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className={`w-full h-full transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
              <img 
                src={slides[currentSlide].image} 
                alt={slides[currentSlide].title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Bottom text overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-8 pb-20">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-3">
              {slides[currentSlide].title}
            </h1>
            <p className="text-white/80 text-lg">
              {slides[currentSlide].description}
            </p>
          </div>
        </div>

        {/* Navigation dots */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'w-8 bg-white' 
                  : 'w-2 bg-white/30'
              }`}
            />
          ))}
        </div>

        {/* Touch handlers for swipe */}
        <div 
          className="absolute inset-0"
          onTouchStart={(e) => {
            const touch = e.touches[0];
            const startX = touch.clientX;
            
            const handleTouchEnd = (e: TouchEvent) => {
              const endX = e.changedTouches[0].clientX;
              const diff = startX - endX;
              
              if (Math.abs(diff) > 50) {
                if (diff > 0) {
                  handleSwipe('left'); // Swipe left = next
                } else {
                  handleSwipe('right'); // Swipe right = previous
                }
              }
            };
            
            document.addEventListener('touchend', handleTouchEnd, { once: true });
          }}
        />
      </div>

      {/* Skip button */}
      <button
        onClick={onComplete}
        className="absolute top-4 right-4 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-white font-medium transition-all"
      >
        Skip
      </button>
    </div>
  );
};

export default OnboardingTrailer;

