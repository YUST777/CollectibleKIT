'use client'

import { useState, useEffect } from 'react'
import { getTelegramWebApp } from '@/lib/telegram'
import { useLanguage } from './app-provider'
import { translations } from '@/lib/translations'
import { ExternalLink, Send, Share2, Users, PlayCircle, Award, Check, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { useAppState } from '@/lib/state'
import { Button } from './ui/button'
import { useRouter } from 'next/navigation'
import { shareToTelegramStory } from '@/lib/telegram-webapp-utils'

// Dynamically import Lottie to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

// Channel IDs
const GIFT_CATALOG_CHANNEL_ID = "-1002658162089";
const TWE_CHANNEL_ID = "-1002180550939";

export function TasksSection() {
  const tg = getTelegramWebApp()
  const telegramUser = tg?.initDataUnsafe?.user
  const { language } = useLanguage()
  const lang: 'en' | 'ru' = language === 'ru' ? 'ru' : 'en'
  const t = translations[lang].tasks
  const [userPoints, setUserPoints] = useState(0)
  const [completedTasks, setCompletedTasks] = useState<{type: string, id: string}[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [channelTaskStates, setChannelTaskStates] = useState<Record<string, 'start' | 'checking' | 'done'>>({
    [GIFT_CATALOG_CHANNEL_ID]: 'start',
    [TWE_CHANNEL_ID]: 'start'
  })
  const { state, dispatch } = useAppState()
  const router = useRouter()
  
  // Add state for story sharing task
  const [storyTaskState, setStoryTaskState] = useState<'start' | 'checking' | 'done'>('start')
  const [storyLastShared, setStoryLastShared] = useState<string | null>(null)
  
  // Fetch user points and completed tasks on mount
  useEffect(() => {
    if (telegramUser?.id) {
      fetchUserPoints(telegramUser.id.toString())
    } else {
      setIsLoading(false)
    }
  }, [telegramUser])
  
  // Function to fetch user points
  const fetchUserPoints = async (userId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/user-points?user_id=${userId}`)
      const data = await response.json()
      
      if (data.points !== undefined) {
        setUserPoints(data.points)
      }
      
      if (data.completedTasks) {
        setCompletedTasks(data.completedTasks)
        
        // Initialize channel task states based on completed tasks
        const newTaskStates = { ...channelTaskStates }
        data.completedTasks.forEach((task: {type: string, id: string}) => {
          if (task.type === 'channel') {
            newTaskStates[task.id] = 'done'
          }
        })
        setChannelTaskStates(newTaskStates)
        
        // Check if story was shared today
        const storyTask = data.completedTasks.find((task: {type: string, id: string}) => 
          task.type === 'story' && task.id === getCurrentDate()
        )
        
        if (storyTask) {
          setStoryTaskState('done')
          setStoryLastShared(getCurrentDate())
        } else {
          // Check if we have pending verification
          const storySharingStatus = localStorage.getItem('storySharingStatus')
          if (storySharingStatus === 'pending_verification') {
            setStoryTaskState('checking')
          } else {
            setStoryTaskState('start')
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user points:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Helper function to get current date and hour (for multiple tests per day)
  const getCurrentDate = () => {
    const date = new Date()
    // For testing: Include the current hour in the date to allow multiple tests per day (every hour)
    // This enables up to 24 tests per day (one per hour)
    const hour = Math.floor(date.getHours() / 5) // Divide day into 5 periods (allowing 5 tests per day)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${hour}`
  }
  
  // Check if a task is completed
  const isTaskCompleted = (taskType: string, taskId: string): boolean => {
    return completedTasks.some(task => task.type === taskType && task.id === taskId)
  }
  
  // Open channel and check membership
  const handleChannelClick = async (url: string, channelId: string) => {
    if (!telegramUser?.id) {
      toast.error(lang === 'en' ? 'You need to be logged in' : 'Необходимо авторизоваться')
      return
    }
    
    // If the button is in 'start' state, just open the channel and change to 'checking'
    if (channelTaskStates[channelId] === 'start') {
      // Open the channel in Telegram
      if (tg && typeof (window as any).Telegram?.WebApp?.openLink === 'function') {
        (window as any).Telegram.WebApp.openLink(url)
      } else {
        window.open(url, '_blank')
      }
      
      // Update state to 'checking'
      setChannelTaskStates(prev => ({
        ...prev,
        [channelId]: 'checking'
      }))
      
      return
    }
    
    // If the button is in 'checking' state, verify membership directly
    if (channelTaskStates[channelId] === 'checking') {
      try {
        setIsLoading(true)
        const response = await fetch('/api/channel-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: telegramUser.id,
            channelId
          })
        })
        
        const data = await response.json()
        
        if (data.success && !data.alreadyRewarded) {
          toast.success(lang === 'en' 
            ? `You earned ${data.pointsAwarded} points!` 
            : `Вы заработали ${data.pointsAwarded} баллов!`
          )
          
          // Update local points and completed tasks
          setUserPoints(prev => prev + data.pointsAwarded)
          setCompletedTasks(prev => [...prev, { type: 'channel', id: channelId }])
          setChannelTaskStates(prev => ({
            ...prev,
            [channelId]: 'done'
          }))
        } else if (data.alreadyRewarded) {
          toast.info(lang === 'en' 
            ? 'You already completed this task' 
            : 'Вы уже выполнили это задание'
          )
          setChannelTaskStates(prev => ({
            ...prev,
            [channelId]: 'done'
          }))
        } else if (data.isMember === false) {
          toast.error(lang === 'en' 
            ? 'Our bot could not verify your membership. Make sure you joined the channel and try again.' 
            : 'Наш бот не смог подтвердить ваше членство. Убедитесь, что вы присоединились к каналу, и попробуйте снова.'
          )
          // Reset to start state to allow user to try again
          setChannelTaskStates(prev => ({
            ...prev,
            [channelId]: 'start'
          }))
        } else {
          toast.error(lang === 'en' 
            ? 'Could not verify channel membership. Make sure you joined the channel and try again.' 
            : 'Не удалось подтвердить подписку на канал. Убедитесь, что вы присоединились к каналу, и попробуйте снова.'
          )
        }
      } catch (error) {
        console.error('Error verifying channel membership:', error)
        toast.error(lang === 'en' 
          ? 'An error occurred. Please try again.' 
          : 'Произошла ошибка. Пожалуйста, попробуйте снова.'
        )
      } finally {
        setIsLoading(false)
      }
    }
  }
  
  // Modified handleShareStory function with direct Telegram API approach
  const handleShareStory = async () => {
    console.log("DEBUG: Starting story share process");
    
    if (!telegramUser?.id) {
      console.log("DEBUG: No Telegram user ID found", telegramUser);
      toast.error(lang === 'en' ? 'You need to be logged in' : 'Необходимо авторизоваться')
      return
    }
    
    console.log("DEBUG: User ID:", telegramUser.id, "Story task state:", storyTaskState);
    
    // If checking status, verify the story was shared
    if (storyTaskState === 'checking') {
      console.log("DEBUG: In checking state, verifying story share");
      try {
        setIsLoading(true)
        const response = await fetch('/api/story-share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: telegramUser.id.toString(),
            taskId: getCurrentDate(), // Use current date as task ID for daily limit
            verify: true // Add verify flag
          }),
        })
        
        console.log("DEBUG: Story verification API response status:", response.status);
        const data = await response.json()
        console.log("DEBUG: Story verification API response data:", data);
        
        if (data.success) {
          console.log("DEBUG: Story verification successful");
          toast.success(lang === 'en' 
            ? `You earned 1 point for sharing a story!` 
            : `Вы заработали 1 балл за историю!`
          )
          
          // Update local points and completed tasks
          setUserPoints(prev => prev + 1)
          setCompletedTasks(prev => [...prev, { type: 'story', id: getCurrentDate() }])
          setStoryTaskState('done')
          setStoryLastShared(getCurrentDate())
          
          // Clear local storage state
          localStorage.removeItem('storySharingStatus')
        } else if (data.notShared) {
          console.log("DEBUG: Story verification failed - not shared");
          toast.error(lang === 'en' 
            ? 'We could not verify your story share. Please try again.' 
            : 'Мы не смогли подтвердить публикацию вашей истории. Пожалуйста, попробуйте снова.'
          )
          setStoryTaskState('start')
          localStorage.removeItem('storySharingStatus')
        } else if (data.alreadyCompleted) {
          console.log("DEBUG: Story verification found task already completed");
          toast.info(lang === 'en' 
            ? 'You already completed this task today' 
            : 'Вы уже выполнили это задание сегодня'
          )
          setStoryTaskState('done')
          setStoryLastShared(getCurrentDate())
        }
      } catch (error) {
        console.error('DEBUG: Error verifying story share:', error)
        toast.error(lang === 'en' 
          ? 'An error occurred. Please try again.' 
          : 'Произошла ошибка. Пожалуйста, попробуйте снова.'
        )
      } finally {
        setIsLoading(false)
      }
      return
    }
    
    // First step: send the story - DIRECT TELEGRAM API APPROACH
    console.log("DEBUG: Attempting to share story with Telegram API");
    
    // Get the Telegram WebApp instance directly
    const tg = getTelegramWebApp();
    console.log("DEBUG: Telegram WebApp instance:", tg);
    
    // Always use the direct bot link as requested
    const botLink = "https://t.me/GiftCatalog_bot";
    
    // Construct the image URL with the current origin to ensure it works with ngrok
    const storyImageUrl = `${window.location.origin}/images/story-with-text.jpg`;
    console.log("DEBUG: Using image URL:", storyImageUrl);
    
    // DIRECT TELEGRAM API APPROACH:
    try {
      if (tg && tg.shareToStory) {
        console.log("DEBUG: Using Telegram.WebApp.shareToStory method");
        
        // Call the Telegram shareToStory method directly with the proper parameters
        tg.shareToStory({
          media_url: storyImageUrl,
          text: '',
          // Add the button/link to the story
          widget_link: {
            url: botLink,
            text: "GIFTCATALOG"
          }
        });
        
        // Move to checking state
        localStorage.setItem('storySharingStatus', 'pending_verification');
        setStoryTaskState('checking');
        
        // Show success message
        toast.success(lang === 'en' 
          ? 'Story shared! Click "Check" to verify and get your points.' 
          : 'История опубликована! Нажмите "Проверить", чтобы получить баллы.'
        );
      } else {
        // Fallback for testing environments
        console.log("DEBUG: shareToStory method not available, showing message");
        toast.error(lang === 'en' 
          ? 'Story sharing not available in this environment.' 
          : 'Функция публикации историй недоступна в этой среде.'
        );
      }
    } catch (error) {
      console.error('DEBUG: Error in story sharing:', error);
      toast.error(lang === 'en' 
        ? 'An error occurred. Please try again.' 
        : 'Произошла ошибка. Пожалуйста, попробуйте снова.'
      );
    }
  }
  
  const handleWatchAd = () => {
    // Placeholder function for watching ads
    // In a real implementation, this would integrate with an ad network SDK
    alert("Ad functionality would be implemented here")
  }

  return (
    <div className="w-full px-0 py-2 animate-fade-in">
      <h1 className="text-lg font-bold mb-2 text-center">{t.title}</h1>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4 px-1">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {lang === 'en' ? 'Your points:' : 'Ваши баллы:'} 
              <span className="font-bold ml-1 text-primary">{userPoints}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchUserPoints(telegramUser?.id?.toString() || '')}
              className="text-xs"
            >
              {lang === 'en' ? 'Refresh' : 'Обновить'}
            </Button>
          </div>
      
          <div className="mb-2 bg-[#1a1a1a] rounded-xl p-3 shadow-lg w-full">
            <h2 className="text-base font-semibold mb-2 text-white px-1">{t.subscribeChannels}</h2>
            <div className="space-y-1">
              <ChannelTask 
                name="GiftCatalog" 
                points={1} 
                url="https://t.me/Gift_Catalog"
                channelId={GIFT_CATALOG_CHANNEL_ID}
                status={channelTaskStates[GIFT_CATALOG_CHANNEL_ID]}
                onVerify={handleChannelClick}
              />
              <ChannelTask 
                name="TWE | News" 
                points={1} 
                url="https://t.me/TWENewss"
                channelId={TWE_CHANNEL_ID}
                status={channelTaskStates[TWE_CHANNEL_ID]}
                onVerify={handleChannelClick}
              />
            </div>
          </div>
          
          <div className="mb-2 bg-[#1a1a1a] rounded-xl p-3 shadow-lg w-full">
            <h2 className="text-base font-semibold mb-2 text-white px-1">{t.watchAds}</h2>
            <div className="space-y-1">
              <AdTask 
                description="Watch daily ad" 
                points={1} 
                onWatch={handleWatchAd}
                status="start"
              />
            </div>
          </div>
          
          <div className="bg-[#1a1a1a] rounded-xl p-3 shadow-lg w-full">
            <h2 className="text-base font-semibold mb-2 text-white px-1">{t.shareStories}</h2>
            <div className="space-y-1">
              <StoryTask 
                description={storyLastShared === getCurrentDate() 
                  ? lang === 'en'
                    ? `Shared in this time period (${getCurrentDate().split('-').slice(0, 3).join('-')})` 
                    : `Опубликовано в этот период (${getCurrentDate().split('-').slice(0, 3).join('-')})`
                  : "Share story"
                }
                points={1} 
                onShare={handleShareStory}
                status={storyTaskState}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface TaskProps {
  points: number
  status: 'start' | 'checking' | 'done'
}

interface ChannelTaskProps extends TaskProps {
  name: string
  url: string
  channelId: string
  onVerify: (url: string, channelId: string) => void
}

function ChannelTask({ name, points, url, channelId, status, onVerify }: ChannelTaskProps) {
  const { language } = useLanguage()
  const lang: 'en' | 'ru' = language === 'ru' ? 'ru' : 'en'
  const t = translations[lang].tasks
  
  const handleClick = () => {
    if (status !== 'done') {
      onVerify(url, channelId)
    }
  }
  
  return (
    <div className="flex items-center justify-between py-0.5 px-1">
      <div className="flex items-center flex-1">
        <div className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center mr-2">
          {status === 'done' ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <ExternalLink className="w-4 h-4 text-white" />
          )}
        </div>
        <div>
          <p className="font-medium text-sm text-white leading-tight">{name}</p>
          <div className="flex items-center">
            <Award className="w-3 h-3 text-purple-400 mr-1" />
            <span className="text-xs text-purple-400">+{points} {t.points}</span>
          </div>
        </div>
      </div>
      <button 
        className={`px-4 py-1 rounded-full text-xs font-medium min-w-[80px] ${
          status === 'done' 
            ? 'bg-green-600/30 text-green-500 cursor-not-allowed' 
            : status === 'checking'
              ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700'
              : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md hover:from-purple-600 hover:to-indigo-600'
        }`}
        disabled={status === 'done'}
        onClick={handleClick}
      >
        {status === 'done' 
          ? t.done 
          : status === 'checking' 
            ? (lang === 'en' ? 'Check' : 'Проверить')
            : t.start
        }
      </button>
    </div>
  )
}

interface AdTaskProps extends TaskProps {
  description: string
  onWatch: () => void
}

function AdTask({ description, points, onWatch, status }: AdTaskProps) {
  const { language } = useLanguage()
  const lang: 'en' | 'ru' = language === 'ru' ? 'ru' : 'en'
  const t = translations[lang].tasks
  
  return (
    <div className="flex items-center justify-between py-0.5 px-1">
      <div className="flex items-center flex-1">
        <div className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center mr-2">
          <PlayCircle className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-medium text-sm text-white leading-tight">{description}</p>
          <div className="flex items-center">
            <Award className="w-3 h-3 text-purple-400 mr-1" />
            <span className="text-xs text-purple-400">+{points} {t.points}</span>
          </div>
        </div>
      </div>
      <button 
        className={`px-4 py-1 rounded-full text-xs font-medium min-w-[80px] ${
          status === 'done' 
            ? 'bg-[#333333] text-gray-400 cursor-not-allowed' 
            : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md hover:from-purple-600 hover:to-indigo-600'
        }`}
        disabled={status === 'done'}
        onClick={onWatch}
      >
        {status === 'done' ? t.done : t.start}
      </button>
    </div>
  )
}

interface StoryTaskProps extends TaskProps {
  description: string
  onShare: () => void
}

function StoryTask({ description, points, onShare, status }: StoryTaskProps) {
  const { language } = useLanguage()
  const lang: 'en' | 'ru' = language === 'ru' ? 'ru' : 'en'
  const t = translations[lang].tasks
  const router = useRouter()
  
  const handleClick = () => {
    if (status !== 'done') {
      onShare()
    }
  }
  
  return (
    <div className="flex items-center justify-between py-0.5 px-1">
      <div className="flex items-center flex-1">
        <div className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center mr-2">
          {status === 'done' ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Share2 className="w-4 h-4 text-white" />
          )}
        </div>
        <div>
          <p className="font-medium text-sm text-white leading-tight">{description}</p>
          <div className="flex items-center">
            <Award className="w-3 h-3 text-purple-400 mr-1" />
            <span className="text-xs text-purple-400">+{points} {t.points}</span>
          </div>
        </div>
      </div>
      <button 
        className={`px-4 py-1 rounded-full text-xs font-medium min-w-[80px] ${
          status === 'done' 
            ? 'bg-[#333333] text-gray-400 cursor-not-allowed' 
            : status === 'checking'
              ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700'
              : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md hover:from-purple-600 hover:to-indigo-600'
        }`}
        disabled={status === 'done'}
        onClick={handleClick}
      >
        {status === 'done' 
          ? t.done 
          : status === 'checking' 
            ? (lang === 'en' ? 'Check' : 'Проверить')
            : t.start
        }
      </button>
    </div>
  )
} 