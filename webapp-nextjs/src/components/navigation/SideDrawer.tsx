'use client';

import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface DrawerItem {
  id: string;
  title: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}

interface SideDrawerProps {
  isOpen: boolean;
  title: string;
  items: DrawerItem[];
  onClose: () => void;
}

const SideDrawer: React.FC<SideDrawerProps> = ({ isOpen, title, items, onClose }) => {
  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[86%] max-w-sm bg-bg-main/95 backdrop-blur border-r border-icon-idle/20 shadow-xl transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div 
          className="flex items-center justify-between px-4 pb-4 border-b border-icon-idle/20"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 100px)' }}
        >
          <h2 className="text-xl font-semibold text-text-idle">{title}</h2>
          <button onClick={onClose} className="text-text-idle hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="px-4 py-4 space-y-3">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl border transition-all ${
                item.active
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-black border-amber-400'
                  : 'bg-box-bg text-text-idle border-icon-idle/20 hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span className="text-base font-medium">{item.title}</span>
              </div>
              <span className={`text-sm ${item.active ? 'text-black' : 'text-text-active'}`}>›</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default SideDrawer;


