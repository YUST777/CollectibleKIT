'use client'

import { useState, useEffect } from 'react'
import { getTelegramWebApp } from '@/lib/telegram'
import duckAnimation from '../../duck_invitation.json'
import { LottiePlayer } from './LottiePlayer'
import { useLanguage } from './app-provider'
import { translations } from '@/lib/translations'
import { Share2, ChevronDown, ChevronUp } from 'lucide-react'

const BOT_LINK = 'https://t.me/GiftCatalog_bot';

export function InviteSection() {
  const tg = getTelegramWebApp();
  const user = tg?.initDataUnsafe?.user;
  const [referralLink, setReferralLink] = useState('');
  const [invitedUsers, setInvitedUsers] = useState<{ name: string; photoUrl: string }[]>([]);
  const { language } = useLanguage();
  const lang: 'en' | 'ru' = language === 'ru' ? 'ru' : 'en';
  const t = translations[lang].invite;
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      setReferralLink(`${BOT_LINK}?start=ref_${user.id}`);
      // Fetch invited users from backend
      fetch(`/api/referral?referrer_id=${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.invited && Array.isArray(data.invited)) {
            setInvitedUsers(data.invited.map((u: any) => ({
              name: u.invited_name || `ID ${u.invited_id}`,
              photoUrl: u.invited_photo || '/images/default-avatar.png',
            })));
          }
        })
        .catch(() => setInvitedUsers([]));
    }
  }, [user]);

  const handleCopy = async () => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(referralLink);
      if (tg && typeof (window as any).Telegram?.WebApp?.showPopup === 'function') {
        (window as any).Telegram.WebApp.showPopup({ message: language === 'ru' ? 'Скопировано!' : 'Copied!' });
      }
    } catch {
      if (tg && typeof (window as any).Telegram?.WebApp?.showPopup === 'function') {
        (window as any).Telegram.WebApp.showPopup({ message: language === 'ru' ? 'Не удалось скопировать' : 'Failed to copy link' });
      }
    }
  };

  const handleShare = () => {
    if (typeof window === 'undefined') return;
    if (tg && typeof (window as any).Telegram?.WebApp?.shareLink === 'function') {
      (window as any).Telegram.WebApp.shareLink(referralLink, { title: t.inviteFriends });
    } else if (navigator.share) {
      navigator.share({ title: t.inviteFriends, url: referralLink });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in space-y-6">
      <div className="flex flex-col items-center justify-center mt-4 mb-2">
        <div className="w-32 h-32">
          <LottiePlayer
            animationData={duckAnimation}
            style={{ width: '100%', height: '100%' }}
            loop
            autoplay
            rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
          />
        </div>
        <h2 className="text-2xl font-bold text-foreground mt-4 mb-2">{t.inviteFriends}</h2>
        <p className="text-muted-foreground text-center max-w-2xl mb-4">
          {t.inviteText}
        </p>
      </div>
      <div className="bg-card border border-border dark:border-border/30 rounded-xl shadow-md p-6 flex flex-col items-center w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-4">{t.referral}</h3>
        <div className="w-full flex items-center space-x-2 mb-4">
          <input
            type="text"
            readOnly
            value={referralLink}
            className="flex-1 bg-transparent p-2 rounded-lg text-sm text-foreground border border-border dark:border-border/30 focus:outline-none w-full"
          />
          <button
            onClick={handleCopy}
            className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md hover:from-purple-600 hover:to-indigo-600 rounded-lg"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
            </svg>
          </button>
        </div>
        <button
          onClick={handleShare}
          className="flex items-center justify-center w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md hover:from-purple-600 hover:to-indigo-600 rounded-lg py-3 px-6 text-sm font-medium transform hover:scale-105"
        >
          <Share2 className="w-5 h-5 mr-2" />
          {t.share}
        </button>
      </div>
      <div className="bg-card border border-border dark:border-border/30 rounded-xl shadow-md p-6 flex flex-col items-center w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-4">{t.invited}</h3>
        {invitedUsers.length > 0 ? (
          <>
            <div className="w-full space-y-4">
              {(showAll ? invitedUsers : invitedUsers.slice(-3)).map((user, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-lg border border-purple-200 dark:border-purple-700 shadow hover:scale-105 transition-transform"
                >
                  <img
                    src={
                      user.photoUrl && user.photoUrl.length > 10
                        ? `/api/telegram-photo?file_id=${user.photoUrl}`
                        : '/images/default-avatar.png'
                    }
                    alt={user.name}
                    className="w-10 h-10 rounded-full border-2 border-purple-400 shadow-md"
                  />
                  <span className="text-base font-semibold text-foreground">{user.name}</span>
                </div>
              ))}
            </div>
            {invitedUsers.length > 3 && (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="mt-4 flex items-center text-purple-500 hover:text-purple-700 transition-colors text-sm font-medium"
              >
                {showAll ? <ChevronUp className="w-5 h-5 mr-1" /> : <ChevronDown className="w-5 h-5 mr-1" />}
                {showAll ? (language === 'ru' ? 'Скрыть' : 'Show Less') : (language === 'ru' ? 'Показать всех' : 'Show All')}
              </button>
            )}
          </>
        ) : (
          <p className="text-muted-foreground text-sm">{t.noInvited}</p>
        )}
      </div>
    </div>
  );
} 