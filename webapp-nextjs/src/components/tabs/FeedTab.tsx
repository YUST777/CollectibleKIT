'use client';

import React, { useState, useEffect } from 'react';
import { FeedEvent } from '@/lib/database';
import { LeaderboardTab } from './LeaderboardTab';
import { 
  BanknotesIcon, 
  SparklesIcon, 
  CurrencyDollarIcon,
  CheckCircleIcon,
  TrophyIcon,
  FireIcon,
  ChartBarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

// Helper function to format relative time
const formatRelativeTime = (timestamp: number): string => {
  // Convert timestamp from seconds to milliseconds
  const timestampMs = timestamp * 1000;
  const now = Date.now();
  const diff = now - timestampMs;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

// Helper function to get event icon
const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case 'ton_withdrawal':
      return <BanknotesIcon className="w-5 h-5 text-cyan-400" />;
    case 'first_win_bonus':
      return <SparklesIcon className="w-5 h-5 text-yellow-400" />;
    case 'credit_earn':
    case 'credit_to_ton':
      return <CurrencyDollarIcon className="w-5 h-5 text-amber-400" />;
    case 'task_complete':
      return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
    case 'game_win':
      return <TrophyIcon className="w-5 h-5 text-purple-400" />;
    case 'streak_complete':
      return <FireIcon className="w-5 h-5 text-orange-400" />;
    default:
      return <SparklesIcon className="w-5 h-5 text-gray-400" />;
  }
};

// Helper function to format event description
const formatEventDescription = (event: FeedEvent): string => {
  const data = event.event_data ? JSON.parse(event.event_data) : {};
  
  switch (event.event_type) {
    case 'ton_withdrawal':
      return `withdrew ${data.amount || '0.2'} TON`;
    case 'first_win_bonus':
      return `earned first win bonus of ${data.ton || '0.1'} TON`;
    case 'credit_to_ton':
      return `converted ${data.credits || '100'} credits to ${data.ton || '0.1'} TON`;
    case 'credit_earn':
      return `earned ${data.credits || '1'} credit`;
    case 'task_complete':
      return `completed task "${data.taskTitle || 'Daily Task'}"`;
    case 'game_win':
      return `won a game and earned ${data.credits || '1'} credit`;
    case 'streak_complete':
      return `completed ${data.days || '15'}-day streak!`;
    default:
      return 'performed an action';
  }
};

// FeedItem component
const FeedItem: React.FC<{ event: FeedEvent }> = ({ event }) => {
  const userName = event.first_name || event.username || 'Anonymous';
  const firstLetter = userName.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2 p-2.5 bg-box-bg rounded-lg hover:bg-box-bg/80 transition-colors">
      {/* User Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
        {firstLetter}
      </div>

      {/* Event Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-text-idle truncate">
            {userName}
          </span>
          <span className="text-xs text-text-active">
            {formatEventDescription(event)}
          </span>
        </div>
      </div>

      {/* Event Icon & Timestamp */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="w-4 h-4">
          {getEventIcon(event.event_type)}
        </div>
        <span className="text-[10px] text-text-active">
          {formatRelativeTime(event.created_at)}
        </span>
      </div>
    </div>
  );
};

// Main FeedTab component
export const FeedTab: React.FC = () => {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeInnerTab, setActiveInnerTab] = useState<'events' | 'leaderboard'>('events');

  const loadFeedEvents = async () => {
    try {
      const response = await fetch('/api/feed/events?limit=50');
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
        setError(null);
      } else {
        console.error('Failed to load feed events');
        setError('Failed to load feed');
      }
    } catch (error) {
      console.error('Error loading feed events:', error);
      setError('Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadFeedEvents();
  }, []);

  // Live updates - refresh every 2 seconds when user is on Events tab
  useEffect(() => {
    if (activeInnerTab !== 'events') return;

    const interval = setInterval(() => {
      loadFeedEvents();
    }, 2000); // 2 seconds for near real-time updates

    return () => clearInterval(interval);
  }, [activeInnerTab]);

  return (
    <div className="space-y-4">
      {/* Inner Tab Navigation */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveInnerTab('events')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors ${
            activeInnerTab === 'events'
              ? 'text-text-idle border-b-2 border-blue-500'
              : 'text-text-active hover:text-text-idle'
          }`}
        >
          <ClockIcon className="w-4 h-4" />
          <span>Events</span>
        </button>
        <button
          onClick={() => setActiveInnerTab('leaderboard')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors ${
            activeInnerTab === 'leaderboard'
              ? 'text-text-idle border-b-2 border-blue-500'
              : 'text-text-active hover:text-text-idle'
          }`}
        >
          <ChartBarIcon className="w-4 h-4" />
          <span>Leaderboard</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeInnerTab === 'events' && (
        <div>
          {loading ? (
            <div className="px-4 py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-text-idle mx-auto"></div>
              <p className="text-sm text-text-active mt-4">Loading activity feed...</p>
            </div>
          ) : error ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={loadFeedEvents}
                className="mt-4 px-4 py-2 bg-box-bg rounded-lg text-sm text-text-idle hover:bg-box-bg/80 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : events.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <SparklesIcon className="w-12 h-12 text-text-active mx-auto mb-4" />
              <p className="text-sm text-text-active">No activity yet</p>
              <p className="text-xs text-text-active mt-2">Be the first to earn credits and win rewards!</p>
            </div>
                      ) : (
             <div className="space-y-2 px-2 pb-4">
               {/* Header */}
               <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text-idle">Activity Feed</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-400">Live</span>
                </div>
              </div>

              {/* Feed Items */}
              {events.map((event) => (
                <FeedItem key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeInnerTab === 'leaderboard' && (
        <div className="px-4">
          <LeaderboardTab />
        </div>
      )}
    </div>
  );
};

