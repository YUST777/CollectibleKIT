'use client'

import { useEffect, useState, useRef } from 'react'
import { useAppState } from '@/lib/state'
import { getTelegramWebApp } from '@/lib/telegram'
import type { Item } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { X, Send } from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  extractItemNumber,
  getBaseName,
  getFragmentImageUrl,
  getTelegramGiftLink,
  getModelNameFromAttributes
} from '@/lib/utils'

interface ItemModalProps {
  item: Item
  onClose: () => void
}

export function ItemModal({ item, onClose }: ItemModalProps) {
  const { state } = useAppState()
  const { theme } = useTheme()
  const tg = getTelegramWebApp()
  const [isClient, setIsClient] = useState(false)
  const [closing, setClosing] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  const isDarkMode = theme === 'dark'

  // Get collection name - either from state or item name
  const getCollectionName = (): string => {
    // Make sure we're getting the proper collection name, not including any ID or number portion
    const nameFromState = state.collectionData?.giftName;
    if (nameFromState) {
      // Make sure it doesn't have '#' or other ID markers
      return nameFromState.split('#')[0].trim();
    }
    
    // Fallback to item name
    return getBaseName(item.name);
  }

  const collectionName = getCollectionName();
  const itemNumber = extractItemNumber(item.name, item.id);

  // Generate image URLs using fragment URLs (not CDN)
  const fragmentImageUrl = getFragmentImageUrl(collectionName, itemNumber, 'webp');
  const fragmentJpgUrl = getFragmentImageUrl(collectionName, itemNumber, 'jpg');
  const fragmentPngUrl = getFragmentImageUrl(collectionName, itemNumber, 'png');

  // Generate Telegram link
  const telegramLink = getTelegramGiftLink(collectionName, itemNumber);

  // Debug log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`Modal showing gift image for ${collectionName}: ${fragmentImageUrl}`);
  }

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      closeWithAnimation()
    }
  }

  // Creative close with animation
  const closeWithAnimation = () => {
    setClosing(true)
    setTimeout(() => {
      onClose()
    }, 300) // Match this with CSS transition duration
  }

  useEffect(() => {
    setIsClient(true)
    const scrollY = window.scrollY
    document.body.classList.add('modal-open')
    document.body.style.top = `-${scrollY}px`

    // Show Telegram back button
    tg.BackButton.show()
    tg.BackButton.onClick(closeWithAnimation)

    // Add escape key listener
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeWithAnimation()
      }
    }
    window.addEventListener('keydown', handleEscape)

    return () => {
      document.body.classList.remove('modal-open')
      document.body.style.top = ''
      window.scrollTo(0, scrollY)
      tg.BackButton.hide()
      tg.BackButton.offClick(closeWithAnimation)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [tg.BackButton])

  if (!isClient) return null

  // Dark mode colors
  const colors = {
    backdrop: isDarkMode ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.75)',
    background: isDarkMode ? '#1c1c1e' : 'white',
    cardBg: isDarkMode ? '#2c2c2e' : 'white',
    border: isDarkMode ? '#3c3c3e' : '#eee',
    text: isDarkMode ? '#f2f2f7' : '#333',
    textSecondary: isDarkMode ? '#d1d1d6' : '#666',
    headerBg: isDarkMode ? '#2c2c2e' : 'white',
    sectionBg: isDarkMode ? '#1c1c1e' : '#f8f9fa',
    attributeBg: isDarkMode ? '#2c2c2e' : '#f8f9fa',
    shadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.2)',
    buttonBg: isDarkMode ? '#0088cc' : '#0088cc',
    buttonShadow: isDarkMode ? 'rgba(0,136,204,0.4)' : 'rgba(0,136,204,0.3)',
    closeButtonBg: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border dark:border-border/30 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in relative">
        {/* Close button */}
        <button
          onClick={closeWithAnimation}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 2,
            width: '32px',
            height: '32px',
            borderRadius: '16px',
            backgroundColor: colors.closeButtonBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 150ms ease',
            WebkitTapHighlightColor: 'transparent'
          }}
          onTouchStart={(e) => {
            e.currentTarget.style.backgroundColor = isDarkMode
              ? 'rgba(255,255,255,0.3)'
              : 'rgba(0,0,0,0.25)'
          }}
          onTouchEnd={(e) => {
            e.currentTarget.style.backgroundColor = colors.closeButtonBg
          }}
        >
          <X size={18} color="white" />
        </button>

        {/* Header (fixed) */}
        <div style={{
          padding: '16px',
          paddingRight: '44px',
          borderBottom: `1px solid ${colors.border}`,
          backgroundColor: colors.headerBg,
          position: 'sticky',
          top: 0,
          zIndex: 1
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: colors.text
          }}>{item.name}</h2>
        </div>

        {/* Scrollable content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          background: colors.background
        }}>
          {/* Image */}
          <div style={{
            padding: '16px',
            backgroundColor: colors.sectionBg
          }}>
            <div style={{
              aspectRatio: '1/1',
              backgroundColor: colors.cardBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
              border: isDarkMode ? `1px solid ${colors.border}` : 'none'
            }}>
              {/* Debug information */}
              {process.env.NODE_ENV === 'development' && (
                <div style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  background: 'rgba(0,0,0,0.7)', 
                  color: 'white',
                  padding: '4px',
                  fontSize: '10px',
                  zIndex: 10,
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'none'  // Hidden by default, for debugging set to 'block'
                }}>
                  Collection: {collectionName}
                </div>
              )}
              
              <img
                src={fragmentImageUrl}
                alt={item.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  console.error(`Failed to load image: ${target.src}`);
                  
                  if (target.src === fragmentImageUrl || target.src.includes('webp')) {
                    target.src = fragmentJpgUrl;
                  } else if (target.src === fragmentJpgUrl || target.src.includes('jpg')) {
                    target.src = fragmentPngUrl;
                  }
                }}
              />
            </div>
          </div>

          {/* Attributes */}
          <div style={{
            padding: '16px',
            backgroundColor: colors.background
          }}>
            <div style={{
              borderRadius: '12px',
              overflow: 'hidden',
              border: `1px solid ${colors.border}`
            }}>
              <div style={{
                display: 'flex',
                padding: '12px',
                backgroundColor: colors.attributeBg,
                borderBottom: `1px solid ${colors.border}`
              }}>
                <div style={{
                  width: '40%',
                  fontWeight: '600',
                  fontSize: '14px',
                  color: colors.text
                }}>ID</div>
                <div style={{
                  width: '60%',
                  fontSize: '14px',
                  color: colors.textSecondary
                }}>{item.id}</div>
              </div>

              {item.attributes?.map((attr, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    padding: '12px',
                    borderBottom: index < (item.attributes?.length || 0) - 1 ? `1px solid ${colors.border}` : 'none'
                  }}
                >
                  <div style={{
                    width: '40%',
                    fontWeight: '600',
                    fontSize: '14px',
                    color: colors.text
                  }}>
                    {attr.trait_type}
                  </div>
                  <div style={{
                    width: '60%',
                    fontSize: '14px',
                    color: colors.textSecondary
                  }}>
                    {attr.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Button (fixed) */}
        <div style={{
          padding: '16px',
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: colors.background,
          position: 'sticky',
          bottom: 0
        }}>
          <a href={telegramLink} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <Button className="w-full h-12" style={{
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '500',
              background: colors.buttonBg,
              boxShadow: `0 4px 12px ${colors.buttonShadow}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <Send size={17} style={{ marginRight: '6px' }} />
              Send in Telegram
          </Button>
          </a>
        </div>
      </div>
    </div>
  )
}
