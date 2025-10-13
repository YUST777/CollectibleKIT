import React from 'react';
import Image from 'next/image';

export const AdsBanner: React.FC = () => {
  const handleAdClick = () => {
    // You can add your channel link here
    // window.open('https://t.me/yourchannel', '_blank');
  };

  return (
    <div 
      className="mb-3 mx-4 relative overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
      onClick={handleAdClick}
    >
      {/* Golden gradient background - slim horizontal design */}
      <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 p-3 rounded-xl relative h-16">
        {/* White light effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-white/40 rounded-xl"></div>
        
        {/* Content container */}
        <div className="relative flex items-center justify-between h-full">
          {/* Left side - Text content */}
          <div className="flex flex-col justify-center space-y-0.5 ml-2">
            <h3 className="text-white font-bold text-lg leading-tight">
              Put your ad here
            </h3>
            <p className="text-yellow-100 text-xs font-medium">
              Channels, projects, products
            </p>
          </div>
          
          {/* Middle - Check now button */}
          <button className="bg-white text-yellow-600 px-4 py-1.5 rounded-lg font-semibold text-sm hover:bg-yellow-50 transition-colors">
            Check now!
          </button>
          
          {/* Right side - Duck element with white light effect */}
          <div className="flex-shrink-0 relative">
            {/* White light glow effect around duck */}
            <div className="absolute inset-0 bg-white/30 rounded-full blur-sm scale-110"></div>
            <div className="absolute inset-0 bg-white/20 rounded-full blur-md scale-125"></div>
            
            <Image
              src="/adno1element.png"
              alt="Duck with megaphone"
              width={60}
              height={60}
              className="w-15 h-15 object-contain relative z-10"
              priority
            />
          </div>
        </div>
        
        {/* Additional sparkle effects */}
        <div className="absolute top-2 right-20 text-white/60 text-sm">✨</div>
        <div className="absolute bottom-2 left-20 text-white/60 text-sm">⭐</div>
      </div>
    </div>
  );
};
