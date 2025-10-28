'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Lottie from 'lottie-react';

interface OnboardingTrailerProps {
  onComplete: () => void;
}

const OnboardingTrailer: React.FC<OnboardingTrailerProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [tonLottieData, setTonLottieData] = useState<any | null>(null);
  const [tonLottieLoaded, setTonLottieLoaded] = useState(false);

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
      image: '/assets/ton-trailer.json', // We'll handle this Lottie animation
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

  // Eagerly preload TON Lottie JSON on mount so it appears in network tab
  useEffect(() => {
    let cancelled = false;
    const primaryUrl = '/assets/ton-trailer.json';
    const fallbackUrl = '/assets/ton%20trailer.json';
    const load = (url: string) => fetch(url).then((res) => res.json());
    load(primaryUrl)
      .then((data) => {
        if (!cancelled) {
          setTonLottieData(data);
          setTonLottieLoaded(true);
          // eslint-disable-next-line no-console
          console.log('✅ TON Lottie loaded:', primaryUrl);
        }
      })
      .catch((err) => {
        load(fallbackUrl)
          .then((data) => {
            if (!cancelled) {
              setTonLottieData(data);
              setTonLottieLoaded(true);
              // eslint-disable-next-line no-console
              console.log('✅ TON Lottie loaded via fallback:', fallbackUrl);
            }
          })
          .catch((err2) => {
            // eslint-disable-next-line no-console
            console.error('❌ Failed to load TON Lottie JSON (both paths):', err, err2);
          });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Also ensure it loads if user jumps directly to slide 3 somehow
  useEffect(() => {
    if (currentSlide === 2 && !tonLottieLoaded) {
      const primaryUrl = '/assets/ton-trailer.json';
      const fallbackUrl = '/assets/ton%20trailer.json';
      const load = (url: string) => fetch(url).then((res) => res.json());
      load(primaryUrl)
        .then((data) => {
          setTonLottieData(data);
          setTonLottieLoaded(true);
          // eslint-disable-next-line no-console
          console.log('✅ TON Lottie loaded on slide 3:', primaryUrl);
        })
        .catch((err) => {
          load(fallbackUrl)
            .then((data) => {
              setTonLottieData(data);
              setTonLottieLoaded(true);
              // eslint-disable-next-line no-console
              console.log('✅ TON Lottie loaded on slide 3 via fallback:', fallbackUrl);
            })
            .catch((err2) => {
              // eslint-disable-next-line no-console
              console.error('❌ Failed to load TON Lottie JSON on slide 3 (both paths):', err, err2);
            });
        });
    }
  }, [currentSlide, tonLottieLoaded]);

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
            // Fullscreen Lottie animation for TON trailer
            <div className={`w-full h-full ${isTransitioning ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
              {tonLottieData ? (
                <div className="absolute inset-0">
                  <Lottie
                    animationData={tonLottieData}
                    loop
                    autoplay
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-yellow-600/20 to-orange-600/20" />
              )}
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

