'use client'

import { getTelegramWebApp } from '@/lib/telegram'
import React from 'react'
import { useLanguage } from './app-provider'
import { translations } from '@/lib/translations'
import { Clock, Info, Users, TrendingUp } from 'lucide-react'

export function ComingSoonSection() {
  const tg = getTelegramWebApp()
  const { language } = useLanguage()
  const lang: 'en' | 'ru' = language === 'ru' ? 'ru' : 'en'
  const t = translations[lang].comingSoon

  // Handle Telegram channel link click
  const handleChannelClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const url = 'https://t.me/Gift_Catalog'
    if (tg && typeof (window as any).Telegram?.WebApp?.openLink === 'function') {
      (window as any).Telegram.WebApp.openLink(url)
    } else {
      window.open(url, '_blank')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in space-y-6">
      <div className="bg-card border border-border dark:border-border/30 rounded-xl shadow-md p-6 backdrop-filter backdrop-blur-lg bg-opacity-90 dark:bg-opacity-60 animate-scale-in">
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 mb-6 relative flex items-center justify-center">
            <Clock className="w-16 h-16 text-amber-500" />
            <div className="absolute inset-0">
              <svg
                className="w-24 h-24 text-amber-500/30 animate-spin-slow"
                viewBox="0 0 100 100"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  pathLength="100"
                  strokeLinecap="round"
                  strokeDasharray="10 15"
                  strokeDashoffset="0"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
            <Info className="w-6 h-6 mr-2 text-amber-500" />
            {t.comingSoon}
          </h2>
          <p className="text-muted-foreground text-center max-w-lg mb-4">
            {t.info}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-card border border-border dark:border-border/30 rounded-xl shadow-md p-5 backdrop-filter backdrop-blur-lg bg-opacity-90 dark:bg-opacity-60 hover:shadow-lg transition-all duration-300 flex flex-col animate-slide-up" style={{ animationDelay: '0ms' }}>
          <div className="p-4 rounded-lg mb-4 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 dark:from-purple-500/20 dark:to-indigo-500/20 animate-pulse-soft">
            <Users className="w-10 h-10 text-purple-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{t.partners}</h3>
          <p className="text-muted-foreground text-sm flex-grow">
            {t.partnersDesc}
          </p>
          <div className="flex justify-between mt-4 items-center">
            <a
              href="https://t.me/yousefmsm1"
              onClick={(e) => {
                e.preventDefault()
                if (tg && typeof (window as any).Telegram?.WebApp?.openLink === 'function') {
                  (window as any).Telegram.WebApp.openLink('https://t.me/yousefmsm1')
                } else {
                  window.open('https://t.me/yousefmsm1', '_blank')
                }
              }}
              className="text-xs text-purple-500 hover:underline transition-all duration-300 hover:text-purple-600"
            >
              {t.contact}
            </a>
            <span className="text-xs px-3 py-1 bg-purple-500/10 text-purple-500 dark:bg-purple-500/20 dark:text-purple-400 rounded-full">{t.comingSoon}</span>
          </div>
        </div>
        <div className="bg-card border border-border dark:border-border/30 rounded-xl shadow-md p-5 backdrop-filter backdrop-blur-lg bg-opacity-90 dark:bg-opacity-60 hover:shadow-lg transition-all duration-300 flex flex-col animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="p-4 rounded-lg mb-4 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 animate-pulse-soft">
            <TrendingUp className="w-10 h-10 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{t.giftForbes}</h3>
          <p className="text-muted-foreground text-sm flex-grow">
            {t.giftForbesDesc}
          </p>
          <div className="flex justify-end mt-4">
            <span className="text-xs px-3 py-1 bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400 rounded-full">{t.comingSoon}</span>
          </div>
        </div>
      </div>
      {/* Call to Action */}
      <div className="bg-card border border-border dark:border-border/30 rounded-xl shadow-md p-6 backdrop-filter backdrop-blur-lg bg-opacity-90 dark:bg-opacity-60 animate-scale-in" style={{ animationDelay: '300ms' }}>
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-semibold mb-4">{t.stayUpdated}</h3>
          <a
            href="https://t.me/Gift_Catalog"
            onClick={handleChannelClick}
            className="flex items-center justify-center w-full sm:w-auto bg-amber-500 hover:bg-amber-600 dark:bg-purple-600 dark:hover:bg-purple-700 transition-all duration-300 rounded-lg py-3 px-6 text-sm font-medium text-white transform hover:scale-105"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.665,3.717l-17.73,6.837c-1.21,0.486-1.203,1.161-0.222,1.462l4.552,1.42l10.532-6.645c0.498-0.303,0.953-0.14,0.579,0.192l-8.533,7.701l0,0l0,0H9.841l0.002,0.001l-0.314,4.692c0.46,0,0.663-0.211,0.921-0.46l2.211-2.15l4.599,3.397c0.848,0.467,1.457,0.227,1.668-0.785l3.019-14.228c0.309-1.239-0.473-1.8-1.282-1.434z" />
            </svg>
            {t.followChannel}
          </a>
          <p className="text-xs text-muted-foreground mt-4">
            {t.beFirst}
          </p>
        </div>
      </div>
    </div>
  )
} 