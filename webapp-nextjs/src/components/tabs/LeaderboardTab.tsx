'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/store/useAppStore';

interface LeaderboardUser {
  user_id: number;
  username?: string;
  first_name?: string;
  credits: number;
  created_at: number;
}

interface UserRank {
  user_id: number;
  username?: string;
  first_name?: string;
  credits: number;
  created_at: number;
  rank: number;
}

export const LeaderboardTab: React.FC = () => {
  const user = useUser();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [userRank, setUserRank] = useState<UserRank | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/leaderboard');
      const data = await response.json();
      
      if (data.success) {
        setLeaderboard(data.leaderboard || []);
        setUserRank(data.userRank);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCredits = (credits: number) => {
    if (credits >= 1000000) {
      return `${(credits / 1000000).toFixed(1)}M`;
    } else if (credits >= 1000) {
      return `${(credits / 1000).toFixed(1)}K`;
    }
    return credits.toString();
  };

  const getMedalIcon = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-8 h-8 flex items-center justify-center">
          <div 
            className="w-8 h-8"
            dangerouslySetInnerHTML={{
              __html: `<lottie-player src="/assets/1st Place Medal.json" background="transparent" speed="1" style="width: 32px; height: 32px;" loop autoplay></lottie-player>`
            }}
          />
        </div>
      );
    } else if (rank === 2) {
      return (
        <div className="w-8 h-8 flex items-center justify-center">
          <div 
            className="w-8 h-8"
            dangerouslySetInnerHTML={{
              __html: `<lottie-player src="/assets/2nd Place Medal.json" background="transparent" speed="1" style="width: 32px; height: 32px;" loop autoplay></lottie-player>`
            }}
          />
        </div>
      );
    } else if (rank === 3) {
      return (
        <div className="w-8 h-8 flex items-center justify-center">
          <div 
            className="w-8 h-8"
            dangerouslySetInnerHTML={{
              __html: `<lottie-player src="/assets/3rd Place Medal.json" background="transparent" speed="1" style="width: 32px; height: 32px;" loop autoplay></lottie-player>`
            }}
          />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 flex items-center justify-center">
        <span className="text-text-idle font-semibold text-sm">{rank}</span>
      </div>
    );
  };

  const getUserDisplayName = (user: LeaderboardUser) => {
    return user.first_name || user.username || `User ${user.user_id}`;
  };

  const getUserAvatar = (user: LeaderboardUser) => {
    const name = getUserDisplayName(user);
    return name.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-text-idle">Loading leaderboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Leaderboard Header */}
      <div className="text-center py-4">
        <h2 className="text-lg font-semibold text-text-idle">🏆</h2>
      </div>

      {/* Leaderboard List */}
      <div className="space-y-2">
        {leaderboard.map((user, index) => (
          <div
            key={user.user_id}
            className="flex items-center justify-between p-3 bg-box-bg rounded-lg hover:bg-box-bg/80 transition-colors"
          >
            <div className="flex items-center space-x-3">
              {getMedalIcon(index + 1)}
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {getUserAvatar(user)}
              </div>
              <div>
                <div className="font-medium text-text-idle">
                  {getUserDisplayName(user)}
                </div>
                <div className="text-xs text-text-active">
                  {formatCredits(user.credits)} credits
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-yellow-400">
                #{index + 1}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* User's Rank */}
      {userRank && (
        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="text-center mb-3">
            <span className="text-sm text-text-active">Your Rank</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg border border-blue-500/30">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <span className="text-text-idle font-semibold text-sm">#{userRank.rank}</span>
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {getUserAvatar(userRank)}
              </div>
              <div>
                <div className="font-medium text-text-idle">
                  {getUserDisplayName(userRank)}
                </div>
                <div className="text-xs text-text-active">
                  {formatCredits(userRank.credits)} credits
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-blue-400">
                #{userRank.rank}
              </div>
            </div>
          </div>
        </div>
      )}

      {leaderboard.length === 0 && (
        <div className="text-center py-8">
          <div className="text-text-idle">No players yet</div>
          <div className="text-sm text-text-active mt-1">
            Start earning credits to appear on the leaderboard!
          </div>
        </div>
      )}
    </div>
  );
};
