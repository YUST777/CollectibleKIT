'use client';

import React from 'react';

interface HamburgerIconProps {
  isOpen?: boolean;
  onClick?: () => void;
  className?: string;
}

export const HamburgerIcon: React.FC<HamburgerIconProps> = ({ 
  isOpen = false, 
  onClick, 
  className = "w-6 h-6" 
}) => {
  return (
    <button
      onClick={onClick}
      className={`${className} flex flex-col justify-center space-y-1.5 p-1 rounded-lg hover:bg-gray-800/50 transition-all duration-200 group`}
    >
      <div 
        className={`w-full h-0.5 bg-gray-400 group-hover:bg-white transition-all duration-200 ${
          isOpen ? 'rotate-45 translate-y-1.5' : ''
        }`}
      />
      <div 
        className={`w-full h-0.5 bg-gray-400 group-hover:bg-white transition-all duration-200 ${
          isOpen ? 'opacity-0' : ''
        }`}
      />
      <div 
        className={`w-full h-0.5 bg-gray-400 group-hover:bg-white transition-all duration-200 ${
          isOpen ? '-rotate-45 -translate-y-1.5' : ''
        }`}
      />
    </button>
  );
};
