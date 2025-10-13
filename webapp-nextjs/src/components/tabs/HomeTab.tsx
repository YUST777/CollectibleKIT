'use client';

import React from 'react';
import { useAppActions, useUser } from '@/store/useAppStore';
import { Button } from '@/components/ui/Button';
import { 
  CameraIcon, 
  PhotoIcon, 
  GiftIcon, 
  PuzzlePieceIcon 
} from '@heroicons/react/24/outline';

export const HomeTab: React.FC = () => {
  const user = useUser();
  const { setNavigationLevel, setCurrentSubTab, setCurrentTertiaryTab } = useAppActions();

  const goZoom = () => {
    setNavigationLevel('games');
    setCurrentSubTab('zoom');
    setCurrentTertiaryTab(null);
  };

  const goEmoji = () => {
    setNavigationLevel('games');
    setCurrentSubTab('emoji');
    setCurrentTertiaryTab(null);
  };

  const goStory = () => {
    setNavigationLevel('tools');
    setCurrentSubTab('story');
    setCurrentTertiaryTab('making');
  };

  const goCollection = () => {
    setNavigationLevel('tools');
    setCurrentSubTab('collection');
    setCurrentTertiaryTab('creation');
  };

  const Widget: React.FC<{ 
    title: string; 
    subtitle?: string; 
    icon: React.ReactNode; 
    onClick: () => void; 
    gradient: string; 
    cta: string;
    size?: 'small' | 'horizontal' | 'vertical';
  }> = ({ title, subtitle, icon, onClick, gradient, cta, size = 'small' }) => {
    const getSizeClasses = () => {
      switch (size) {
        case 'small':
          return 'h-28'; // Small square
        case 'horizontal':
          return 'h-24'; // Wide horizontal
        case 'vertical':
          return 'h-32'; // Tall vertical
        default:
          return 'h-28';
      }
    };

    const getLayoutClasses = () => {
      switch (size) {
        case 'horizontal':
          return 'flex-row items-center justify-between';
        case 'vertical':
          return 'flex-col items-start justify-between';
        default:
          return 'flex-col items-start justify-between';
      }
    };

    const getIconSize = () => {
      switch (size) {
        case 'small':
          return 'w-6 h-6';
        case 'horizontal':
          return 'w-8 h-8';
        case 'vertical':
          return 'w-10 h-10';
        default:
          return 'w-6 h-6';
      }
    };

    const getTextSize = () => {
      switch (size) {
        case 'small':
          return 'text-sm';
        case 'horizontal':
          return 'text-base';
        case 'vertical':
          return 'text-lg';
        default:
          return 'text-sm';
      }
    };

    return (
      <button
        onClick={onClick}
        className={`relative w-full ${getSizeClasses()} rounded-2xl p-4 text-left overflow-hidden ${gradient} transition-transform active:scale-[0.99]`}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/20 rounded-full" />
          <div className="absolute -right-14 bottom-4 w-16 h-16 bg-white/10 rounded-full" />
        </div>
        <div className={`flex ${getLayoutClasses()} relative z-10 h-full`}>
          <div className="flex items-center gap-3">
            <div className={`${getIconSize()} rounded-lg bg-black/15 flex items-center justify-center text-white`}>
              {icon}
            </div>
            <div>
              <div className={`text-white font-semibold ${getTextSize()} leading-tight`}>{title}</div>
              {subtitle && (
                <div className="text-white/80 text-xs mt-0.5">{subtitle}</div>
              )}
            </div>
          </div>
          <div className={`${size === 'horizontal' ? 'ml-auto' : 'mt-auto'}`}>
            <span className="inline-flex items-center bg-white/90 text-gray-900 text-xs font-medium px-3 py-1 rounded-lg">
              {cta}
            </span>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4 py-4 animate-fade-in">
      {/* Greeting / status */}
      <div className="px-4">
        <h2 className="text-lg font-semibold text-text-idle">
          {user?.first_name ? `Hey, ${user.first_name}` : 'Welcome back'}
        </h2>
        <p className="text-xs text-text-active mt-1">Jump into anything below.</p>
      </div>

      <div className="px-4 space-y-3">
        {/* Top row: 2 small squares */}
        <div className="grid grid-cols-2 gap-3">
          <Widget 
            title="Zoom Game" 
            subtitle="Daily"
            icon={<PuzzlePieceIcon className="w-4 h-4 text-white" />} 
            onClick={goZoom} 
            gradient="bg-gradient-to-br from-purple-600 to-blue-600" 
            cta="Play"
            size="small"
          />
          <Widget 
            title="Emoji Game" 
            subtitle="Hints"
            icon={<PhotoIcon className="w-4 h-4 text-white" />} 
            onClick={goEmoji} 
            gradient="bg-gradient-to-br from-fuchsia-600 to-purple-600" 
            cta="Play"
            size="small"
          />
        </div>

        {/* Middle row: 1 large horizontal box */}
        <Widget 
          title="Create Story" 
          subtitle="Cut your photo into 12 pieces and share them"
          icon={<CameraIcon className="w-6 h-6 text-white" />} 
          onClick={goStory} 
          gradient="bg-gradient-to-br from-sky-600 to-cyan-600" 
          cta="Start Creating"
          size="horizontal"
        />

        {/* Bottom row: 1 large vertical box */}
        <Widget 
          title="Collection" 
          subtitle="Design & share"
          icon={<GiftIcon className="w-8 h-8 text-white" />} 
          onClick={goCollection} 
          gradient="bg-gradient-to-br from-emerald-600 to-teal-600" 
          cta="Open Designer"
          size="vertical"
        />
      </div>
    </div>
  );
};


