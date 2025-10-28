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
  useAppActions 
} from '@/store/useAppStore';
import { HomeIcon } from '@heroicons/react/24/outline';

export const DynamicNavigation: React.FC = () => {
  const navigationLevel = useNavigationLevel();
  const currentSubTab = useCurrentSubTab();
  const currentTertiaryTab = useCurrentTertiaryTab();
  const { 
    setNavigationLevel, 
    setCurrentSubTab, 
    setCurrentTertiaryTab, 
    navigateBack 
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
      return;
    }
    if (tab === 'profile') {
      setNavigationLevel('main');
      setCurrentSubTab('profile');
      setCurrentTertiaryTab(null);
      return;
    }

    // Tools and Games go to secondary level with sensible defaults
    setNavigationLevel(tab as 'tools' | 'games');
    if (tab === 'tools') {
      setCurrentSubTab('collection');
      setCurrentTertiaryTab('creation');
    } else if (tab === 'games') {
      setCurrentSubTab('zoom');
      setCurrentTertiaryTab(null);
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

  // Main navigation (Tools | Games | Profile)
  if (navigationLevel === 'main') {
    return (
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-700 px-4 py-3 transition-all duration-300 ease-in-out pb-12" style={{ backgroundColor: '#252525' }}>
        <div className="flex justify-around">
          <button
            onClick={() => handleMainTabClick('home')}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ease-in-out hover:scale-105 ${
              currentSubTab === 'home' ? 'text-white' : 'text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            <img 
              src="/icons/home.svg" 
              alt="Home" 
              className="w-6 h-6"
              style={{ filter: currentSubTab === 'home' ? 'brightness(0) invert(1)' : 'brightness(0) invert(0.6)' }}
            />
            <span className="text-xs text-gray-300 transition-colors duration-200">Home</span>
          </button>
          <button
            onClick={() => handleMainTabClick('tools')}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ease-in-out hover:scale-105 ${
              currentSubTab === 'tools' ? 'text-white' : 'text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            <img 
              src="/icons/tools.svg" 
              alt="Tools" 
              className="w-6 h-6"
              style={{ filter: currentSubTab === 'tools' ? 'brightness(0) invert(1)' : 'brightness(0) invert(0.6)' }}
            />
            <span className="text-xs text-gray-300 transition-colors duration-200">Tools</span>
          </button>
          <button
            onClick={() => handleMainTabClick('games')}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ease-in-out hover:scale-105 ${
              currentSubTab === 'games' ? 'text-white' : 'text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            <img 
              src="/icons/games.svg" 
              alt="Games" 
              className="w-6 h-6"
              style={{ filter: currentSubTab === 'games' ? 'brightness(0) invert(1)' : 'brightness(0) invert(0.6)' }}
            />
            <span className="text-xs text-gray-300 transition-colors duration-200">Games</span>
          </button>
          <button
            onClick={() => handleMainTabClick('profile')}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ease-in-out hover:scale-105 ${
              currentSubTab === 'profile' ? 'text-white' : 'text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            <img 
              src="/icons/profile.svg" 
              alt="Profile" 
              className="w-6 h-6"
              style={{ filter: currentSubTab === 'profile' ? 'brightness(0) invert(1)' : 'brightness(0) invert(0.6)' }}
            />
            <span className="text-xs text-gray-300 transition-colors duration-200">Profile</span>
          </button>
        </div>
      </div>
    );
  }

  // Tools sub-navigation (Story | Collection | ← Back)
  if (navigationLevel === 'tools') {
    return (
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-700 px-4 py-3 transition-all duration-300 ease-in-out pb-12" style={{ backgroundColor: '#252525' }}>
        <div className="flex justify-around">
          <button
            onClick={() => handleSubTabClick('story')}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ease-in-out ${
              currentSubTab === 'story' ? 'text-white' : 'hover:bg-gray-800/50 hover:scale-105 text-gray-300'
            }`}
          >
            <img 
              src="/icons/cuttertool.svg" 
              alt="Story" 
              className="w-6 h-6"
              style={{ filter: currentSubTab === 'story' ? 'brightness(0) invert(1)' : 'brightness(0) invert(0.6)' }}
            />
            <span className="text-xs text-gray-300 transition-colors duration-200">Story</span>
          </button>
          <button
            onClick={() => handleSubTabClick('collection')}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ease-in-out ${
              currentSubTab === 'collection' ? 'text-white' : 'hover:bg-gray-800/50 hover:scale-105 text-gray-300'
            }`}
          >
            <img 
              src="/icons/collectiontool.svg" 
              alt="Collection" 
              className="w-6 h-6"
              style={{ filter: currentSubTab === 'collection' ? 'brightness(0) invert(1)' : 'brightness(0) invert(0.6)' }}
            />
            <span className="text-xs text-gray-300 transition-colors duration-200">Collection</span>
          </button>
          <button
            onClick={navigateBack}
            className="flex flex-col items-center space-y-1 px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-all duration-200 ease-in-out hover:scale-105"
          >
            <img 
              src="/icons/back.svg" 
              alt="Back" 
              className="w-6 h-6"
              style={{ filter: 'brightness(0) invert(0.6)' }}
            />
            <span className="text-xs text-gray-300 transition-colors duration-200">Back</span>
          </button>
        </div>
      </div>
    );
  }

  // Games sub-navigation (Zoom | Emoji | Feed | ← Back)
  if (navigationLevel === 'games') {
    return (
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-700 px-4 py-3 transition-all duration-300 ease-in-out pb-12" style={{ backgroundColor: '#252525' }}>
        <div className="flex justify-around">
          <button
            onClick={() => handleSubTabClick('zoom')}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ease-in-out ${
              currentSubTab === 'zoom' ? 'text-white' : 'hover:bg-gray-800/50 hover:scale-105 text-gray-300'
            }`}
          >
            <img 
              src="/icons/zoomgame.svg" 
              alt="Zoom" 
              className="w-6 h-6"
              style={{ filter: currentSubTab === 'zoom' ? 'brightness(0) invert(1)' : 'brightness(0) invert(0.6)' }}
            />
            <span className="text-xs text-gray-300 transition-colors duration-200">Zoom</span>
          </button>
          <button
            onClick={() => handleSubTabClick('emoji')}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ease-in-out ${
              currentSubTab === 'emoji' ? 'text-white' : 'hover:bg-gray-800/50 hover:scale-105 text-gray-300'
            }`}
          >
            <img 
              src="/icons/emojigame.svg" 
              alt="Emoji" 
              className="w-6 h-6"
              style={{ filter: currentSubTab === 'emoji' ? 'brightness(0) invert(1)' : 'brightness(0) invert(0.6)' }}
            />
            <span className="text-xs text-gray-300 transition-colors duration-200">Emoji</span>
          </button>
          <button
            onClick={() => handleSubTabClick('feed')}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ease-in-out ${
              currentSubTab === 'feed' ? 'text-white' : 'hover:bg-gray-800/50 hover:scale-105 text-gray-300'
            }`}
          >
            <img 
              src="/icons/feed.svg" 
              alt="Feed" 
              className="w-6 h-6"
              style={{ filter: currentSubTab === 'feed' ? 'brightness(0) invert(1)' : 'brightness(0) invert(0.6)' }}
            />
            <span className="text-xs text-gray-300 transition-colors duration-200">Feed</span>
          </button>
          <button
            onClick={navigateBack}
            className="flex flex-col items-center space-y-1 px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-all duration-200 ease-in-out hover:scale-105"
          >
            <img 
              src="/icons/back.svg" 
              alt="Back" 
              className="w-6 h-6"
              style={{ filter: 'brightness(0) invert(0.6)' }}
            />
            <span className="text-xs text-gray-300 transition-colors duration-200">Back</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
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
