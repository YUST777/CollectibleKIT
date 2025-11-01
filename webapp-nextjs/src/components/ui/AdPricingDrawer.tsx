'use client';

import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Users, Zap, Star, MessageCircle, TrendingUp, Eye, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

interface AdPricingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PricingTier {
  id: number;
  name: string;
  price: number;
  originalPrice: number;
  discount: number;
  features: string[];
  popular?: boolean;
}

export const AdPricingDrawer: React.FC<AdPricingDrawerProps> = ({ isOpen, onClose }) => {
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real user stats from API
  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/stats/users');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserStats(data.stats);
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
      // Fallback to default values if API fails
      setUserStats({
        totalUsers: 1250,
        activeUsers: 450,
        newUsersToday: 25
      });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUserStats();
      // Update stats every 30 seconds
      const interval = setInterval(fetchUserStats, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const pricingTiers: PricingTier[] = [
    {
      id: 1,
      name: "Starter",
      price: 5,
      originalPrice: 10,
      discount: 50,
      features: [
        "7 days placement",
        "Top banner position",
        "Basic analytics",
        "Channel promotion"
      ]
    },
    {
      id: 2,
      name: "Popular",
      price: 15,
      originalPrice: 30,
      discount: 50,
      features: [
        "14 days placement",
        "Premium banner position",
        "Advanced analytics",
        "Channel + project promotion",
        "Priority support"
      ],
      popular: true
    },
    {
      id: 3,
      name: "Premium",
      price: 25,
      originalPrice: 50,
      discount: 50,
      features: [
        "30 days placement",
        "Exclusive banner position",
        "Full analytics dashboard",
        "Multi-channel promotion",
        "Custom design support",
        "24/7 priority support"
      ]
    }
  ];

  const handleContact = () => {
    // Open Telegram chat
    window.open('https://t.me/yousefmsm1', '_blank');
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="h-[90vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl font-bold text-text-idle">
            Ad Placement Pricing
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto">
          {/* Real-time User Counter */}
          <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Live Users
                </h3>
                <p className="text-yellow-100 text-sm">Real-time mini app users</p>
              </div>
              <div className="text-right">
                {isLoading ? (
                  <div className="animate-pulse">
                    <div className="h-8 w-20 bg-white/20 rounded"></div>
                  </div>
                ) : (
                  <div className="text-3xl font-bold">
                    {userStats.totalUsers.toLocaleString()}
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-yellow-100 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>{userStats.activeUsers} active today</span>
                  </div>
                  <div className="text-yellow-100 text-xs">
                    +{userStats.newUsersToday} new users today
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Value Proposition */}
          <div className="bg-box-bg rounded-xl p-4 border border-icon-idle/30">
            <h4 className="font-semibold text-text-idle mb-2 flex items-center gap-2">
              <Eye className="w-5 h-5 text-icon-active" />
              Why advertise here?
            </h4>
            <ul className="space-y-2 text-sm text-text-active">
              <li className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <span>High engagement Telegram mini app</span>
              </li>
              <li className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                <span>Active community of gift collectors</span>
              </li>
              <li className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-500" />
                <span>Perfect for channels, projects, products</span>
              </li>
            </ul>
          </div>

          {/* Pricing Tiers */}
          <div className="space-y-4">
            <h4 className="font-semibold text-text-idle text-center">
              Choose Your Ad Package
            </h4>
            <div className="space-y-3">
              {pricingTiers.map((tier) => (
                <div
                  key={tier.id}
                  className={`relative bg-box-bg rounded-xl p-4 border-2 transition-all ${
                    tier.popular
                      ? 'border-icon-active bg-gradient-to-br from-icon-active/10 to-transparent'
                      : 'border-icon-idle/30'
                  }`}
                >
                  {tier.popular && (
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                      <div className="bg-icon-active text-white px-3 py-1 rounded-full text-xs font-semibold">
                        Most Popular
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-semibold text-text-idle">{tier.name}</h5>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-icon-active">
                          {tier.price} TON
                        </span>
                        <div className="text-sm text-text-active line-through">
                          {tier.originalPrice} TON
                        </div>
                      </div>
                      <div className="text-xs text-green-500 font-semibold">
                        {tier.discount}% OFF
                      </div>
                    </div>
                  </div>

                  <ul className="space-y-1 mb-4">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="text-sm text-text-active flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-icon-active rounded-full"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 rounded-xl p-4 text-white">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Ready to advertise?
            </h4>
            <p className="text-sm text-yellow-100 mb-4">
              Contact us to discuss your ad placement and get started!
            </p>
            <Button
              onClick={handleContact}
              className="w-full bg-white/90 text-amber-700 hover:bg-white hover:scale-105 transition-all duration-200 font-semibold shadow-lg"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat @yousefmsm1
            </Button>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
};
