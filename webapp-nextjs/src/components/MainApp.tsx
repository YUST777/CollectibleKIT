'use client';

import React, { useEffect, useState } from 'react';
import { 
  useCurrentTab, 
  useAppActions, 
  useModal, 
  useNavigationLevel, 
  useCurrentSubTab, 
  useCurrentTertiaryTab,
  useAppStore
} from '@/store/useAppStore';
import { Header } from './layout/Header';
import { DynamicNavigation } from './DynamicNavigation';
import ToolDrawer from './navigation/ToolDrawer';
import GameDrawer from './navigation/GameDrawer';
import DrawerHandle from './navigation/DrawerHandle';
import { StoryTab } from './tabs/StoryTab';
import { GameTab } from './tabs/GameTab';
import { CollectionTab } from './tabs/CollectionTab';
import { ProfileTab } from './tabs/ProfileTab';
import { HomeTab } from './tabs/HomeTab';
import { PortfolioTab } from './tabs/PortfolioTab';
import { Modal } from './ui/Modal';
import { Drawer } from './ui/Drawer';
import { getTelegramWebApp } from '@/lib/telegram';
import OnboardingTrailer from './OnboardingTrailer';

export const MainApp: React.FC = () => {
  const [showTrailer, setShowTrailer] = useState(false);
  const currentTab = useCurrentTab();
  const navigationLevel = useNavigationLevel();
  const currentSubTab = useCurrentSubTab();
  const currentTertiaryTab = useCurrentTertiaryTab();
  const { setCurrentTab, setUser, setTonBalance } = useAppActions();
  const { isOpen: isModalOpen, content: modalContent } = useModal();
  const { isOpen: isDrawerOpen, openDrawer, closeDrawer } = useAppStore(state => ({
    isOpen: state.isDrawerOpen,
    openDrawer: state.openDrawer,
    closeDrawer: state.closeDrawer
  }));

  useEffect(() => {
    let isInitialized = false;
    
    const initializeUser = async () => {
      // Prevent multiple initializations
      if (isInitialized) {
        console.log('⚠️ User initialization already in progress, skipping');
        return;
      }
      isInitialized = true;
      
      // Add timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        console.log('⚠️ User initialization timeout - using fallback');
      }, 5000);
      
      try {
        const webApp = getTelegramWebApp();
        console.log('Initializing user from Telegram WebApp');
        console.log('WebApp:', webApp);
        
        if (webApp) {
          // Set Telegram WebApp ready
          webApp.ready();
          
          // Get user data from Telegram
          const telegramUser = webApp.initDataUnsafe.user;
          console.log('📱 Telegram user data:', telegramUser);
          
          if (telegramUser) {
            // Create or update user in database via API
            try {
              const response = await fetch('/api/user/init', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  user_id: telegramUser.id,
                  username: telegramUser.username,
                  first_name: telegramUser.first_name,
                  last_name: telegramUser.last_name,
                  language_code: telegramUser.language_code,
                  is_premium: telegramUser.is_premium,
                  photo_url: telegramUser.photo_url,
                  start_param: (webApp.initDataUnsafe as any).start_param || '',
                }),
              });

              if (response.ok) {
                const userData = await response.json();
                console.log('✅ User initialized in database:', userData);
                
                // Set user in app store
                setUser({
                  user_id: telegramUser.id,
                  username: telegramUser.username,
                  first_name: telegramUser.first_name,
                  user_type: userData.user_type || 'normal',
                  watermark: userData.watermark || false,
                  credits: userData.credits || 0,
                  created_at: userData.created_at || Date.now(),
                  last_activity: userData.last_activity || Date.now(),
                  can_process: userData.can_process !== undefined ? userData.can_process : true,
                  credits_remaining: userData.credits_remaining || 0,
                });

                // Set TON balance
                setTonBalance({
                  balance: 0,
                  rewards: 0,
                  walletConnected: false,
                });
              } else {
                console.error('Failed to initialize user in database');
                // Fallback: set basic user data
                setUser({
                  user_id: telegramUser.id,
                  username: telegramUser.username,
                  first_name: telegramUser.first_name,
                  user_type: 'normal',
                  watermark: true,
                  credits: 0,
                  can_process: true,
                  credits_remaining: 0,
                  created_at: Date.now(),
                  last_activity: Date.now(),
                });
              }
            } catch (error) {
              console.error('Error initializing user:', error);
              // Fallback: set basic user data
              setUser({
                user_id: telegramUser.id,
                username: telegramUser.username,
                first_name: telegramUser.first_name,
                user_type: 'normal',
                watermark: true,
                credits: 0,
                can_process: true,
                credits_remaining: 0,
                created_at: Date.now(),
                last_activity: Date.now(),
              });
            }
          } else {
            console.warn('⚠️ No Telegram user data available');
          }

          // Set theme parameters as CSS variables
          const themeParams = webApp.themeParams;
          if (themeParams) {
            document.documentElement.style.setProperty('--tg-theme-bg-color', themeParams.bg_color || '#141414');
            document.documentElement.style.setProperty('--tg-theme-text-color', themeParams.text_color || '#6d6d71');
            document.documentElement.style.setProperty('--tg-theme-hint-color', themeParams.hint_color || '#7b7b7a');
            document.documentElement.style.setProperty('--tg-theme-link-color', themeParams.link_color || '#1689ff');
            document.documentElement.style.setProperty('--tg-theme-button-color', themeParams.button_color || '#1689ff');
            document.documentElement.style.setProperty('--tg-theme-button-text-color', themeParams.button_text_color || '#ffffff');
            document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', themeParams.secondary_bg_color || '#282727');
            document.documentElement.style.setProperty('--tg-theme-header-bg-color', themeParams.header_bg_color || themeParams.bg_color || '#141414');
            document.documentElement.style.setProperty('--tg-theme-accent-text-color', themeParams.accent_text_color || '#1689ff');
            document.documentElement.style.setProperty('--tg-theme-section-bg-color', themeParams.section_bg_color || themeParams.secondary_bg_color || '#282727');
            document.documentElement.style.setProperty('--tg-theme-section-header-text-color', themeParams.section_header_text_color || themeParams.link_color || '#1689ff');
            document.documentElement.style.setProperty('--tg-theme-subtitle-text-color', themeParams.subtitle_text_color || themeParams.hint_color || '#a9a9a9');
            document.documentElement.style.setProperty('--tg-theme-destructive-text-color', themeParams.destructive_text_color || '#ff3b30');
          }

          // Set viewport height
          document.documentElement.style.setProperty('--tg-viewport-height', `${webApp.viewportHeight}px`);
          webApp.onEvent('viewportChanged', () => {
            document.documentElement.style.setProperty('--tg-viewport-height', `${webApp.viewportHeight}px`);
          });
        } else {
          console.warn('⚠️ Telegram WebApp not available - running in development mode');
          // Set development user for testing
          setUser({
            user_id: 1234567890,
            username: 'testuser',
            first_name: 'Test',
            user_type: 'test',
            watermark: false,
            credits: 100,
            can_process: true,
            credits_remaining: 100,
            created_at: Date.now(),
            last_activity: Date.now(),
          });
          
          // Also set TON balance for development
          setTonBalance({
            balance: 1000,
            rewards: 0,
            walletConnected: false,
          });
        }
        
        clearTimeout(timeout);
      } catch (error) {
        console.error('Error initializing app:', error);
        clearTimeout(timeout);
      }
    };
    
    // Run initialization
    initializeUser();
  }, [setUser, setTonBalance]);

  // Check if user should see the trailer
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const params = new URLSearchParams(search);
    const forceTrailer = hash.includes('showTrailer') || params.has('showTrailer');

    if (forceTrailer) {
      setShowTrailer(true);
      return;
    }

    const hasSeenTrailer = localStorage.getItem('hasSeenOnboardingTrailer');
    if (!hasSeenTrailer) {
      setShowTrailer(true);
    }
  }, []);

  const renderTabContent = () => {
    // If we're at main level, show either Home or Profile based on currentSubTab
    if (navigationLevel === 'main') {
      if (currentSubTab === 'profile') return <ProfileTab />;
      if (currentSubTab === 'portfolio') return <PortfolioTab />;
      return <HomeTab />;
    }

    // If we're in tools navigation
    if (navigationLevel === 'tools') {
      switch (currentSubTab) {
        case 'story':
          return <StoryTab />;
        case 'collection':
          return <CollectionTab />;
        default:
          return <StoryTab />;
      }
    }

    // If we're in games navigation
    if (navigationLevel === 'games') {
      return <GameTab />;
    }

    // Default fallback
    return <ProfileTab />;
  };

  const handleTrailerComplete = () => {
    localStorage.setItem('hasSeenOnboardingTrailer', 'true');
    setShowTrailer(false);
  };

  // Show trailer if needed
  if (showTrailer) {
    return <OnboardingTrailer onComplete={handleTrailerComplete} />;
  }

  return (
    <div className="min-h-screen bg-bg-main text-text-idle safe-area-top">
      {/* Header */}
      <Header />
      <DrawerHandle />
      
      {/* Main Content */}
      <main className="pb-28 lg:pb-6">
        <div className="max-w-md mx-auto px-4 lg:max-w-full lg:mx-0 lg:px-6">
          <div className="transition-all duration-300 ease-in-out">
            {renderTabContent()}
          </div>
        </div>
      </main>
      
      {/* Dynamic Bottom Navigation */}
      <DynamicNavigation />
      
      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {}}
        title=""
      >
        {modalContent}
      </Modal>
      
      {/* Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
      />

      {/* Side Drawers */}
      <ToolDrawer />
      <GameDrawer />
    </div>
  );
};