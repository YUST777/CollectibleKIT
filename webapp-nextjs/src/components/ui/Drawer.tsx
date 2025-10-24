'use client';

import React from 'react';
import { XMarkIcon, DocumentTextIcon, QuestionMarkCircleIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose }) => {
  const handleTermsClick = () => {
    window.open('https://telegra.ph/Terms-of-Service-10-20-2', '_blank');
    onClose();
  };

  const handleSupportClick = () => {
    window.open('https://t.me/The01Studio_Support', '_blank');
    onClose();
  };

  const handleChannelClick = () => {
    window.open('https://t.me/The01Studio', '_blank');
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
        className={`fixed bottom-0 left-0 right-0 bg-gray-900 z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-8 h-1 bg-gray-500 rounded-full"></div>
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Menu</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        {/* Menu Items */}
        <div className="px-6 py-4">
          {/* Terms of Use */}
          <button
            onClick={handleTermsClick}
            className="w-full flex items-center space-x-4 py-4 border-b border-gray-700 hover:bg-gray-800 transition-colors"
          >
            <DocumentTextIcon className="w-6 h-6 text-white" />
            <span className="text-white text-lg">Terms of Use</span>
          </button>
          
          {/* Support */}
          <button
            onClick={handleSupportClick}
            className="w-full flex items-center space-x-4 py-4 border-b border-gray-700 hover:bg-gray-800 transition-colors"
          >
            <QuestionMarkCircleIcon className="w-6 h-6 text-white" />
            <span className="text-white text-lg">Support</span>
          </button>
          
          {/* Join our Channel */}
          <button
            onClick={handleChannelClick}
            className="w-full flex items-center space-x-4 py-4 hover:bg-gray-800 transition-colors"
          >
            <ChatBubbleLeftRightIcon className="w-6 h-6 text-white" />
            <span className="text-white text-lg">Join our Channel</span>
          </button>
        </div>
      </div>
    </>
  );
};
