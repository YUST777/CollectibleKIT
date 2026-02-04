'use client';

import React from 'react';
import { TabProps } from '@/types';

export const NavButton: React.FC<TabProps> = ({
  isActive,
  onClick,
  icon,
  label,
  badge,
}) => {
  return (
    <button
      className={`tg-nav-button ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      {icon && (
      <div className="flex items-center justify-center mb-1">
        {icon}
        {badge && badge > 0 && (
          <span className="absolute -top-1 -right-1 bg-icon-active text-icon-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      )}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
};
