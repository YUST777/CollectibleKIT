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
  CreditCardIcon,
  QuestionMarkCircleIcon,
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
    if (!tonBalance.walletConnected || tonBalance.rewards <= 0) return;
    
    setIsWithdrawing(true);
    try {
      const response = await fetch('/api/withdraw-rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user?.user_id,
          amount: tonBalance.rewards,
          wallet_address: tonBalance.walletAddress,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Rewards withdrawn successfully!');
        hapticFeedback('notification', 'success', webApp);
        setTonBalance({
          ...tonBalance,
          rewards: 0,
        });
      } else {
        toast.error(result.error || 'Failed to withdraw rewards');
        hapticFeedback('notification', 'error', webApp);
      }
    } catch (error) {
      console.error('Error withdrawing rewards:', error);
      toast.error('Failed to withdraw rewards');
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
    <div className="space-y-6 py-4 animate-fade-in">
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
      <div className="bg-[#282627] rounded-xl p-1 grid grid-cols-4 gap-1 mx-4">
        <button
          onClick={() => {
            setCurrentInnerTab('tasks');
            hapticFeedback('selection', 'light', webApp);
          }}
          className={`py-2.5 px-2 rounded-lg text-sm font-medium transition-all ${
            currentInnerTab === 'tasks'
              ? 'bg-[#424242] text-white shadow-sm'
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
          className={`py-2.5 px-2 rounded-lg text-sm font-medium transition-all ${
            currentInnerTab === 'referral'
              ? 'bg-[#424242] text-white shadow-sm'
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
          className={`py-2.5 px-2 rounded-lg text-sm font-medium transition-all ${
            currentInnerTab === 'earn'
              ? 'bg-[#424242] text-white shadow-sm'
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
          className={`py-2.5 px-2 rounded-lg text-sm font-medium transition-all ${
            currentInnerTab === 'ton'
              ? 'bg-[#424242] text-white shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          TON
        </button>
      </div>

      {/* Content based on selected inner tab */}
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
        <div className="px-4">
          {/* Support section moved to Earn tab */}
          <div className="tg-card">
            <h3 className="text-lg font-semibold text-text-idle mb-4 flex items-center gap-2">
              <QuestionMarkCircleIcon className="w-5 h-5" />
              Support
            </h3>
            
            <div className="space-y-3">
              <button
                onClick={() => webApp?.openLink('https://t.me/TWETestBot')}
                className="w-full flex items-center gap-3 p-3 bg-box-bg rounded-lg hover:bg-icon-idle/20 transition-colors"
              >
                <svg className="w-5 h-5 text-icon-active" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                <span className="text-text-idle">Contact Support</span>
              </button>
              
              <button
                onClick={() => webApp?.openLink('https://t.me/TWETestBot')}
                className="w-full flex items-center gap-3 p-3 bg-box-bg rounded-lg hover:bg-icon-idle/20 transition-colors"
              >
                <svg className="w-5 h-5 text-icon-active" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span className="text-text-idle">FAQ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {currentInnerTab === 'ton' && (
        <div className="px-4 space-y-6">
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
              
              {/* Rewards */}
              <div className="flex justify-between items-center">
                <span className="text-text-idle">Rewards</span>
                <span className="text-yellow-600 font-bold">
                  {tonBalance.rewards.toFixed(2)} TON
                </span>
              </div>
              
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
                    disabled={tonBalance.rewards <= 0 || isWithdrawing}
                    loading={isWithdrawing}
                    className="flex-1"
                  >
                    {isWithdrawing ? 'Withdrawing...' : 'Withdraw Rewards'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TON Connect Button Container */}
      <div id="ton-connect-button" className="hidden" />
    </div>
  );
};
