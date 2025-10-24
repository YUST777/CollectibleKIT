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
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-700 px-4 py-3 transition-all duration-300 ease-in-out" style={{ backgroundColor: '#252525' }}>
        <div className="flex justify-around">
          <button
            onClick={() => handleMainTabClick('home')}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-all duration-200 ease-in-out hover:scale-105 ${
              currentSubTab === 'home' ? 'border-t-2 border-white' : ''
            }`}
          >
            <HomeIcon className="w-6 h-6 text-gray-300 transition-colors duration-200" />
            <span className="text-xs text-gray-300 transition-colors duration-200">Home</span>
          </button>
          <button
            onClick={() => handleMainTabClick('tools')}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-all duration-200 ease-in-out hover:scale-105 ${
              currentSubTab === 'tools' ? 'border-t-2 border-white' : ''
            }`}
          >
            <WrenchScrewdriverIcon className="w-6 h-6 text-gray-300 transition-colors duration-200" />
            <span className="text-xs text-gray-300 transition-colors duration-200">Tools</span>
          </button>
          <button
            onClick={() => handleMainTabClick('games')}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-all duration-200 ease-in-out hover:scale-105 ${
              currentSubTab === 'games' ? 'border-t-2 border-white' : ''
            }`}
          >
            <PuzzlePieceIcon className="w-6 h-6 text-gray-300 transition-colors duration-200" />
            <span className="text-xs text-gray-300 transition-colors duration-200">Games</span>
          </button>
          <button
            onClick={() => handleMainTabClick('profile')}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-all duration-200 ease-in-out hover:scale-105 ${
              currentSubTab === 'profile' ? 'border-t-2 border-white' : ''
            }`}
          >
            <UserIcon className="w-6 h-6 text-gray-300 transition-colors duration-200" />
            <span className="text-xs text-gray-300 transition-colors duration-200">Profile</span>
          </button>
        </div>
      </div>
    );
  }

  // Tools sub-navigation (Story | Collection | ← Back)
  if (navigationLevel === 'tools') {
    return (
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-700 px-4 py-3 transition-all duration-300 ease-in-out" style={{ backgroundColor: '#252525' }}>
        <div className="flex justify-around">
          <button
            onClick={() => handleSubTabClick('story')}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ease-in-out ${
              currentSubTab === 'story' ? 'border-t-2 border-white' : 'hover:bg-gray-800/50 hover:scale-105'
            }`}
          >
            <PhotoIcon className="w-6 h-6 text-gray-300 transition-colors duration-200" />
            <span className="text-xs text-gray-300 transition-colors duration-200">Story</span>
          </button>
          <button
            onClick={() => handleSubTabClick('collection')}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ease-in-out ${
              currentSubTab === 'collection' ? 'border-t-2 border-white' : 'hover:bg-gray-800/50 hover:scale-105'
            }`}
          >
            <GiftIcon className="w-6 h-6 text-gray-300 transition-colors duration-200" />
            <span className="text-xs text-gray-300 transition-colors duration-200">Collection</span>
          </button>
          <button
            onClick={navigateBack}
            className="flex flex-col items-center space-y-1 px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-all duration-200 ease-in-out hover:scale-105"
          >
            <ArrowLeftIcon className="w-6 h-6 text-gray-300 transition-colors duration-200" />
            <span className="text-xs text-gray-300 transition-colors duration-200">Back</span>
          </button>
        </div>
      </div>
    );
  }

  // Games sub-navigation (Zoom | Emoji | ← Back)
  if (navigationLevel === 'games') {
    return (
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-700 px-4 py-3 transition-all duration-300 ease-in-out" style={{ backgroundColor: '#252525' }}>
        <div className="flex justify-around">
          <button
            onClick={() => handleSubTabClick('zoom')}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ease-in-out ${
              currentSubTab === 'zoom' ? 'border-t-2 border-white' : 'hover:bg-gray-800/50 hover:scale-105'
            }`}
          >
            <MagnifyingGlassPlusIcon className="w-6 h-6 text-gray-300 transition-colors duration-200" />
            <span className="text-xs text-gray-300 transition-colors duration-200">Zoom</span>
          </button>
          <button
            onClick={() => handleSubTabClick('emoji')}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ease-in-out ${
              currentSubTab === 'emoji' ? 'border-t-2 border-white' : 'hover:bg-gray-800/50 hover:scale-105'
            }`}
          >
            <FaceSmileIcon className="w-6 h-6 text-gray-300 transition-colors duration-200" />
            <span className="text-xs text-gray-300 transition-colors duration-200">Emoji</span>
          </button>
          <button
            onClick={navigateBack}
            className="flex flex-col items-center space-y-1 px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-all duration-200 ease-in-out hover:scale-105"
          >
            <ArrowLeftIcon className="w-6 h-6 text-gray-300 transition-colors duration-200" />
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
