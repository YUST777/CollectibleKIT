'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { CatalogSection } from '@/components/catalog-section'
import { Pagination } from '@/components/pagination'
import { getTelegramWebApp } from '@/lib/telegram'
import { ProfileSection } from '@/components/profile-section'
import { InviteSection } from '@/components/invite-section'
import { BottomTabBar } from '@/components/BottomTabBar'
import { TasksSection } from '@/components/tasks-section'

export default function Home() {
  const [activeTab, setActiveTab] = useState('catalog')

  const renderContent = () => {
    switch (activeTab) {
      case 'catalog':
        return (
          <div key="catalog" className="page-enter">
            <Header />
            <CatalogSection />
            <Pagination />
          </div>
        )
      case 'tasks':
        return (
          <div key="tasks" className="page-enter">
            <TasksSection />
          </div>
        )
      case 'profile':
        return (
          <div key="profile" className="page-enter">
            <ProfileSection />
          </div>
        )
      case 'invite':
        return (
          <div key="invite" className="page-enter">
            <InviteSection />
          </div>
        )
      default:
        return null
    }
  }

  useEffect(() => {
    const tg = getTelegramWebApp()
    if (tg) {
      tg.ready()
      tg.expand()
    }

    // Add custom event listener for tab changes from other components
    const handleTabChange = (event: CustomEvent) => {
      if (event.detail && event.detail.tab) {
        setActiveTab(event.detail.tab);
      }
    };

    document.addEventListener('changeTab', handleTabChange as EventListener);
    
    return () => {
      document.removeEventListener('changeTab', handleTabChange as EventListener);
    };
  }, [])

  return (
    <main className="min-h-screen pb-20">
      <div className="container mx-auto px-4 py-6">
        {renderContent()}
      </div>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border dark:border-accent/20 shadow-lg flex justify-around items-center py-2 px-2 animate-fade-in">
        <button
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-all duration-300 ${
            activeTab === 'catalog' ? 'text-accent dark:text-accent' : 'text-gray-600 dark:text-gray-400'
          }`}
          onClick={() => setActiveTab('catalog')}
          aria-label="catalog tab"
        >
          <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span className="text-xs">Catalog</span>
        </button>

        <button
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-all duration-300 ${
            activeTab === 'tasks' ? 'text-accent dark:text-accent' : 'text-gray-600 dark:text-gray-400'
          }`}
          onClick={() => setActiveTab('tasks')}
          aria-label="tasks tab"
        >
          <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
          </svg>
          <span className="text-xs">Tasks</span>
        </button>

        <button
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-all duration-300 ${
            activeTab === 'profile' ? 'text-accent dark:text-accent' : 'text-gray-600 dark:text-gray-400'
          }`}
          onClick={() => setActiveTab('profile')}
          aria-label="profile tab"
        >
          <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
          <span className="text-xs">Profile</span>
        </button>

        <button
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-all duration-300 ${
            activeTab === 'invite' ? 'text-accent dark:text-accent' : 'text-gray-600 dark:text-gray-400'
          }`}
          onClick={() => setActiveTab('invite')}
          aria-label="invite tab"
        >
          <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
          </svg>
          <span className="text-xs">Invite</span>
        </button>
      </nav>
    </main>
  )
}
