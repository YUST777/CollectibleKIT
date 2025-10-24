'use client';

import React from 'react';
import { NavButton } from '@/components/ui/NavButton';
import {
  HomeIcon,
  LightBulbIcon,
  GiftIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

interface BottomNavigationProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onTabChange,
}) => {
  const navItems = [
    {
      id: 'story',
      label: 'Story',
      icon: <HomeIcon className="w-6 h-6" />,
    },
    {
      id: 'game',
      label: 'Game',
      icon: <LightBulbIcon className="w-6 h-6" />,
    },
    {
      id: 'collection',
      label: 'Collection',
      icon: <GiftIcon className="w-6 h-6" />,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: <UserIcon className="w-6 h-6" />,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-box-bg border-t border-icon-idle/30 shadow-tg">
      <div className="flex justify-around items-center py-2">
        {navItems.map((item) => (
          <NavButton
            key={item.id}
            isActive={currentTab === item.id}
            onClick={() => onTabChange(item.id)}
            icon={item.icon}
            label={item.label}
          />
        ))}
      </div>
    </nav>
  );
};
