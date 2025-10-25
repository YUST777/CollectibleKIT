'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useUser, useAppActions, useAppStore } from '@/store/useAppStore';
import { useTelegram } from '@/components/providers/TelegramProvider';
import { hapticFeedback } from '@/lib/telegram';
import { AdsBanner } from '@/components/AdsBanner';
import toast from 'react-hot-toast';
import { CheckCircle, ArrowRight, Users, Gift, Share2, Gamepad2, Sparkles, Trophy } from 'lucide-react';

interface Task {
  id: number;
  task_id: string;
  title: string;
  description: string;
  category: string;
  credits_reward: number;
  is_daily: boolean;
  is_active: boolean;
  created_at: number;
  completed: boolean;
  completedAt?: number;
  creditsEarned?: number;
  progress: number;
  canComplete: boolean;
}

// Extracted TasksContent component for reuse
export const TasksContent: React.FC = () => {
  const user = useUser();
  const { webApp } = useTelegram();
  const { setCurrentTab } = useAppActions();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskStates, setTaskStates] = useState<Map<string, 'idle' | 'navigated' | 'checking' | 'completing'>>(new Map());

  useEffect(() => {
    if (user?.user_id) {
      loadTasks();
    }
  }, [user?.user_id]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      } else {
        console.error('Failed to load tasks');
        toast.error('Failed to load tasks');
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskAction = async (task: Task) => {
    const taskState = taskStates.get(task.task_id) || 'idle';
    
    if (taskState === 'idle') {
      // First click: Navigate to relevant tab
      setTaskStates(prev => new Map(prev).set(task.task_id, 'navigated'));
      
      // Navigate to the relevant tab
      if (task.task_id.includes('story')) {
        setCurrentTab('story');
        toast('Navigate to Story tab to create and share your story');
      } else if (task.task_id.includes('games')) {
        setCurrentTab('game');
        toast('Navigate to Game tab to complete both daily games');
      } else if (task.task_id.includes('collection')) {
        setCurrentTab('collection');
        toast('Navigate to Collection tab to create a public collection');
      } else if (task.task_id.includes('promote')) {
        // For promote task, directly trigger the share story function
        await triggerPromoteStoryCanvas();
        return;
      } else if (task.task_id.includes('invite')) {
        setCurrentTab('profile');
        toast('Navigate to Profile tab to share your referral link');
      }
    } else if (taskState === 'navigated') {
      // Second click: Check if task is completed
      await checkTaskCompletion(task);
    } else if (taskState === 'checking') {
      // Third click: Complete the task if validation passed
      await completeTask(task);
    }
  };

  const triggerPromoteStoryCanvas = async () => {
    try {
      if (!webApp?.shareToStory) {
        toast.error('Story sharing not supported on this device');
        return;
      }

      // Create a shareable URL for the task image
      const taskImageUrl = 'https://1b4746e112f7.ngrok-free.app/assets/task.jpg';
      
      // Share to story
      webApp.shareToStory(taskImageUrl, {
        text: "Made using"
      });

      toast.success('Story shared! Check back to complete the task.');
      
      // Mark as navigated so user can check completion
      setTaskStates(prev => new Map(prev).set('daily_promote_canvas', 'navigated'));
    } catch (error) {
      console.error('Error sharing story:', error);
      toast.error('Failed to share story');
    }
  };

  const checkTaskCompletion = async (task: Task) => {
    try {
      setTaskStates(prev => new Map(prev).set(task.task_id, 'checking'));
      
      const response = await fetch('/api/tasks/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          taskId: task.task_id,
          userId: user?.user_id 
        }),
      });

      const data = await response.json();

      if (response.ok && data.completed) {
        toast.success('Task completed! You can claim your reward.');
        setTaskStates(prev => new Map(prev).set(task.task_id, 'checking'));
      } else {
        toast.error(data.message || 'Task not completed yet. Please complete the required actions.');
        setTaskStates(prev => new Map(prev).set(task.task_id, 'navigated'));
      }
    } catch (error) {
      console.error('Error checking task:', error);
      toast.error('Failed to check task completion');
      setTaskStates(prev => new Map(prev).set(task.task_id, 'navigated'));
    }
  };

  const completeTask = async (task: Task) => {
    try {
      setTaskStates(prev => new Map(prev).set(task.task_id, 'completing'));
      
      const response = await fetch('/api/tasks/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId: task.task_id }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Earned ${data.creditsEarned} credits!`);
        webApp?.showPopup({ 
          message: `${task.title}\n\nEarned ${data.creditsEarned} credits!` 
        });
        // Reset state and reload tasks
        setTaskStates(prev => new Map(prev).set(task.task_id, 'idle'));
        loadTasks();
      } else {
        toast.error(data.error || 'Failed to complete task');
        setTaskStates(prev => new Map(prev).set(task.task_id, 'idle'));
      }
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Failed to complete task');
      setTaskStates(prev => new Map(prev).set(task.task_id, 'idle'));
    }
  };

  const getTaskIcon = (taskId: string) => {
    if (taskId.includes('story')) return <Share2 className="w-4 h-4" />;
    if (taskId.includes('games')) return <Gamepad2 className="w-4 h-4" />;
    if (taskId.includes('collection')) return <Gift className="w-4 h-4" />;
    if (taskId.includes('promote')) return <Share2 className="w-4 h-4" />;
    if (taskId.includes('invite')) return <Users className="w-4 h-4" />;
    return <ArrowRight className="w-4 h-4" />;
  };

  const getButtonText = (task: Task) => {
    const state = taskStates.get(task.task_id) || 'idle';
    
    if (task.completed) return 'Done';
    if (state === 'completing') return '...';
    if (state === 'checking') return 'Done';
    if (state === 'navigated') return 'Check';
    return 'Go';
  };

  const getButtonVariant = (task: Task) => {
    const state = taskStates.get(task.task_id) || 'idle';
    
    if (task.completed) return 'secondary';
    if (state === 'checking') return 'primary';
    if (state === 'navigated') return 'secondary';
    return 'secondary';
  };

  const dailyTasks = tasks.filter(task => task.category === 'daily');
  const specialTasks = tasks.filter(task => task.category === 'special');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400 text-sm">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Daily Tasks */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-4">
          <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
          <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide">Daily</h3>
        </div>
        
        {dailyTasks.length > 0 ? (
          <div className="space-y-2 px-2">
            {dailyTasks.map((task) => (
              <div key={task.task_id} className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-blue-400 flex-shrink-0">
                      {getTaskIcon(task.task_id)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium text-sm truncate">{task.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-gray-400 text-xs">{task.credits_reward} credit{task.credits_reward !== 1 ? 's' : ''}</span>
                        {task.completed && (
                          <span className="text-green-400 text-xs">• Completed</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 ml-2">
                    {task.completed ? (
                      <div className="flex items-center gap-1 text-green-400">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                    ) : (
                      <Button
                        variant={getButtonVariant(task)}
                        size="sm"
                        onClick={() => handleTaskAction(task)}
                        disabled={taskStates.get(task.task_id) === 'completing'}
                        className="px-3 py-1 text-xs min-w-[50px] h-7"
                      >
                        {getButtonText(task)}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8 text-sm">No daily tasks</div>
        )}
      </div>

      {/* Special Tasks */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-4">
          <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
          <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide">Special</h3>
        </div>
        
        {specialTasks.length > 0 ? (
          <div className="space-y-2 px-2">
            {specialTasks.map((task) => (
              <div key={task.task_id} className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-purple-400 flex-shrink-0">
                      {getTaskIcon(task.task_id)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium text-sm truncate">{task.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-gray-400 text-xs">{task.credits_reward} credit{task.credits_reward !== 1 ? 's' : ''}</span>
                        {task.completed && (
                          <span className="text-green-400 text-xs">• Completed</span>
                        )}
                      </div>
                      {task.task_id.includes('invite') && !task.completed && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {task.progress}/{task.task_id.split('_')[2]} referrals
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 ml-2">
                    {task.completed ? (
                      <div className="flex items-center gap-1 text-green-400">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                    ) : (
                      <Button
                        variant={getButtonVariant(task)}
                        size="sm"
                        onClick={() => handleTaskAction(task)}
                        disabled={taskStates.get(task.task_id) === 'completing' || !task.canComplete}
                        className="px-3 py-1 text-xs min-w-[50px] h-7"
                      >
                        {getButtonText(task)}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8 text-sm">No special tasks</div>
        )}
      </div>

      {/* 15-Day Streak Mission */}
      <StreakMissionSection />
    </div>
  );
};

export const TasksTab: React.FC = () => {
  const user = useUser();
  const { webApp, user: telegramUser } = useTelegram();
  const { setNavigationLevel, setCurrentSubTab, setCurrentTertiaryTab } = useAppActions();

  return (
    <div className="space-y-6 py-2 animate-fade-in">
      {/* Header with Profile Picture */}
      <div className="flex items-center justify-between px-4 mb-4">
        {/* Profile Picture with Notification Badge */}
        <button
          onClick={() => {
            setNavigationLevel('main');
            setCurrentSubTab('profile');
            setCurrentTertiaryTab(null);
          }}
          className="relative flex-shrink-0 w-10 h-10 rounded-full overflow-hidden border-2 border-gray-600 hover:border-gray-400 transition-colors"
        >
          {telegramUser?.photo_url ? (
            <img
              src={telegramUser.photo_url}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
              {telegramUser?.first_name?.charAt(0) || user?.first_name?.charAt(0) || 'U'}
            </div>
          )}
          
        </button>

        {/* Hamburger Menu */}
        <button 
          onClick={() => {
            const { openDrawer } = useAppStore.getState();
            openDrawer();
            hapticFeedback('selection', 'light', webApp);
          }}
          className="w-6 h-6 flex flex-col justify-center space-y-1 hover:bg-gray-800/50 rounded p-1 transition-colors"
        >
          <div className="w-full h-0.5 bg-gray-400"></div>
          <div className="w-full h-0.5 bg-gray-400"></div>
          <div className="w-full h-0.5 bg-gray-400"></div>
        </button>
      </div>

      {/* Ads Banner */}
      <AdsBanner />

      {/* Tasks Content */}
      <TasksContent />
    </div>
  );
};

// 15-Day Streak Mission Component
const StreakMissionSection: React.FC = () => {
  const [streakData, setStreakData] = useState<{
    streakDays: number;
    canCheckIn: boolean;
    streakCompleted: boolean;
    lastStreakClick?: string;
  }>({
    streakDays: 0,
    canCheckIn: true,
    streakCompleted: false
  });
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const { webApp } = useTelegram();

  useEffect(() => {
    loadStreakData();
  }, []);

  const loadStreakData = async () => {
    try {
      const response = await fetch('/api/tasks/streak');
      if (response.ok) {
        const data = await response.json();
        setStreakData({
          streakDays: data.streakDays || 0,
          canCheckIn: data.canCheckIn,
          streakCompleted: data.streakCompleted || false,
          lastStreakClick: data.lastStreakClick
        });
      }
    } catch (error) {
      console.error('Error loading streak data:', error);
    }
  };

  const handleCheckIn = async () => {
    if (isCheckingIn || !streakData.canCheckIn) return;

    setIsCheckingIn(true);
    try {
      const response = await fetch('/api/tasks/streak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message);
        hapticFeedback('notification', 'success', webApp);
        loadStreakData(); // Refresh streak data
      } else {
        toast.error(result.message || 'Check-in failed');
        hapticFeedback('notification', 'error', webApp);
      }
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error('Check-in failed');
      hapticFeedback('notification', 'error', webApp);
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-4">
        <div className="w-1 h-4 bg-yellow-500 rounded-full"></div>
        <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide">15-Day Streak Mission</h3>
      </div>
      
      <div className="px-2">
        <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-xl p-4 border border-yellow-500/30 backdrop-blur-sm">
          <div className="text-center space-y-4">
            {/* Progress */}
            <div className="space-y-2">
              <div className="text-2xl font-bold text-yellow-400">
                {streakData.streakCompleted ? '🎉 COMPLETED!' : `${streakData.streakDays}/15 Days`}
              </div>
              
              {!streakData.streakCompleted && (
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(streakData.streakDays / 15) * 100}%` }}
                  ></div>
                </div>
              )}
            </div>

            {/* Reward */}
            <div className="text-sm text-gray-300">
              {streakData.streakCompleted ? (
                <span className="text-green-400 font-medium">You are eligible for the hidden Telegram gift! 🎁</span>
              ) : (
                <span>Reward: Hidden Telegram Gift 🎁</span>
              )}
            </div>

            {/* Warning */}
            {!streakData.streakCompleted && (
              <div className="text-xs text-red-400 bg-red-900/20 rounded-lg p-2">
                ⚠️ Miss 1 day and streak resets to 0!
              </div>
            )}

            {/* Check-in Button */}
            {!streakData.streakCompleted && (
              <Button
                onClick={handleCheckIn}
                disabled={!streakData.canCheckIn || isCheckingIn}
                loading={isCheckingIn}
                variant="primary"
                size="lg"
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
              >
                {isCheckingIn ? 'Checking In...' : 
                 !streakData.canCheckIn ? 'Already Checked In Today' : 
                 'Check In Today'}
              </Button>
            )}

            {/* Last check-in info */}
            {streakData.lastStreakClick && (
              <div className="text-xs text-gray-400">
                Last check-in: {new Date(streakData.lastStreakClick).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};