'use client';

import React, { useState } from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { Drawer } from '../ui/Drawer';

export const Header: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <>
      {/* Header with Hamburger Menu */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CK</span>
            </div>
            <h1 className="text-lg font-semibold text-white">CollectibleKIT</h1>
          </div>
          
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors duration-200"
          >
            <Bars3Icon className="w-6 h-6 text-gray-300" />
          </button>
        </div>
      </header>
      
      {/* Drawer */}
      <Drawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
      />
    </>
  );
};
