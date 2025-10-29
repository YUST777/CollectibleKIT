'use client';

import React from 'react';
import { useAppActions, useAppStore } from '@/store/useAppStore';

const DrawerHandle: React.FC = () => {
  const { lastUsedDrawer, isSideDrawerOpen } = useAppStore(state => ({ 
    lastUsedDrawer: state.lastUsedDrawer || null,
    isSideDrawerOpen: state.isSideDrawerOpen || false,
  }));
  const { openSideDrawer, closeSideDrawer } = useAppActions();

  const onClick = () => {
    if (isSideDrawerOpen) {
      closeSideDrawer();
      return;
    }
    if (lastUsedDrawer) {
      openSideDrawer(lastUsedDrawer);
    } else {
      openSideDrawer('tools');
    }
  };

  return (
    <button
      aria-label="Open drawer"
      onClick={onClick}
      className="fixed right-0 top-[240px] z-50 w-8 h-16 rounded-l-full bg-gradient-to-l from-gray-600/40 to-gray-900/70 border border-icon-idle/30 backdrop-blur text-xs text-text-active"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 240px)' }}
    >
      {/* subtle notch look */}
    </button>
  );
};

export default DrawerHandle;


