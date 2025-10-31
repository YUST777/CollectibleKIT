import React from 'react';
import {
  WrenchScrewdriverIcon,
  PuzzlePieceIcon,
  UserIcon,
  PhotoIcon,
  GiftIcon,
  ClipboardDocumentListIcon,
  ArrowLeftIcon,
  MagnifyingGlassPlusIcon,
  FaceSmileIcon,
  RssIcon,
} from '@heroicons/react/24/outline';
import { 
  useNavigationLevel, 
  useCurrentSubTab, 
  useCurrentTertiaryTab,
  useAppActions,
  useAppStore
} from '@/store/useAppStore';
import { HomeIcon } from '@heroicons/react/24/outline';

export const DynamicNavigation: React.FC = () => {
  const navigationLevel = useNavigationLevel();
  const currentSubTab = useCurrentSubTab();
  const currentTertiaryTab = useCurrentTertiaryTab();
  const { isSideDrawerOpen, drawerType } = useAppStore(state => ({
    isSideDrawerOpen: state.isSideDrawerOpen || false,
    drawerType: state.drawerType || null
  }));
  const { 
    setNavigationLevel, 
    setCurrentSubTab, 
    setCurrentTertiaryTab, 
    navigateBack,
    openSideDrawer,
    closeSideDrawer,
    setLastUsedDrawer
  } = useAppActions();

  // Preload all SVG icons to prevent loading delays
  React.useEffect(() => {
    const iconUrls = [
      '/icons/home.svg',
      '/icons/tools.svg', 
      '/icons/games.svg',
      '/icons/profile.svg',
      '/icons/cuttertool.svg',
      '/icons/collectiontool.svg',
      '/icons/zoomgame.svg',
      '/icons/emojigame.svg',
      '/icons/feed.svg',
      '/icons/back.svg'
    ];
    
    iconUrls.forEach(url => {
      const img = new Image();
      img.src = url;
    });
  }, []);

  const handleMainTabClick = (tab: 'home' | 'tools' | 'games' | 'profile') => {
    if (tab === 'home') {
      setNavigationLevel('main');
      setCurrentSubTab('home');
      setCurrentTertiaryTab(null);
      setLastUsedDrawer(null);
      return;
    }
    if (tab === 'profile') {
      setNavigationLevel('main');
      setCurrentSubTab('profile');
      setCurrentTertiaryTab(null);
      setLastUsedDrawer(null);
      return;
    }

    // Tools and Games behavior: first click opens default content, subsequent clicks toggle the side drawer
    if (tab === 'tools') {
      if (navigationLevel === 'tools') {
        // Toggle: if drawer is open and it's the tools drawer, close it; otherwise open it
        if (isSideDrawerOpen && drawerType === 'tools') {
          closeSideDrawer();
        } else {
          openSideDrawer('tools');
        }
      } else {
        setNavigationLevel('tools');
        setCurrentSubTab('collection');
        setCurrentTertiaryTab('creation');
        setLastUsedDrawer('tools');
      }
      return;
    }

    if (tab === 'games') {
      if (navigationLevel === 'games') {
        // Toggle: if drawer is open and it's the games drawer, close it; otherwise open it
        if (isSideDrawerOpen && drawerType === 'games') {
          closeSideDrawer();
        } else {
          openSideDrawer('games');
        }
      } else {
        setNavigationLevel('games');
        setCurrentSubTab('zoom');
        setCurrentTertiaryTab(null);
        setLastUsedDrawer('games');
      }
      return;
    }
  };

  const handleSubTabClick = (tab: string) => {
    setCurrentSubTab(tab);

    // If it's a tab with tertiary options, set sensible defaults
    if (tab === 'story') {
      setCurrentTertiaryTab('making');
    } else if (tab === 'collection') {
      setCurrentTertiaryTab('creation');
    } else {
      setCurrentTertiaryTab(null);
    }
  };

  const handleTertiaryTabClick = (tab: string) => {
    setCurrentTertiaryTab(tab);
  };

  // Single main navigation bar always rendered
  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-gray-700 px-4 py-3 transition-all duration-300 ease-in-out pb-12 z-[60]" style={{ backgroundColor: '#252525' }}>
      <div className="flex justify-around">
        <button
          onClick={() => handleMainTabClick('home')}
          className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ease-in-out hover:scale-105 ${
            navigationLevel === 'main' && currentSubTab === 'home' ? 'text-white' : 'text-gray-300 hover:bg-gray-800/50'
          }`}
        >
          <img 
            src="/icons/home.svg" 
            alt="Home" 
            className="w-6 h-6"
            style={{ filter: navigationLevel === 'main' && currentSubTab === 'home' ? 'brightness(0) invert(1)' : 'brightness(0) invert(0.6)' }}
          />
          <span className="text-xs text-gray-300 transition-colors duration-200">Home</span>
        </button>
        <button
          onClick={() => handleMainTabClick('tools')}
          className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ease-in-out hover:scale-105 ${
            navigationLevel === 'tools' ? 'text-white' : 'text-gray-300 hover:bg-gray-800/50'
          }`}
        >
          <img 
            src="/icons/tools.svg" 
            alt="Tools" 
            className="w-6 h-6"
            style={{ filter: navigationLevel === 'tools' ? 'brightness(0) invert(1)' : 'brightness(0) invert(0.6)' }}
          />
          <span className="text-xs text-gray-300 transition-colors duration-200">Tools</span>
        </button>
        <button
          onClick={() => handleMainTabClick('games')}
          className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ease-in-out hover:scale-105 ${
            navigationLevel === 'games' ? 'text-white' : 'text-gray-300 hover:bg-gray-800/50'
          }`}
        >
          <img 
            src="/icons/games.svg" 
            alt="Games" 
            className="w-6 h-6"
            style={{ filter: navigationLevel === 'games' ? 'brightness(0) invert(1)' : 'brightness(0) invert(0.6)' }}
          />
          <span className="text-xs text-gray-300 transition-colors duration-200">Games</span>
        </button>
        <button
          onClick={() => handleMainTabClick('profile')}
          className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ease-in-out hover:scale-105 ${
            navigationLevel === 'main' && currentSubTab === 'profile' ? 'text-white' : 'text-gray-300 hover:bg-gray-800/50'
          }`}
        >
          <img 
            src="/icons/profile.svg" 
            alt="Profile" 
            className="w-6 h-6"
            style={{ filter: navigationLevel === 'main' && currentSubTab === 'profile' ? 'brightness(0) invert(1)' : 'brightness(0) invert(0.6)' }}
          />
          <span className="text-xs text-gray-300 transition-colors duration-200">Profile</span>
        </button>
      </div>
    </div>
  );
};

// Tertiary navigation component (for under ads banner)
export const TertiaryNavigation: React.FC = () => {
  const currentSubTab = useCurrentSubTab();
  const currentTertiaryTab = useCurrentTertiaryTab();
  const { setCurrentTertiaryTab } = useAppActions();

  // Show tertiary navigation only for story and collection
  if (currentSubTab !== 'story' && currentSubTab !== 'collection') {
    return null;
  }

  const tabs = currentSubTab === 'story' 
    ? ['making', 'ideas'] 
    : ['creation', 'ideas'];

  return (
    <div className="flex justify-start px-4 mb-4">
      <div className="flex space-x-8">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => setCurrentTertiaryTab(tab)}
          className={`text-lg font-medium transition-all duration-200 ease-in-out capitalize ${
            currentTertiaryTab === tab
              ? 'text-white border-b-2 border-white pb-1 scale-105'
              : 'text-gray-400 hover:text-gray-300 hover:scale-105'
          }`}
        >
          {tab}
        </button>
      ))}
      </div>
    </div>
  );
};
