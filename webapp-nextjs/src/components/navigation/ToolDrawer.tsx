'use client';

import React from 'react';
import SideDrawer from './SideDrawer';
import { useAppActions, useCurrentSubTab, useNavigationLevel, useAppStore } from '@/store/useAppStore';

const ToolDrawer: React.FC = () => {
  const currentSubTab = useCurrentSubTab();
  const navigationLevel = useNavigationLevel();
  const { isSideDrawerOpen, drawerType } = useAppStore(state => ({
    isSideDrawerOpen: state.isSideDrawerOpen || false,
    drawerType: state.drawerType || null
  }));
  const { setNavigationLevel, setCurrentSubTab, setCurrentTertiaryTab, closeSideDrawer, setLastUsedDrawer } = useAppActions();

  const openTool = (tab: 'collection' | 'story' | 'portfolio') => {
    if (tab === 'portfolio') {
      setNavigationLevel('main');
      setCurrentSubTab('portfolio');
    } else {
    setNavigationLevel('tools');
    setCurrentSubTab(tab);
    }
    // sensible tertiary defaults
    if (tab === 'collection') setCurrentTertiaryTab('creation');
    else if (tab === 'story') setCurrentTertiaryTab('making');
    else setCurrentTertiaryTab(null);
    setLastUsedDrawer('tools');
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
    { id: 'collection', title: 'Collection', iconPath: '/icons/collectiontool.svg', onClick: () => openTool('collection') },
    { id: 'story', title: 'Cutter', iconPath: '/icons/cuttertool.svg', onClick: () => openTool('story') },
    { id: 'portfolio', title: 'Portfolio', iconPath: '/icons/portfolio.svg', onClick: () => openTool('portfolio') },
  ].map((i) => {
    const active = (i.id === 'portfolio' && navigationLevel === 'main' && currentSubTab === 'portfolio') || (navigationLevel === 'tools' && currentSubTab === i.id);
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
      isOpen={isSideDrawerOpen && drawerType === 'tools'}
      title="Select Tool"
      items={items}
      onClose={() => closeSideDrawer()}
    />
  );
};

export default ToolDrawer;


