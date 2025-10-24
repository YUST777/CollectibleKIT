'use client';

import React from 'react';
import { XMarkIcon, DocumentTextIcon, QuestionMarkCircleIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

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
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300 ease-out">
        <div className="bg-gray-900 rounded-t-2xl shadow-2xl">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-8 h-1 bg-gray-600 rounded-full"></div>
          </div>
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-800 transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          
          {/* Menu Items */}
          <div className="px-6 py-4 space-y-1">
            {/* Terms of Use */}
            <button
              onClick={handleTermsClick}
              className="w-full flex items-center space-x-4 px-4 py-4 rounded-lg hover:bg-gray-800 transition-colors group"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                <DocumentTextIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-white font-medium">Terms of Use</div>
                <div className="text-gray-400 text-sm">Legal information and policies</div>
              </div>
            </button>
            
            {/* Divider */}
            <div className="border-t border-gray-700 my-2"></div>
            
            {/* Support */}
            <button
              onClick={handleSupportClick}
              className="w-full flex items-center space-x-4 px-4 py-4 rounded-lg hover:bg-gray-800 transition-colors group"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                <QuestionMarkCircleIcon className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-white font-medium">Support</div>
                <div className="text-gray-400 text-sm">Get help and assistance</div>
              </div>
            </button>
            
            {/* Divider */}
            <div className="border-t border-gray-700 my-2"></div>
            
            {/* Join our Channel */}
            <button
              onClick={handleChannelClick}
              className="w-full flex items-center space-x-4 px-4 py-4 rounded-lg hover:bg-gray-800 transition-colors group"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                <ChatBubbleLeftRightIcon className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-white font-medium">Join our Channel</div>
                <div className="text-gray-400 text-sm">Stay updated with latest news</div>
              </div>
            </button>
          </div>
          
          {/* Bottom padding for safe area */}
          <div className="pb-6"></div>
        </div>
      </div>
    </>
  );
};
