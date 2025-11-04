'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getTelegramWebApp } from '@/lib/telegram';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

interface ChannelSubscribeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChannelSubscribeDrawer: React.FC<ChannelSubscribeDrawerProps> = ({ isOpen, onClose }) => {
  const [lottieData, setLottieData] = useState<any>(null);

  useEffect(() => {
    // Load Lottie animation
    fetch('/joinourchannle.json')
      .then(res => res.json())
      .then(data => {
        console.log('✅ Lottie animation loaded successfully');
        setLottieData(data);
      })
      .catch(err => {
        console.error('Failed to load Lottie animation:', err);
        // Try alternative path
        fetch('/assets/joinourchannle.json')
          .then(res => res.json())
          .then(data => {
            console.log('✅ Lottie animation loaded from alternative path');
            setLottieData(data);
          })
          .catch(err2 => console.error('Failed to load Lottie animation from alternative path:', err2));
      });
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('📢 ChannelSubscribeDrawer: isOpen =', isOpen);
  }, [isOpen]);

  const handleJoinChannel = () => {
    const webApp = getTelegramWebApp();
    if (webApp) {
      // Use Telegram's openLink method if available
      webApp.openLink('https://t.me/The01Studio');
    } else {
      // Fallback to window.open
      window.open('https://t.me/The01Studio', '_blank');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Drawer - Sticks to the sides exactly like Sheet component */}
      <div 
        className="fixed inset-x-0 bottom-0 bg-[#1c1c1d] z-[70] transform transition-transform duration-300 ease-out rounded-t-[24px] shadow-2xl"
        style={{ height: '50vh', maxHeight: '500px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-500 rounded-full"></div>
        </div>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white hover:text-gray-300 transition-colors p-1.5 z-10"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
        
        {/* Content - Wider with more padding */}
        <div className="flex flex-col items-center justify-center h-full px-8 pb-8 pt-4 gap-5">
          {/* Lottie Animation */}
          {lottieData && (
            <div className="flex-shrink-0" style={{ width: '150px', height: '150px' }}>
              <Lottie
                animationData={lottieData}
                loop={true}
                autoplay={true}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          )}
          
          {/* Text */}
          <div className="text-center">
            <h3 className="text-white text-xl font-bold mb-2">
              Subscribe to our channel!
            </h3>
            <p className="text-gray-300 text-base">
              Join <span className="text-blue-400 font-semibold">@The01Studio</span> to stay updated
            </p>
          </div>
          
          {/* Join Button - Much bigger and wider */}
          <button
            onClick={handleJoinChannel}
            className="w-full max-w-sm px-10 py-4 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
          >
            Join Channel
          </button>
        </div>
      </div>
    </>
  );
};
