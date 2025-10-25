'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/store/useAppStore';
import { useTelegram } from '@/components/providers/TelegramProvider';
import { Button } from '@/components/ui/Button';
import { Share2, Users, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

interface InvitedUser {
  invited_id: number;
  invited_name: string;
  invited_photo: string;
  created_at: number;
}

interface ReferralStats {
  totalReferrals: number;
  recentReferrals: number;
}

export const ReferralSection: React.FC = () => {
  const user = useUser();
  const { webApp } = useTelegram();
  const [referralLink, setReferralLink] = useState('');
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([]);
  const [referralStats, setReferralStats] = useState<ReferralStats>({ totalReferrals: 0, recentReferrals: 0 });
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);

  const BOT_LINK = 'https://t.me/snapGobot'; // Correct bot link (Token: 8353864491:AAED87RQDPrvG1O3wXs2C3u345c_UOYrSqQ)

  useEffect(() => {
    if (user?.user_id) {
      setReferralLink(`${BOT_LINK}?start=ref_${user.user_id}`);
      loadReferralData();
    }
  }, [user?.user_id]);

  const loadReferralData = async () => {
    if (!user?.user_id) return;
    
    setLoading(true);
    try {
      // Load invited users
      const invitedResponse = await fetch(`/api/referral?referrer_id=${user.user_id}`);
      const invitedData = await invitedResponse.json();
      
      if (invitedData.invited && Array.isArray(invitedData.invited)) {
        setInvitedUsers(invitedData.invited);
      }

      // Load referral stats
      const statsResponse = await fetch(`/api/referral/stats?referrer_id=${user.user_id}`);
      const statsData = await statsResponse.json();
      
      if (statsData.stats) {
        setReferralStats(statsData.stats);
      }
    } catch (error) {
      console.error('Error loading referral data:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success('Referral link copied!');
      
      if (webApp && typeof (window as any).Telegram?.WebApp?.showPopup === 'function') {
        (window as any).Telegram.WebApp.showPopup({ message: 'Link copied!' });
      }
    } catch (error) {
      toast.error('Failed to copy link');
      
      if (webApp && typeof (window as any).Telegram?.WebApp?.showPopup === 'function') {
        (window as any).Telegram.WebApp.showPopup({ message: 'Failed to copy link' });
      }
    }
  };

  const handleShare = () => {
    if (typeof window === 'undefined') return;
    
    if (webApp && typeof (window as any).Telegram?.WebApp?.shareLink === 'function') {
      (window as any).Telegram.WebApp.shareLink(referralLink, { 
        title: 'Join CollectibleKIT!' 
      });
    } else if (navigator.share) {
      navigator.share({ 
        title: 'Join CollectibleKIT!', 
        url: referralLink 
      });
    } else {
      // Fallback to copy
      handleCopy();
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="tg-card">
        <div className="flex items-center justify-center py-8">
          <div className="text-text-idle">Loading referral data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-4">
      {/* Header Section */}
      <div className="text-center py-6">
        <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mx-auto mb-4 flex items-center justify-center">
          <Share2 className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-text-idle mb-2">Invite & Earn</h2>
        <p className="text-text-active text-sm">Share your link and earn rewards</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl p-4 border border-blue-500/30">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span className="text-xs text-blue-300">Total</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{referralStats.totalReferrals}</div>
          <div className="text-xs text-blue-200">Referrals</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-4 border border-green-500/30">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-green-400" />
            <span className="text-xs text-green-300">This Week</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{referralStats.recentReferrals}</div>
          <div className="text-xs text-green-200">New</div>
        </div>
      </div>

      {/* Share Section */}
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-purple-500/20">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-text-idle mb-2">Your Referral Link</h3>
          <p className="text-sm text-text-active">Share this link to invite friends</p>
        </div>
        
        <div className="flex items-center space-x-2 mb-4">
          <input
            type="text"
            readOnly
            value={referralLink}
            className="flex-1 bg-box-bg p-3 rounded-lg text-sm text-text-active border border-icon-idle/20 focus:outline-none"
          />
          <Button
            onClick={handleCopy}
            variant="secondary"
            size="sm"
            className="px-4"
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>
        
        <Button
          onClick={handleShare}
          className="w-full h-12 text-lg font-medium"
          variant="primary"
        >
          <Share2 className="w-5 h-5 mr-2" />
          Share Referral Link
        </Button>
      </div>

      {/* Invited Friends */}
      <div className="bg-box-bg rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-icon-active" />
          <h3 className="font-semibold text-text-idle">Invited Friends</h3>
        </div>
        
        {invitedUsers.length > 0 ? (
          <div className="space-y-3">
            {(showAll ? invitedUsers : invitedUsers.slice(0, 3)).map((invitedUser, index) => (
              <div
                key={invitedUser.invited_id}
                className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {invitedUser.invited_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-text-active font-medium">
                    {invitedUser.invited_name || `User ${invitedUser.invited_id}`}
                  </div>
                  <div className="text-xs text-text-idle">
                    Joined {formatDate(invitedUser.created_at)}
                  </div>
                </div>
                <div className="text-xs text-green-400 font-medium">
                  ✓ Active
                </div>
              </div>
            ))}
            
            {invitedUsers.length > 3 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full flex items-center justify-center text-icon-active hover:text-text-active transition-colors text-sm font-medium py-3 bg-box-bg rounded-lg hover:bg-icon-idle/10"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    Show All ({invitedUsers.length})
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-500/20 to-gray-600/20 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-text-idle font-medium mb-2">No friends invited yet</h3>
            <p className="text-sm text-text-idle/70">
              Share your referral link to invite friends and start earning!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
