import React from 'react';

export const AdsBanner: React.FC = () => {
  return (
    <div className="bg-blue-600 rounded-xl px-4 py-3 mb-3 mx-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-2 right-2 w-12 h-12 bg-white rounded-full"></div>
        <div className="absolute bottom-2 right-8 w-6 h-6 bg-white rounded-full"></div>
      </div>
      
      {/* Content */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-yellow-400 text-xl">⭐</div>
          <div>
            <h3 className="text-white font-bold text-base leading-tight">Add your ad here</h3>
            <p className="text-blue-100 text-xs">Contact us to promote</p>
          </div>
        </div>
        
        <button className="bg-white/90 text-blue-700 px-3 py-1.5 rounded-lg font-medium text-xs hover:bg-white transition-colors">
          Learn more
        </button>
      </div>
      
      {/* Decorative figure (smaller) */}
      <div className="absolute bottom-1 right-3 w-10 h-12 flex flex-col items-center opacity-80">
        <div className="w-7 h-7 bg-gray-700 rounded-full mb-1"></div>
        <div className="w-5 h-6 bg-gray-800 rounded-t-lg"></div>
        <div className="w-7 h-1.5 bg-gray-600 rounded-b-lg"></div>
      </div>
    </div>
  );
};
