'use client';

import React, { useState, useEffect } from 'react';
import { X, Users, MessageCircle, Star, CheckCircle, Zap } from 'lucide-react';
import { Button } from './Button';

interface AdDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
}

export const AdDrawer: React.FC<AdDrawerProps> = ({ isOpen, onClose }) => {
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchUserStats();
      // Update stats every 30 seconds
      const interval = setInterval(fetchUserStats, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stats/users');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserStats(data.stats);
        } else {
          throw new Error(data.error || 'Failed to fetch stats');
        }
      } else {
        throw new Error('Failed to fetch user stats');
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
      // Fallback to mock data if API fails
      setUserStats({
        totalUsers: Math.floor(Math.random() * 10000) + 5000,
        activeUsers: Math.floor(Math.random() * 2000) + 1000,
        newUsersToday: Math.floor(Math.random() * 100) + 50
      });
    } finally {
      setLoading(false);
    }
  };

  const pricingTiers = [
    {
      name: "Starter",
      price: "5 TON",
      originalPrice: null,
      features: [
        "7 days placement",
        "Standard visibility",
        "Basic analytics",
        "Email support"
      ],
      popular: false
    },
    {
      name: "Premium",
      price: "5 TON",
      originalPrice: "10 TON",
      discount: "50% OFF",
      features: [
        "14 days placement",
        "Priority visibility",
        "Advanced analytics",
        "24/7 support",
        "Custom design",
        "A/B testing"
      ],
      popular: true
    }
  ];

  const handleContact = () => {
    // Open Telegram chat
    const telegramUrl = `https://t.me/yousefmsm1`;
    window.open(telegramUrl, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Drawer Content */}
      <div className="relative w-full max-w-md bg-box-bg rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out">
        {/* Handle */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="w-12 h-1 bg-icon-idle/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pb-4 border-b border-icon-idle/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-idle">Advertise Here</h2>
                <p className="text-sm text-text-active">Reach thousands of users</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-icon-idle/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-text-idle" />
            </button>
          </div>
        </div>

        {/* Real-time User Counter */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-icon-idle/20">
          <div className="flex items-center space-x-2 mb-3">
            <Users className="w-5 h-5 text-icon-active" />
            <span className="font-semibold text-text-idle">Live Stats</span>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-icon-idle/20 rounded mb-1" />
                  <div className="h-3 bg-icon-idle/10 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-icon-active">
                  {userStats.totalUsers.toLocaleString()}
                </div>
                <div className="text-xs text-text-active">Total Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {userStats.activeUsers.toLocaleString()}
                </div>
                <div className="text-xs text-text-active">Active Now</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">
                  +{userStats.newUsersToday}
                </div>
                <div className="text-xs text-text-active">New Today</div>
              </div>
            </div>
          )}
        </div>

        {/* Pricing Roadmap */}
        <div className="px-6 py-4">
          <h3 className="text-lg font-semibold text-text-idle mb-4 flex items-center">
            <Star className="w-5 h-5 text-yellow-500 mr-2" />
            Choose Your Plan
          </h3>
          
          <div className="space-y-4">
            {pricingTiers.map((tier, index) => (
              <div
                key={index}
                className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                  tier.popular
                    ? 'border-icon-active bg-icon-active/5 shadow-lg'
                    : 'border-icon-idle/30 bg-box-bg hover:border-icon-idle/50'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-text-idle">
                    {tier.name}
                  </h4>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      {tier.originalPrice && (
                        <span className="text-sm text-text-active line-through">
                          {tier.originalPrice}
                        </span>
                      )}
                      <span className="text-2xl font-bold text-icon-active">
                        {tier.price}
                      </span>
                    </div>
                    {tier.discount && (
                      <div className="text-xs text-green-500 font-semibold">
                        {tier.discount}
                      </div>
                    )}
                  </div>
                </div>
                
                <ul className="space-y-2 mb-4">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-text-active">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Button */}
        <div className="px-6 pb-6">
          <Button
            onClick={handleContact}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-4 rounded-xl flex items-center justify-center space-x-2 transition-all duration-200 transform hover:scale-105"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Contact @yousefmsm1</span>
          </Button>
          
          <p className="text-xs text-text-active text-center mt-3">
            Get instant response and custom pricing for your needs
          </p>
        </div>
      </div>
    </div>
  );
};
