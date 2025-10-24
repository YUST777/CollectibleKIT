'use client';

import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { 
  DocumentTextIcon, 
  QuestionMarkCircleIcon, 
  ChatBubbleLeftRightIcon 
} from '@heroicons/react/24/outline';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose }) => {
  const menuItems = [
    {
      icon: <DocumentTextIcon className="w-6 h-6" />,
      label: 'Terms of Use',
      href: 'https://telegra.ph/Terms-of-Service-10-20-2',
      external: true
    },
    {
      icon: <QuestionMarkCircleIcon className="w-6 h-6" />,
      label: 'Support',
      href: 'https://t.me/The01Studio_Support',
      external: true
    },
    {
      icon: <ChatBubbleLeftRightIcon className="w-6 h-6" />,
      label: 'Join our Channel',
      href: 'https://t.me/The01Studio',
      external: true
    }
  ];

  const handleItemClick = (href: string, external: boolean) => {
    if (external) {
      window.open(href, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = href;
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      
      {/* Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-80 bg-gray-900 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors duration-200"
          >
            <XMarkIcon className="w-6 h-6 text-gray-300" />
          </button>
        </div>
        
        {/* Menu Items */}
        <div className="p-4">
          {menuItems.map((item, index) => (
            <div key={index}>
              <button
                onClick={() => handleItemClick(item.href, item.external)}
                className="w-full flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-800 transition-colors duration-200 group"
              >
                <div className="text-gray-300 group-hover:text-white transition-colors duration-200">
                  {item.icon}
                </div>
                <span className="text-gray-300 group-hover:text-white transition-colors duration-200 font-medium">
                  {item.label}
                </span>
              </button>
              {index < menuItems.length - 1 && (
                <div className="border-t border-gray-700 my-2" />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
