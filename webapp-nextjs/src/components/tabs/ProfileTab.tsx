'use client';

import React, { useState, useEffect } from 'react';
import { useUser, useTonBalance, useAppActions, useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/Button';
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
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export const ProfileTab: React.FC = () => {
  const user = useUser();
  const tonBalance = useTonBalance();
  const { setTonBalance, setCurrentTab } = useAppActions();
  const { webApp, user: telegramUser } = useTelegram();
  
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [currentInnerTab, setCurrentInnerTab] = useState<'tasks' | 'referral' | 'earn' | 'ton'>('ton');

  useEffect(() => {
    // Initialize TON Connect when component mounts
    if (typeof window !== 'undefined' && window.TonConnectUI) {
      const tonConnectUI = new window.TonConnectUI({
        manifestUrl: '/tonconnect-manifest.json',
        buttonRootId: 'ton-connect-button',
      });

      // Set up event listeners
      tonConnectUI.onStatusChange((wallet: any) => {
        if (wallet) {
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
      });
    }
  }, [setTonBalance, webApp]);

  const connectWallet = async () => {
    setIsConnectingWallet(true);
    try {
      // TON Connect will handle the connection flow
      // The actual connection happens in the useEffect above
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
          user_id: user?.user_id,
          amount: tonBalance.balance,
          wallet_address: tonBalance.walletAddress,
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
    <div className="space-y-4 py-4 animate-fade-in">
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
      <AdsBanner />

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
        <EarnTabContent user={user} tonBalance={tonBalance} setTonBalance={setTonBalance} webApp={webApp} />
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
                  {typeof user?.credits_remaining === 'number' 
                    ? user.credits_remaining 
                    : '∞'}
                </span>
              </div>
              
              {user?.free_remaining && (
                <div className="flex justify-between items-center mt-2">
                  <span className="text-text-idle font-medium">Free Uses</span>
                  <span className="text-text-active">
                    {user.free_remaining}
                  </span>
                </div>
              )}
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
    </div>
  );
};

// Earn Tab Content Component
interface EarnTabContentProps {
  user: any;
  tonBalance: any;
  setTonBalance: (balance: any) => void;
  webApp: any;
}

const EarnTabContent: React.FC<EarnTabContentProps> = ({ user, tonBalance, setTonBalance, webApp }) => {
  const [isConverting, setIsConverting] = useState(false);
  const [conversions, setConversions] = useState<any[]>([]);
  const [userCredits, setUserCredits] = useState(0);
  const [userTonBalance, setUserTonBalance] = useState(0);

  useEffect(() => {
    // Load user data and conversions
    loadUserData();
    loadConversions();
  }, []);

  const loadUserData = async () => {
    try {
      const response = await fetch('/api/user/info');
      if (response.ok) {
        const data = await response.json();
        setUserCredits(data.credits || 0);
        setUserTonBalance(data.ton_balance || 0);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadConversions = async () => {
    try {
      const response = await fetch('/api/credits/conversions');
      if (response.ok) {
        const data = await response.json();
        setConversions(data.conversions || []);
      }
    } catch (error) {
      console.error('Error loading conversions:', error);
    }
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

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header Section with Gradient Background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-6 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">Earn & Convert</h2>
          <p className="text-blue-100 text-sm">Manage your credits and TON balance</p>
        </div>
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
        <div className="absolute -bottom-2 -left-4 w-16 h-16 bg-white/5 rounded-full"></div>
      </div>

      {/* Balance Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Credit Balance Card */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CurrencyDollarIcon className="w-5 h-5" />
              <span className="font-semibold">Credits</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{userCredits}</div>
              <div className="text-xs text-emerald-100">
                {isPremium ? 'Premium Rate' : 'Free Rate'}
              </div>
            </div>
          </div>
          <div className="text-sm text-emerald-100">
            {isPremium ? '50 credits = 0.1 TON' : '100 credits = 0.1 TON'}
          </div>
        </div>

        {/* TON Balance Card */}
        <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <GiftIcon className="w-5 h-5" />
              <span className="font-semibold">TON Balance</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{userTonBalance.toFixed(3)}</div>
              <div className="text-xs text-yellow-100">TON</div>
            </div>
          </div>
          <div className="text-sm text-yellow-100">
            Min withdrawal: 0.2 TON
          </div>
        </div>
      </div>

      {/* Convert Section */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <ArrowPathIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Convert Credits</h3>
            <p className="text-sm text-gray-300">Exchange your credits for TON</p>
          </div>
        </div>
        
        <div className="bg-gray-600/30 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Convert to TON</div>
              <div className="text-sm text-gray-300">
                {requiredCredits} credits → 0.1 TON
              </div>
            </div>
            <Button
              onClick={handleConvertCredits}
              disabled={!canConvert || isConverting}
              loading={isConverting}
              variant={canConvert ? 'primary' : 'secondary'}
              size="sm"
              className="min-w-[100px]"
            >
              {isConverting ? 'Converting...' : 'Convert'}
            </Button>
          </div>
          
          {!canConvert && (
            <div className="mt-3 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
              <div className="text-sm text-yellow-200 text-center">
                Need {requiredCredits - userCredits} more credits to convert
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conversion History */}
      {conversions.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Recent Conversions</h3>
              <p className="text-sm text-gray-300">Your conversion history</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {conversions.slice(0, 5).map((conversion, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      {conversion.credits_spent} credits → {conversion.ton_earned.toFixed(3)} TON
                    </div>
                    <div className="text-gray-400 text-xs">
                      {new Date(conversion.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-green-400 text-sm font-medium">
                  +{conversion.ton_earned.toFixed(3)} TON
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Support Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <QuestionMarkCircleIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Need Help?</h3>
            <p className="text-sm text-indigo-100">Contact our support team</p>
          </div>
        </div>
        
        <button
          onClick={() => webApp?.openLink('https://t.me/TWETestBot')}
          className="w-full flex items-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-lg transition-colors group"
        >
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
          <span className="text-white font-medium group-hover:text-indigo-100">Contact Support</span>
          <div className="ml-auto">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
};
