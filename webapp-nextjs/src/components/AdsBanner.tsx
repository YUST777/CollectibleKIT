import React from 'react';
import Image from 'next/image';

export const AdsBanner: React.FC = () => {
  const handleAdClick = () => {
    // You can add your channel link here
    // window.open('https://t.me/yourchannel', '_blank');
  };

  return (
    <div 
      className="mb-3 mx-4 relative overflow-hidden rounded-xl cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
      onClick={handleAdClick}
    >
      {/* Golden gradient background */}
      <div className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 p-4 rounded-xl relative">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-2 left-2 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute top-4 left-6 w-1 h-1 bg-white rounded-full"></div>
          <div className="absolute bottom-2 right-2 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute bottom-4 right-6 w-1 h-1 bg-white rounded-full"></div>
        </div>
        
        {/* Content container */}
        <div className="relative flex items-center justify-between h-20">
          {/* Left side - Text content */}
          <div className="flex flex-col justify-center space-y-1">
            <h3 className="text-white font-bold text-xl leading-tight">
              Put your ad here
            </h3>
            <p className="text-yellow-100 text-sm font-medium">
              Channels, projects, products
            </p>
          </div>
          
          {/* Right side - Duck element */}
          <div className="flex-shrink-0">
            <Image
              src="/adno1element.png"
              alt="Duck with megaphone"
              width={80}
              height={80}
              className="w-20 h-20 object-contain"
              priority
            />
          </div>
        </div>
        
        {/* Subtle sparkle effects */}
        <div className="absolute top-3 right-16 text-yellow-200 opacity-60 text-lg">✨</div>
        <div className="absolute bottom-3 left-16 text-yellow-200 opacity-60 text-lg">⭐</div>
      </div>
    </div>
  );
};
