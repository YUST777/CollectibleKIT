'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Code2 } from 'lucide-react';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

export const LoadingScreen: React.FC = () => {
  const [lottieData, setLottieData] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Load Lottie animation
    fetch('/coding-duck.json')
      .then(res => res.json())
      .then(data => setLottieData(data))
      .catch(err => console.error('Failed to load coding duck animation:', err));

    // Animate loading bar from 0 to 100%
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 30); // Will take 3 seconds to reach 100%

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-bg-main to-box-bg">
      <div className="text-center">
        {/* Animation Container */}
        <div className="w-48 h-48 mx-auto mb-6 flex items-center justify-center">
          {mounted && lottieData ? (
            <Lottie
              animationData={lottieData}
              loop={true}
              autoplay={true}
              style={{ width: 192, height: 192 }}
            />
          ) : (
            <div className="animate-bounce">
              <Code2 className="w-24 h-24 text-text-idle" />
            </div>
          )}
        </div>
        
        {/* Loading Text */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-text-idle">
            CollectibleKIT
          </h2>
          <p className="text-text-active">
            Loading... {progress}%
          </p>
        </div>
        
        {/* Loading Progress Bar */}
        <div className="mt-8 w-64 mx-auto">
          <div className="h-2 bg-icon-idle/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
