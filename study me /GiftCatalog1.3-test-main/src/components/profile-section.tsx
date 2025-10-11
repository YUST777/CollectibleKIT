import { useAppState } from '@/lib/state'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useEffect, useState, useRef } from 'react'
import { useLanguage } from './app-provider'
import { translations } from '@/lib/translations'
import { ChevronRight, Minus, Users, Award, Star, Settings, Globe, Trophy, HelpCircle } from 'lucide-react'
import { getTelegramWebApp } from '@/lib/telegram'

export function ProfileSection() {
  const { state, dispatch } = useAppState()
  const user = state.telegramUser
  const { language, setLanguage } = useLanguage()
  const lang: 'en' | 'ru' = language === 'ru' ? 'ru' : 'en'
  const t = translations[lang].profile
  const tg = getTelegramWebApp()
  const telegramUser = tg?.initDataUnsafe?.user

  // Settings dropdown state
  const [showSettings, setShowSettings] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  
  // Achievement popup state
  const [showPopup, setShowPopup] = useState(false)
  const popupTimeout = useRef<NodeJS.Timeout | null>(null)
  
  // Help popup state
  const [showHelpPopup, setShowHelpPopup] = useState(false)
  const helpPopupRef = useRef<HTMLDivElement>(null)

  // Real data for balance, invited friends and points
  const [balance, setBalance] = useState('0')
  const [invitedFriends, setInvitedFriends] = useState(0)
  const [points, setPoints] = useState(0)
  const [targetPoints, setTargetPoints] = useState(0)
  const [isAnimatingPoints, setIsAnimatingPoints] = useState(false)
  const animationRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch invited friends data
  useEffect(() => {
    if (telegramUser?.id) {
      // Fetch invited users from backend
      fetch(`/api/referral?referrer_id=${telegramUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.invited && Array.isArray(data.invited)) {
            // Set the count of invited friends
            setInvitedFriends(data.invited.length);
          }
        })
        .catch(error => {
          console.error('Error fetching referrals:', error);
        });
        
      // Fetch user points
      fetch(`/api/user-points?user_id=${telegramUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.points !== undefined) {
            setPoints(data.points);
            setTargetPoints(data.points);
          }
        })
        .catch(error => {
          console.error('Error fetching user points:', error);
        });
    }
  }, [telegramUser]);

  // Simulate points animation when completing a mission
  const animatePointsIncrease = (newPoints: number) => {
    setTargetPoints(newPoints);
    setIsAnimatingPoints(true);
  };

  // Animate points counter
  useEffect(() => {
    if (isAnimatingPoints && points < targetPoints) {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
      
      animationRef.current = setTimeout(() => {
        setPoints(prevPoints => {
          const nextPoints = prevPoints + 1;
          if (nextPoints >= targetPoints) {
            setIsAnimatingPoints(false);
            return targetPoints;
          }
          return nextPoints;
        });
      }, 50); // Speed of animation - lower number = faster
    }
    
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [points, targetPoints, isAnimatingPoints]);

  // Toggle handlers
  const handleDarkModeToggle = () => {
    dispatch({ type: 'SET_DARK_MODE', payload: !state.darkMode })
  }

  const handlePerformanceToggle = () => {
    dispatch({ type: 'SET_PERFORMANCE_MODE', payload: !state.performanceMode })
  }

  const handleWithdraw = () => {
    // Handle withdraw action
    alert("Withdraw functionality would be implemented here")
  }

  const handleReferrals = () => {
    // Navigate to referrals page with smooth animation
    const parentElement = document.querySelector('main')
    if (parentElement) {
      // First animate current content fading out
      const currentContent = parentElement.querySelector('.page-enter')
      if (currentContent) {
        currentContent.classList.add('page-exit')
        setTimeout(() => {
          // Then change to invite tab (which has the referrals)
          const event = new CustomEvent('changeTab', { detail: { tab: 'invite' } })
          document.dispatchEvent(event)
        }, 300) // Match this with CSS transition duration
      }
    }
  }

  // Achievement click handler
  const handleAchievementClick = () => {
    setShowPopup(true)
    
    // Auto-hide popup after 2 seconds
    if (popupTimeout.current) {
      clearTimeout(popupTimeout.current)
    }
    
    popupTimeout.current = setTimeout(() => {
      setShowPopup(false)
    }, 2000)
  }
  
  // Help button click handler
  const handleHelpClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowHelpPopup(!showHelpPopup)
  }

  // Close settings and help popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
      
      if (helpPopupRef.current && !helpPopupRef.current.contains(event.target as Node)) {
        setShowHelpPopup(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      // Clear timeout on unmount
      if (popupTimeout.current) {
        clearTimeout(popupTimeout.current)
      }
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    }
  }, [])

  // Language toggle
  const handleLanguageToggle = () => {
    setLanguage(lang === 'en' ? 'ru' : 'en')
    setShowSettings(false) // Close the dropdown after changing language
  }

  return (
    <div className="w-full px-0 py-2 animate-fade-in relative">
      {/* Settings Icon */}
      <div className="absolute top-2 right-2 z-10" ref={settingsRef}>
        <button 
          className="w-8 h-8 rounded-full bg-[#2a2a2a] dark:bg-[#2a2a2a] bg-gray-200 flex items-center justify-center text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-[#333333] transition-colors"
          onClick={() => setShowSettings(!showSettings)}
          aria-label={lang === 'en' ? 'Settings' : 'Настройки'}
        >
          <Settings className="w-4 h-4" />
        </button>
        
        {/* Settings Dropdown */}
        {showSettings && (
          <div className="absolute top-10 right-0 w-56 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-xl p-3 border border-gray-200 dark:border-[#2a2a2a]/50 animate-scale-in">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-white">
                  {lang === 'en' ? 'Performance Mode' : 'Режим производительности'}
                </span>
                <button 
                  className={`w-12 h-6 rounded-full ${state.performanceMode ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-gray-300 dark:bg-gray-700'} relative transition-colors duration-200`}
                  onClick={handlePerformanceToggle}
                  aria-label={state.performanceMode ? 
                    (lang === 'en' ? 'Disable performance mode' : 'Отключить режим производительности') : 
                    (lang === 'en' ? 'Enable performance mode' : 'Включить режим производительности')}
                >
                  <span 
                    className={`absolute top-1 ${state.performanceMode ? 'right-1' : 'left-1'} w-4 h-4 rounded-full bg-white transition-all duration-200`}
                  ></span>
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-white">
                  {lang === 'en' ? 'Dark Mode' : 'Тёмная тема'}
                </span>
                <button 
                  className={`w-12 h-6 rounded-full ${state.darkMode ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-gray-300 dark:bg-gray-700'} relative transition-colors duration-200`}
                  onClick={handleDarkModeToggle}
                  aria-label={state.darkMode ? 
                    (lang === 'en' ? 'Switch to light mode' : 'Переключиться на светлую тему') : 
                    (lang === 'en' ? 'Switch to dark mode' : 'Переключиться на тёмную тему')}
                >
                  <span 
                    className={`absolute top-1 ${state.darkMode ? 'right-1' : 'left-1'} w-4 h-4 rounded-full bg-white transition-all duration-200`}
                  ></span>
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gray-700 dark:text-white" />
                  <span className="text-sm text-gray-700 dark:text-white">
                    {lang === 'en' ? 'Language' : 'Язык'}
                  </span>
                </div>
                <button 
                  className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  onClick={handleLanguageToggle}
                >
                  {lang === 'en' ? 'English' : 'Русский'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Card with integrated sections */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-transparent rounded-xl shadow-lg w-full overflow-hidden">
        {/* Profile Header */}
        <div className="p-4 pb-3 border-b border-gray-200 dark:border-[#2a2a2a]/50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[#2a2a2a] flex items-center justify-center overflow-hidden shadow-sm">
              <Image
                src={user?.photo_url || '/images/default-avatar.png'}
                alt={lang === 'en' ? 'Profile' : 'Профиль'}
                width={64}
                height={64}
                className="rounded-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user?.first_name || 'yousefmsm1'}</h2>
            </div>
          </div>
        </div>

        {/* Stats Section with Balance and Points */}
        <div className="p-4 grid grid-cols-2 gap-3">
          {/* Balance Box */}
          <div className="bg-gray-100 dark:bg-[#2a2a2a] rounded-lg p-3 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-medium text-gray-700 dark:text-white">
                {lang === 'en' ? 'Balance' : 'Баланс'}
              </h3>
              <button 
                onClick={handleWithdraw} 
                className="bg-gray-200 dark:bg-[#333333] text-gray-600 dark:text-white rounded-full h-6 w-6 p-0 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-[#444444] transition-colors"
                aria-label={lang === 'en' ? 'Withdraw' : 'Вывести'}
              >
                <Minus className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <Award className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">{balance}</span>
            </div>
          </div>
          
          {/* Points Box */}
          <div className="bg-gray-100 dark:bg-[#2a2a2a] rounded-lg p-3 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-medium text-gray-700 dark:text-white">
                {lang === 'en' ? 'Points' : 'Очки'}
              </h3>
              <div className="relative" ref={helpPopupRef}>
                <button 
                  onClick={handleHelpClick}
                  className="w-5 h-5 rounded-full bg-gray-200 dark:bg-[#333333] flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-[#444444] transition-colors"
                >
                  <HelpCircle className="w-3 h-3" />
                </button>
                
                {/* Help Popup */}
                {showHelpPopup && (
                  <div className="absolute bottom-8 right-0 w-56 p-3 bg-white/95 dark:bg-[#1a1a1a]/95 rounded-lg shadow-xl z-50 text-xs border border-gray-300 dark:border-gray-700 animate-fade-in backdrop-blur-sm">
                    <div className="font-medium mb-2 text-gray-900 dark:text-white text-sm">{lang === 'en' ? 'How to earn:' : 'Как заработать:'}</div>
                    <ul className="list-disc pl-4 text-gray-800 dark:text-gray-200 space-y-2">
                      <li>{lang === 'en' ? 'Refer your friends' : 'Приглашайте друзей'}</li>
                      <li>{lang === 'en' ? 'Complete tasks in Tasks tab' : 'Выполняйте задания в разделе Задания'}</li>
                    </ul>
                    <div className="mt-2 text-[11px] text-gray-700 dark:text-gray-300">
                      {lang === 'en' ? 'Earn free TON and BERRA' : 'Получайте бесплатные TON и BERRA'}
                    </div>
                    {/* Arrow pointing to the button */}
                    <div className="absolute bottom-0 right-2 w-3 h-3 bg-white/95 dark:bg-[#1a1a1a]/95 border-r border-b border-gray-300 dark:border-gray-700 transform rotate-45 translate-y-1.5"></div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-500 dark:text-yellow-400" />
              <span className={`text-xl font-bold text-gray-900 dark:text-white ${isAnimatingPoints ? 'animate-pulse' : ''}`}>
                {points}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Referrals Card */}
      <div className="mt-3 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-transparent rounded-xl shadow-lg w-full overflow-hidden">
        {/* Referrals Header */}
        <div 
          className="p-4 border-b border-gray-200 dark:border-[#2a2a2a]/50 flex items-center justify-between cursor-pointer transition-transform hover:bg-gray-50 dark:hover:bg-[#222222] active:bg-gray-100 dark:active:bg-[#282828] group" 
          onClick={handleReferrals}
        >
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {lang === 'en' ? 'Referrals' : 'Рефералы'}
          </h3>
          <ChevronRight className="w-6 h-6 text-gray-400 transition-transform duration-300 group-hover:translate-x-1" />
        </div>

        {/* Invited Friends */}
        <div className="p-4 border-b border-gray-200 dark:border-[#2a2a2a]/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#2a2a2a] flex items-center justify-center mr-2 shadow-sm">
                <Users className="w-4 h-4 text-gray-600 dark:text-white" />
              </div>
              <span className="font-medium text-sm text-gray-700 dark:text-white leading-tight">
                {lang === 'en' ? 'Invited friends' : 'Приглашенные друзья'}
              </span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">{invitedFriends}</span>
          </div>
        </div>

        {/* Commission Info */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-100 dark:bg-[#2a2a2a] rounded-lg p-3 shadow-sm">
              <p className="text-sm text-gray-700 dark:text-white mb-1">
                {lang === 'en' ? 'You earn' : 'Вы получаете'}
              </p>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">1.5%</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {lang === 'en' ? 'from friends and their trading' : 'от друзей и их торговли'}
              </p>
            </div>
            <div className="bg-gray-100 dark:bg-[#2a2a2a] rounded-lg p-3 shadow-sm">
              <p className="text-sm text-gray-700 dark:text-white mb-1">
                {lang === 'en' ? 'You earn' : 'Вы получаете'}
              </p>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">~TON</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {lang === 'en' ? 'from friends and their trading' : 'от друзей и их торговли'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements Card - BELOW REFERRALS */}
      <div className="mt-3 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-transparent rounded-xl shadow-lg w-full overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-[#2a2a2a]/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500 dark:text-yellow-400" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {lang === 'en' ? 'Achievements' : 'Достижения'}
              </h3>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 italic">
              {lang === 'en' ? '(Coming Soon)' : '(Скоро)'}
            </span>
          </div>
        </div>
        
        <div className="p-4 flex justify-center relative">
          <div 
            className="w-20 h-20 relative grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer"
            onClick={handleAchievementClick}
          >
            <Image
              src="/images/early bird .png"
              alt={lang === 'en' ? 'Early Bird Achievement' : 'Достижение "Ранняя пташка"'}
              width={80}
              height={80}
              className="rounded-full object-cover"
            />
          </div>
          
          {/* Achievement Popup */}
          {showPopup && (
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full animate-fade-in">
              <div className="bg-black/80 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg">
                {lang === 'en' ? 'Early Bird' : 'Ранняя пташка'}
                <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-black/80"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
