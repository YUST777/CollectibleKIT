'use client';

import React from 'react';
import SideDrawer from './SideDrawer';
import { useAppActions, useCurrentSubTab, useNavigationLevel, useAppStore } from '@/store/useAppStore';

const GameDrawer: React.FC = () => {
  const currentSubTab = useCurrentSubTab();
  const navigationLevel = useNavigationLevel();
  const { isSideDrawerOpen, drawerType } = useAppStore(state => ({
    isSideDrawerOpen: state.isSideDrawerOpen || false,
    drawerType: state.drawerType || null
  }));
  const { setNavigationLevel, setCurrentSubTab, setCurrentTertiaryTab, closeSideDrawer, setLastUsedDrawer } = useAppActions();

  const openGame = (tab: 'zoom' | 'emoji' | 'feed') => {
    setNavigationLevel('games');
    setCurrentSubTab(tab);
    setCurrentTertiaryTab(null);
    setLastUsedDrawer('games');
    closeSideDrawer();
  };

  const baseIcon = (src: string, active: boolean) => (
    <img
      src={src}
      alt=""
      className="w-6 h-6"
      style={{ filter: active ? 'brightness(0) invert(1)' : 'brightness(0) invert(0.6)' }}
    />
  );

  const items = [
    { id: 'zoom', title: 'Zoom', iconPath: '/icons/zoomgame.svg', onClick: () => openGame('zoom') },
    { id: 'emoji', title: 'Emoji', iconPath: '/icons/emojigame.svg', onClick: () => openGame('emoji') },
    { id: 'feed', title: 'Feed', iconPath: '/icons/feed.svg', onClick: () => openGame('feed') },
  ].map((i) => {
    const active = navigationLevel === 'games' && currentSubTab === i.id;
    return {
      id: i.id,
      title: i.title,
      active,
      icon: baseIcon(i.iconPath, active),
      onClick: i.onClick,
    };
  });

  return (
    <SideDrawer
      isOpen={isSideDrawerOpen && drawerType === 'games'}
      title="Select Game"
      items={items}
      onClose={() => closeSideDrawer()}
    />
  );
};

export default GameDrawer;


