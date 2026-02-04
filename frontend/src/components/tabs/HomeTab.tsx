'use client';

import React from 'react';
import Image from 'next/image';
import { useAppActions, useUser, useAppStore } from '@/store/useAppStore';
import { useTelegram } from '@/components/providers/TelegramProvider';
import { hapticFeedback } from '@/lib/telegram';
import { Button } from '@/components/ui/Button';
import { 
  CameraIcon, 
  PhotoIcon, 
  GiftIcon, 
  PuzzlePieceIcon 
} from '@heroicons/react/24/outline';

export const HomeTab: React.FC = () => {
  const user = useUser();
  const { webApp, user: telegramUser } = useTelegram();
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
    image?: string;
  }> = ({ title, subtitle, icon, onClick, gradient, cta, size = 'small', image }) => {
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
        
        {/* Image on the right side if provided */}
        {image && (
          <div className={`absolute ${size === 'small' ? 'right-[5px] bottom-0 h-[60%]' : 'right-0 bottom-0 h-full'} flex items-end`}>
            <Image
              src={image}
              alt={title}
              width={size === 'small' ? 60 : 120}
              height={size === 'small' ? 60 : 120}
              className="h-full w-auto object-contain"
              priority
            />
          </div>
        )}
        
        <div className={`flex ${getLayoutClasses()} relative z-10 h-full`}>
          <div>
            <div className={`text-white font-semibold ${getTextSize()} leading-tight`}>{title}</div>
            {subtitle && (
              <div className={`text-white/80 ${size === 'small' ? 'text-[10px]' : 'text-xs'} mt-0.5 leading-tight`}>{subtitle}</div>
            )}
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
    <div className="space-y-4 py-4 pt-12 animate-fade-in">

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
            subtitle="What is this gift photo?"
            icon={<PuzzlePieceIcon className="w-4 h-4 text-white" />} 
            onClick={goZoom} 
            gradient="bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700" 
            cta="Play"
            size="small"
            image="/zoom-box.png"
          />
          <Widget 
            title="Emoji Game" 
            subtitle="What gift is that emoji?"
            icon={<PhotoIcon className="w-4 h-4 text-white" />} 
            onClick={goEmoji} 
            gradient="bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600" 
            cta="Play"
            size="small"
            image="/emoji-box.png"
          />
        </div>

        {/* Middle row: 1 large vertical box - Story (Golden) */}
        <Widget 
          title="Create Story" 
          subtitle="Make your profile like @etosirius profile."
          icon={<CameraIcon className="w-8 h-8 text-white" />} 
          onClick={goStory} 
          gradient="bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600" 
          cta="Start Creating"
          size="vertical"
          image="/story-box.png"
        />

        {/* Bottom row: 1 large vertical box - Collection (Black) */}
        <Widget 
          title="Collection" 
          subtitle="Build your dream collection."
          icon={<GiftIcon className="w-8 h-8 text-white" />} 
          onClick={goCollection} 
          gradient="bg-gradient-to-br from-gray-900 via-gray-800 to-black" 
          cta="Open Designer"
          size="vertical"
          image="/collection-box.png"
        />
      </div>
    </div>
  );
};


