'use client';

import React, { useState } from 'react';
import { AdDrawer } from './ui/AdDrawer';
import { Megaphone, TrendingUp, Users } from 'lucide-react';

interface AdSpaceProps {
  variant?: 'banner' | 'card' | 'inline';
  className?: string;
}

export const AdSpace: React.FC<AdSpaceProps> = ({ 
  variant = 'banner', 
  className = '' 
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleAdClick = () => {
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  if (variant === 'banner') {
    return (
      <>
        <div 
          className={`bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-icon-idle/30 rounded-xl p-4 cursor-pointer hover:from-blue-500/20 hover:to-purple-500/20 transition-all duration-200 ${className}`}
          onClick={handleAdClick}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-text-idle">Put Your Ad Here</h3>
                <p className="text-sm text-text-active">Reach thousands of users</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-icon-active">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">Advertise</span>
            </div>
          </div>
        </div>
        
        <AdDrawer isOpen={isDrawerOpen} onClose={handleCloseDrawer} />
      </>
    );
  }

  if (variant === 'card') {
    return (
      <>
        <div 
          className={`bg-box-bg border border-icon-idle/30 rounded-xl p-6 cursor-pointer hover:border-icon-active/50 hover:shadow-lg transition-all duration-200 ${className}`}
          onClick={handleAdClick}
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Megaphone className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-text-idle mb-2">
              Advertise Your Business
            </h3>
            <p className="text-sm text-text-active mb-4">
              Get your message in front of thousands of active users
            </p>
            <div className="flex items-center justify-center space-x-4 text-sm text-text-active">
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>10K+ Users</span>
              </div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-4 h-4" />
                <span>High Engagement</span>
              </div>
            </div>
          </div>
        </div>
        
        <AdDrawer isOpen={isDrawerOpen} onClose={handleCloseDrawer} />
      </>
    );
  }

  if (variant === 'inline') {
    return (
      <>
        <div 
          className={`inline-flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-icon-idle/30 rounded-lg cursor-pointer hover:from-blue-500/20 hover:to-purple-500/20 transition-all duration-200 ${className}`}
          onClick={handleAdClick}
        >
          <Megaphone className="w-4 h-4 text-icon-active" />
          <span className="text-sm font-medium text-text-idle">
            Put your ad here
          </span>
        </div>
        
        <AdDrawer isOpen={isDrawerOpen} onClose={handleCloseDrawer} />
      </>
    );
  }

  return null;
};
