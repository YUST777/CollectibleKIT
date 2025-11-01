'use client';

import React, { useState, useEffect } from 'react';
import { TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { useUser, useTonBalance, useAppActions, useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/Button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet';
import { useTelegram } from '@/components/providers/TelegramProvider';
import { hapticFeedback } from '@/lib/telegram';
import { ReferralSection } from '@/components/sections/ReferralSection';
import { AdsBanner } from '@/components/AdsBanner';
import { TasksContent } from '@/components/tabs/TasksTab';
import {
  UserIcon,
  CreditCardIcon,
  GiftIcon,
  CogIcon,
  QuestionMarkCircleIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  ClockIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { Crown } from 'lucide-react';
import { AdPricingDrawer } from '@/components/ui/AdPricingDrawer';
import { PortfolioTab } from './PortfolioTab';
import toast from 'react-hot-toast';

export const ProfileTab: React.FC = () => {
  const user = useUser();
  const tonBalance = useTonBalance();
  const { setTonBalance, setCurrentTab } = useAppActions();
  const { webApp, user: telegramUser } = useTelegram();
  const [adsBannerPremiumDrawerOpen, setAdsBannerPremiumDrawerOpen] = useState(false);
  
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [currentInnerTab, setCurrentInnerTab] = useState<'tasks' | 'referral' | 'earn' | 'ton' | 'portfolio'>('ton');
  
  // Use TON Connect React hooks
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();

  useEffect(() => {
    if (wallet) {
      console.log('✅ TON Wallet connected:', wallet);
      setTonBalance({
        balance: 0, // This would be fetched from API
        rewards: 0,
        walletConnected: true,
        walletAddress: wallet.account.address,
      });
      toast.success('Wallet connected successfully!');
      hapticFeedback('notification', 'success', webApp);
    } else {
      setTonBalance({
        balance: 0,
        rewards: 0,
        walletConnected: false,
      });
    }
  }, [wallet, setTonBalance, webApp]);

  const connectWallet = async () => {
    setIsConnectingWallet(true);
    try {
      if (!tonConnectUI) {
        toast.error('TON Connect is not initialized');
        return;
      }
      
      // Open the wallet connection modal
      tonConnectUI.openModal();
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet');
      hapticFeedback('notification', 'error', webApp);
    } finally {
      setIsConnectingWallet(false);
    }
  };

  const withdrawRewards = async () => {
    if (!tonBalance.walletConnected || tonBalance.balance < 0.2) return;
    
    setIsWithdrawing(true);
    try {
      const response = await fetch('/api/withdraw-rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: tonBalance.balance,
          walletAddress: tonBalance.walletAddress,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('TON withdrawn successfully!');
        hapticFeedback('notification', 'success', webApp);
        setTonBalance({
          ...tonBalance,
          balance: 0,
        });
      } else {
        toast.error(result.error || 'Failed to withdraw TON');
        hapticFeedback('notification', 'error', webApp);
      }
    } catch (error) {
      console.error('Error withdrawing TON:', error);
      toast.error('Failed to withdraw TON');
      hapticFeedback('notification', 'error', webApp);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const getWalletAddressDisplay = () => {
    if (!tonBalance.walletAddress) return 'Not connected';
    
    const address = tonBalance.walletAddress;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  return (
    <div className="space-y-4 py-4 lg:py-0 animate-fade-in">
      {/* Header with Profile Picture */}
      <div className="flex items-center justify-between px-4 mb-4">
        {/* Profile Picture with Notification Badge */}
        <button 
          onClick={() => {
            setCurrentTab('profile');
            hapticFeedback('selection', 'light', webApp);
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
      <AdsBanner 
        onOpenPremiumDrawer={() => setAdsBannerPremiumDrawerOpen(true)}
        externalPremiumDrawerOpen={adsBannerPremiumDrawerOpen}
        onExternalPremiumDrawerChange={setAdsBannerPremiumDrawerOpen}
        user={user}
      />

      {/* Inner Tabs Navigation */}
      <div className="flex px-4">
        <div className="flex space-x-6">
          <button
            onClick={() => {
              setCurrentInnerTab('tasks');
              hapticFeedback('selection', 'light', webApp);
            }}
            className={`text-sm font-medium transition-colors ${
              currentInnerTab === 'tasks'
                ? 'text-white border-b-2 border-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Tasks
          </button>
          
          <button
            onClick={() => {
              setCurrentInnerTab('referral');
              hapticFeedback('selection', 'light', webApp);
            }}
            className={`text-sm font-medium transition-colors ${
              currentInnerTab === 'referral'
                ? 'text-white border-b-2 border-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Referral
          </button>
          
          <button
            onClick={() => {
              setCurrentInnerTab('earn');
              hapticFeedback('selection', 'light', webApp);
            }}
            className={`text-sm font-medium transition-colors ${
              currentInnerTab === 'earn'
                ? 'text-white border-b-2 border-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Earn
          </button>
          
          <button
            onClick={() => {
              setCurrentInnerTab('ton');
              hapticFeedback('selection', 'light', webApp);
            }}
            className={`text-sm font-medium transition-colors ${
              currentInnerTab === 'ton'
                ? 'text-white border-b-2 border-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            TON
          </button>

          <button
            onClick={() => {
              setCurrentInnerTab('portfolio');
              hapticFeedback('selection', 'light', webApp);
            }}
            className={`text-sm font-medium transition-colors ${
              currentInnerTab === 'portfolio'
                ? 'text-white border-b-2 border-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Portfolio
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {currentInnerTab === 'tasks' && (
        <div className="px-4">
          <TasksContent />
        </div>
      )}

      {currentInnerTab === 'referral' && (
        <div className="px-4">
          <ReferralSection />
        </div>
      )}

      {currentInnerTab === 'earn' && (
        <EarnTabContent 
          user={user} 
          tonBalance={tonBalance} 
          setTonBalance={setTonBalance} 
          webApp={webApp}
          onOpenPremiumDrawer={() => setAdsBannerPremiumDrawerOpen(true)}
        />
      )}

      {currentInnerTab === 'ton' && (
        <div className="space-y-6 px-4">
          {/* User Info */}
          <div className="tg-card">
            <div className="flex items-center gap-4">
              {/* Profile Picture */}
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-icon-active flex-shrink-0">
                {telegramUser?.photo_url ? (
                  <img
                    src={telegramUser.photo_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">
                      {telegramUser?.first_name?.charAt(0) || user?.first_name?.charAt(0) || 'U'}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-text-idle">
                  {user?.first_name || telegramUser?.first_name || 'Anonymous'}
                </h3>
                <p className="text-text-active text-sm">
                  {user?.user_type === 'premium' ? 'Premium User' : 
                   user?.user_type === 'vip' ? 'VIP User' :
                   user?.user_type === 'test' ? 'Test User' : 'Free User'}
                </p>
              </div>
            </div>
            
            {/* Credits Info */}
            <div className="mt-4 pt-4 border-t border-icon-idle/20">
              <div className="flex justify-between items-center">
                <span className="text-text-idle font-medium">Credits</span>
                <span className="text-icon-active font-bold">
                  {user?.user_type === 'premium' || user?.user_type === 'vip' || user?.user_type === 'test'
                    ? '∞' 
                    : typeof user?.credits_remaining === 'number' 
                      ? user.credits_remaining 
                      : user?.credits || 0}
                </span>
              </div>
            </div>
          </div>

          {/* TON Wallet */}
          <div className="tg-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-idle flex items-center gap-2">
                <CreditCardIcon className="w-5 h-5" />
                TON Wallet
              </h3>
            </div>
            
            <div className="space-y-4">
              {/* Wallet Connection Status */}
              <div className="flex justify-between items-center">
                <span className="text-text-idle">Status</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  tonBalance.walletConnected 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {tonBalance.walletConnected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              
              {/* Wallet Address */}
              <div className="flex justify-between items-center">
                <span className="text-text-idle">Address</span>
                <span className="text-text-active text-sm font-mono">
                  {getWalletAddressDisplay()}
                </span>
              </div>
              
              {/* TON Balance from Conversions */}
              <div className="flex justify-between items-center">
                <span className="text-text-idle">TON Balance</span>
                <span className="text-yellow-600 font-bold">
                  {tonBalance.balance.toFixed(3)} TON
                </span>
              </div>
              
              {/* First Win Bonus */}
              {user?.first_win_claimed && (
                <div className="flex justify-between items-center">
                  <span className="text-text-idle">First Win Bonus</span>
                  <span className="text-green-400 text-sm">✓ Claimed</span>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                {!tonBalance.walletConnected ? (
                  <Button
                    onClick={connectWallet}
                    disabled={isConnectingWallet}
                    loading={isConnectingWallet}
                    className="flex-1"
                  >
                    {isConnectingWallet ? 'Connecting...' : 'Connect Wallet'}
                  </Button>
                ) : (
                  <Button
                    onClick={withdrawRewards}
                    disabled={tonBalance.balance < 0.2 || isWithdrawing}
                    loading={isWithdrawing}
                    className="flex-1"
                  >
                    {isWithdrawing ? 'Withdrawing...' : `Withdraw ${tonBalance.balance.toFixed(3)} TON`}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* TON Connect Button Container */}
          <div id="ton-connect-button" className="hidden" />
        </div>
      )}

      {currentInnerTab === 'portfolio' && (
        <div className="-mx-4">
          <PortfolioTab />
        </div>
      )}
    </div>
  );
};

// Earn Tab Content Component
interface EarnTabContentProps {
  user: any;
  tonBalance: any;
  setTonBalance: (balance: any) => void;
  webApp: any;
  onOpenPremiumDrawer?: () => void;
}

const EarnTabContent: React.FC<EarnTabContentProps> = ({ user, tonBalance, setTonBalance, webApp, onOpenPremiumDrawer }) => {
  const [isConverting, setIsConverting] = useState(false);
  const [conversions, setConversions] = useState<any[]>([]);
  const [userCredits, setUserCredits] = useState(0);
  const [userTonBalance, setUserTonBalance] = useState(0);
  const [isEarningInfoOpen, setIsEarningInfoOpen] = useState(false);
  const [premiumStatus, setPremiumStatus] = useState<{
    isPremium: boolean;
    expiresAt: number | null;
  }>({ isPremium: false, expiresAt: null });
  const [isPremiumDrawerOpen, setIsPremiumDrawerOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    // Load user data and conversions
    loadUserData();
    loadConversions();
    loadPremiumStatus();
  }, []);

  // Reload user data when user prop changes to reflect premium status
  useEffect(() => {
    if (user?.user_type) {
      loadUserData();
    }
  }, [user?.user_type, user]);

  useEffect(() => {
    if (premiumStatus.expiresAt && premiumStatus.isPremium) {
      const interval = setInterval(() => {
        const now = Date.now();
        const diff = premiumStatus.expiresAt! - now;

        if (diff <= 0) {
          setTimeRemaining('Expired');
          setPremiumStatus({ isPremium: false, expiresAt: null });
          clearInterval(interval);
          return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60)) / (1000 * 60));

        setTimeRemaining(`${days}d:${hours}h:${minutes}m`);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [premiumStatus]);

  const loadUserData = async () => {
    try {
      const initData = typeof window !== 'undefined' && window.Telegram?.WebApp?.initData || '';
      const response = await fetch('/api/user/info', {
        headers: {
          'X-Telegram-Init-Data': initData,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUserCredits(data.credits || 0);
        setUserTonBalance(data.ton_balance || 0);
        // Don't reload - the user object from parent will update naturally
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadConversions = async () => {
    try {
      const initData = typeof window !== 'undefined' && window.Telegram?.WebApp?.initData || '';
      const response = await fetch('/api/credits/conversions', {
        headers: {
          'X-Telegram-Init-Data': initData,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setConversions(data.conversions || []);
      }
    } catch (error) {
      console.error('Error loading conversions:', error);
    }
  };

  const loadPremiumStatus = async () => {
    try {
      const initData = typeof window !== 'undefined' && window.Telegram?.WebApp?.initData || '';
      const response = await fetch('/api/premium/status', {
        headers: {
          'X-Telegram-Init-Data': initData,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setPremiumStatus({
          isPremium: data.isPremium,
          expiresAt: data.expiresAt,
        });
      }
    } catch (error) {
      console.error('Error loading premium status:', error);
    }
  };

  const handleBuyPremiumClick = () => {
    if (onOpenPremiumDrawer) {
      onOpenPremiumDrawer();
    } else {
      setIsPremiumDrawerOpen(true);
    }
    hapticFeedback('selection', 'medium', webApp);
  };

  const handleConvertCredits = async () => {
    if (isConverting) return;

    const isPremium = user?.user_type === 'premium' || user?.user_type === 'vip';
    const requiredCredits = isPremium ? 50 : 100;
    
    if (userCredits < requiredCredits) {
      toast.error(`You need ${requiredCredits} credits to convert to TON`);
      return;
    }

    setIsConverting(true);
    try {
      const response = await fetch('/api/credits/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creditsToSpend: requiredCredits })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Converted ${requiredCredits} credits to ${result.tonEarned.toFixed(3)} TON!`);
        setUserCredits(result.newCreditBalance);
        setUserTonBalance(result.newTonBalance);
        loadConversions(); // Refresh conversions
        hapticFeedback('notification', 'success', webApp);
      } else {
        toast.error(result.error || 'Conversion failed');
        hapticFeedback('notification', 'error', webApp);
      }
    } catch (error) {
      console.error('Error converting credits:', error);
      toast.error('Conversion failed');
      hapticFeedback('notification', 'error', webApp);
    } finally {
      setIsConverting(false);
    }
  };

  const isPremium = user?.user_type === 'premium' || user?.user_type === 'vip';
  const requiredCredits = isPremium ? 50 : 100;
  const canConvert = userCredits >= requiredCredits;
  
  // Debug logging
  console.log('🎯 EarnTabContent - user_type:', user?.user_type, 'isPremium:', isPremium, 'requiredCredits:', requiredCredits);

  return (
    <div className="space-y-6 px-4">
      {/* Header with Info Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-text-idle">Earn TON</h2>
        <button
          onClick={() => setIsEarningInfoOpen(true)}
          className="p-2 rounded-full bg-icon-idle/20 hover:bg-icon-idle/30 transition-colors"
        >
          <InformationCircleIcon className="w-5 h-5 text-icon-active" />
        </button>
      </div>

      {/* Combined Balance & Convert Card */}
      <div className="tg-card">
        {/* Two Numbers at Top */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-icon-active">{userCredits}</div>
            <div className="text-sm text-text-active">Credits</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">{userTonBalance.toFixed(3)}</div>
            <div className="text-sm text-text-active">TON</div>
          </div>
        </div>

        {/* Big Convert Button */}
        <Button
          onClick={handleConvertCredits}
          disabled={!canConvert || isConverting}
          loading={isConverting}
          variant={canConvert ? 'primary' : 'secondary'}
          size="lg"
          className="w-full py-4 text-lg font-semibold"
        >
          {isConverting ? 'Converting...' : `Convert ${requiredCredits} Credits → 0.1 TON`}
        </Button>
        
        {!canConvert && (
          <div className="text-sm text-text-active text-center mt-3">
            Need {requiredCredits - userCredits} more credits to convert
          </div>
        )}
      </div>

      {/* Conversion History */}
      {conversions.length > 0 && (
        <div className="tg-card">
          <h3 className="text-lg font-semibold text-text-idle mb-4 flex items-center gap-2">
            <ClockIcon className="w-5 h-5" />
            Recent Conversions
          </h3>
          
          <div className="space-y-2">
            {conversions.slice(0, 5).map((conversion, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-box-bg rounded-lg">
                <div className="text-sm">
                  <div className="text-text-idle">
                    {conversion.credits_spent} credits → {conversion.ton_earned.toFixed(3)} TON
                  </div>
                  <div className="text-text-active text-xs">
                    {new Date(conversion.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-xs text-icon-active">
                  {conversion.conversion_rate}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Premium Box */}
      {!premiumStatus.isPremium ? (
        <div className="bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-orange-600/20 rounded-xl p-4 border border-purple-500/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-sm mb-1">Unlock Premium</h3>
              <p className="text-gray-300 text-xs mb-2">
                Get unlimited everything for just 1 TON/month
              </p>
              <Button
                onClick={handleBuyPremiumClick}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-2 text-xs"
              >
                Buy Premium
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 rounded-xl p-4 border border-yellow-500/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-sm mb-1">Premium Active</h3>
              <p className="text-yellow-300 text-lg font-bold mb-2">
                {timeRemaining || 'Loading...'}
              </p>
              <p className="text-gray-300 text-xs">
                Enjoy unlimited everything!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Support Section */}
      <div className="tg-card">
        <h3 className="text-lg font-semibold text-text-idle mb-4 flex items-center gap-2">
          <QuestionMarkCircleIcon className="w-5 h-5" />
          Support
        </h3>
        
        <div className="space-y-3">
          <button
            onClick={() => webApp?.openLink('https://t.me/CollectibleKITbot')}
            className="w-full flex items-center gap-3 p-3 bg-box-bg rounded-lg hover:bg-icon-idle/20 transition-colors"
          >
            <svg className="w-5 h-5 text-icon-active" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            <span className="text-text-idle">Contact Support</span>
          </button>
        </div>
      </div>

      {/* Earning Info Drawer */}
      <Sheet open={isEarningInfoOpen} onOpenChange={setIsEarningInfoOpen}>
        <SheetContent className="bg-[#1c1c1d] flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-white text-center">
              How to Earn TON
            </SheetTitle>
          </SheetHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            {/* Overview */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-4 text-white">
              <h3 className="text-lg font-semibold mb-2">CollectableKIT Overview</h3>
              <p className="text-sm text-blue-100">
                A Telegram Mini App that rewards users with TON cryptocurrency for engaging with creative tools and games.
              </p>
            </div>

            {/* Monetization Model */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Monetization Model</h3>
              
              {/* Pricing Table */}
              <div className="bg-[#2a2a2b] rounded-xl overflow-hidden">
                <div className="grid grid-cols-2 gap-2 p-3 border-b border-gray-700">
                  <div className="text-center text-gray-400 text-sm font-medium">
                    Free Tier
                  </div>
                  <div className="text-center text-purple-400 text-sm font-bold">
                    Premium Tier (1 TON/month)
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 border-b border-gray-700">
                  <div className="text-center">
                    <div className="text-gray-300 font-medium">20 credits</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-bold">Unlimited credits</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 border-b border-gray-700">
                  <div className="text-center">
                    <div className="text-gray-300 font-medium">1 credit per action</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-bold">Unlimited (no watermarks)</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 border-b border-gray-700">
                  <div className="text-center">
                    <div className="text-gray-300 font-medium">5 wins/day</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-bold">10 wins/day</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 border-b border-gray-700">
                  <div className="text-center">
                    <div className="text-gray-300 font-medium">100 credits → 0.1 TON</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-bold">50 credits → 0.1 TON</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3">
                  <div className="text-center">
                    <div className="text-gray-400 text-sm">With Watermark</div>
                  </div>
                  <div className="text-center">
                    <div className="text-purple-400 font-medium">Exclusive Patterns</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Earning Methods */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">How to Earn Credits</h3>
              
              <div className="space-y-3">
                <div className="bg-[#2a2a2b] rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <GiftIcon className="w-5 h-5 text-yellow-500" />
                    Mini-Games
                  </h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• <strong>Zoom Game:</strong> Guess the gift model from zoomed image (4 options)</li>
                    <li>• <strong>Emoji Game:</strong> Match 3 out of 5 emoji patterns</li>
                    <li>• <strong>Win Rate:</strong> ~40% (balanced for fun and challenge)</li>
                    <li>• <strong>Reward:</strong> 1 credit per win</li>
                  </ul>
                </div>

                <div className="bg-[#2a2a2b] rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-green-500" />
                    Daily Activities
                  </h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• <strong>Daily Login:</strong> 1 credit bonus</li>
                    <li>• <strong>First Win Bonus:</strong> 0.1 TON (min. 0.2 TON withdrawal)</li>
                    <li>• <strong>Referrals:</strong> Complete referral task to earn credits</li>
                    <li>• <strong>Special Missions:</strong> Complete tasks to earn TON rewards</li>
                  </ul>
                </div>

                <div className="bg-[#2a2a2b] rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <CurrencyDollarIcon className="w-5 h-5 text-blue-500" />
                    Credit Usage
                  </h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• <strong>Save Collection:</strong> 1 credit</li>
                    <li>• <strong>Cut Photo:</strong> 1 credit</li>
                    <li>• <strong>Share Publicly:</strong> 1 credit</li>
                    <li>• <strong>Premium Users:</strong> Unlimited usage</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* TON Rewards */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">TON Rewards</h3>
              
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-4 text-white">
                <h4 className="font-semibold mb-2">Conversion Rates</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Free Users:</span>
                    <span className="font-bold">100 credits → 0.1 TON</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Premium Users:</span>
                    <span className="font-bold">50 credits → 0.1 TON</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Minimum Withdrawal:</span>
                    <span className="font-bold">0.2 TON</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-green-900/30 border border-green-600/30 rounded-lg p-4">
              <h4 className="text-green-300 font-semibold mb-2">💡 Pro Tips</h4>
              <ul className="text-green-200/80 text-sm space-y-1">
                <li>• Earn credits through games, tasks, daily login, and more</li>
                <li>• Premium users convert credits to TON 2x faster</li>
                <li>• Share your creations to promote the app</li>
                <li>• Complete referral task to earn credits</li>
                <li>• Complete special missions in Tasks tab to earn TON</li>
                <li>• First win gives instant 0.1 TON bonus</li>
              </ul>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Note: Premium drawer is handled by AdsBanner component now */}
    </div>
  );
};
