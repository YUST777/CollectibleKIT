'use client';

import React, { useEffect } from 'react';
import { 
  useCurrentTab, 
  useAppActions, 
  useModal, 
  useNavigationLevel, 
  useCurrentSubTab, 
  useCurrentTertiaryTab 
} from '@/store/useAppStore';
import { Header } from './layout/Header';
import { DynamicNavigation } from './DynamicNavigation';
import { StoryTab } from './tabs/StoryTab';
import { TasksTab } from './tabs/TasksTab';
import { GameTab } from './tabs/GameTab';
import { CollectionTab } from './tabs/CollectionTab';
import { ProfileTab } from './tabs/ProfileTab';
import { HomeTab } from './tabs/HomeTab';
import { Modal } from './ui/Modal';
import { getTelegramWebApp } from '@/lib/telegram';

export const MainApp: React.FC = () => {
  const currentTab = useCurrentTab();
  const navigationLevel = useNavigationLevel();
  const currentSubTab = useCurrentSubTab();
  const currentTertiaryTab = useCurrentTertiaryTab();
  const { setCurrentTab, setUser, setTonBalance } = useAppActions();
  const { isOpen: isModalOpen, content: modalContent } = useModal();

  useEffect(() => {
    const initializeUser = async () => {
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
            // Set fallback user data first (offline mode)
            const fallbackUser = {
              user_id: telegramUser.id,
              username: telegramUser.username,
              first_name: telegramUser.first_name,
              user_type: 'normal' as const,
              watermark: true,
              credits: 0,
              free_uses: 3,
              can_process: true,
              credits_remaining: 0,
              free_remaining: '3',
              created_at: Date.now(),
              last_activity: Date.now(),
            };
            
            // Set fallback user data immediately
            setUser(fallbackUser);
            
            // Try to initialize with server (non-blocking)
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
              
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
                signal: controller.signal,
              });
              
              clearTimeout(timeoutId);

              if (response.ok) {
                const userData = await response.json();
                console.log('✅ User initialized in database:', userData);
                
                // Update user with server data
                setUser({
                  user_id: telegramUser.id,
                  username: telegramUser.username,
                  first_name: telegramUser.first_name,
                  user_type: userData.user_type || 'normal',
                  watermark: userData.watermark || false,
                  credits: userData.credits || 0,
                  free_uses: userData.free_uses || 0,
                  created_at: userData.created_at || Date.now(),
                  last_activity: userData.last_activity || Date.now(),
                  can_process: userData.can_process !== undefined ? userData.can_process : true,
                  credits_remaining: userData.credits_remaining || 0,
                  free_remaining: userData.free_remaining || '0',
                });
              } else {
                console.warn('⚠️ Server returned error, using offline mode');
              }
            } catch (error) {
              if (error.name === 'AbortError') {
                console.warn('⚠️ User initialization timeout, using offline mode');
              } else {
                console.warn('⚠️ User initialization failed, using offline mode:', error.message);
              }
              // User data is already set to fallback, no need to set again
            }
            
            // Set TON balance
            setTonBalance({
              balance: 0,
              rewards: 0,
              walletConnected: false,
            });
          } else {
            console.warn('⚠️ No Telegram user data available');
          }

          // Set theme parameters as CSS variables (defer to avoid hydration issues)
          setTimeout(() => {
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
          }, 0);

          // Set viewport height (defer to avoid hydration issues)
          setTimeout(() => {
            document.documentElement.style.setProperty('--tg-viewport-height', `${webApp.viewportHeight}px`);
            webApp.onEvent('viewportChanged', () => {
              document.documentElement.style.setProperty('--tg-viewport-height', `${webApp.viewportHeight}px`);
            });
          }, 0);
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
            free_uses: 999,
            can_process: true,
            credits_remaining: 100,
            free_remaining: '999',
            created_at: Date.now(),
            last_activity: Date.now(),
          });
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    initializeUser();
  }, [setUser, setTonBalance]);

  const renderTabContent = () => {
    // If we're at main level, show either Home or Profile based on currentSubTab
    if (navigationLevel === 'main') {
      if (currentSubTab === 'profile') return <ProfileTab />;
      return <HomeTab />;
    }

    // If we're in tools navigation
    if (navigationLevel === 'tools') {
      switch (currentSubTab) {
        case 'story':
          return <StoryTab />;
        case 'collection':
          return <CollectionTab />;
        case 'tasks':
          return <TasksTab />;
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

  return (
    <div className="min-h-screen bg-bg-main text-text-idle safe-area-top">
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <main className="pb-20">
        <div className="max-w-md mx-auto px-4">
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
    </div>
  );
};