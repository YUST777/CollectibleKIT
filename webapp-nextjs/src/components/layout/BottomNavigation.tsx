'use client';

import React from 'react';
import { NavButton } from '@/components/ui/NavButton';

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
      icon: (
        <div className="w-6 h-6 flex items-center justify-center">
          <div className="text-red-500 font-bold text-xs">🏠</div>
        </div>
      ),
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: null, // No icon for tasks - it's an inner tab
    },
    {
      id: 'game',
      label: 'Game',
      icon: (
        <div className="w-6 h-6 flex items-center justify-center">
          <div className="text-red-500 font-bold text-xs">🎮</div>
        </div>
      ),
    },
    {
      id: 'collection',
      label: 'Collection',
      icon: (
        <div className="w-6 h-6 flex items-center justify-center">
          <div className="text-red-500 font-bold text-xs">📦</div>
        </div>
      ),
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: (
        <div className="w-6 h-6 flex items-center justify-center">
          <div className="text-red-500 font-bold text-xs">👤</div>
        </div>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-box-bg border-t border-icon-idle/30 shadow-tg md:max-w-2xl md:mx-auto md:left-1/2 md:-translate-x-1/2 md:rounded-t-2xl">
      <div className="flex justify-around items-center py-2 px-2">
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
