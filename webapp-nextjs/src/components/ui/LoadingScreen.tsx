'use client';

import React, { useEffect, useRef } from 'react';

export const LoadingScreen: React.FC = () => {
  const animationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Lottie animation if available
    if (typeof window !== 'undefined' && window.lottie && animationRef.current) {
      try {
        // Load the coding duck animation from the original app
        fetch('/coding_duck.json')
          .then(response => response.json())
          .then(animationData => {
            if (window.lottie && animationRef.current) {
              window.lottie.loadAnimation({
                container: animationRef.current,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                animationData: animationData,
              });
            }
          })
          .catch(error => {
            console.warn('Failed to load Lottie animation:', error);
            // Fallback to CSS animation
            if (animationRef.current) {
              animationRef.current.innerHTML = '🦆';
              animationRef.current.className = 'text-6xl animate-bounce-gentle';
            }
          });
      } catch (error) {
        console.warn('Lottie not available, using fallback:', error);
        // Fallback to CSS animation
        if (animationRef.current) {
          animationRef.current.innerHTML = '🦆';
          animationRef.current.className = 'text-6xl animate-bounce-gentle';
        }
      }
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-bg-main to-box-bg">
      <div className="text-center">
        {/* Animation Container */}
        <div 
          ref={animationRef}
          className="w-32 h-32 mx-auto mb-6 flex items-center justify-center text-6xl animate-bounce-gentle"
        >
          🦆
        </div>
        
        {/* Loading Text */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-text-idle">
            Story Canvas
          </h2>
          <p className="text-text-active">
            Loading... Please wait
          </p>
        </div>
        
        {/* Loading Progress Bar */}
        <div className="mt-8 w-48 mx-auto">
          <div className="h-1 bg-icon-idle/30 rounded-full overflow-hidden">
            <div className="h-full bg-icon-active rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};
