'use client';

import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        
        {/* Text */}
        <p className="text-gray-400 text-sm font-medium">Loading...</p>
      </div>
    </div>
  );
};
