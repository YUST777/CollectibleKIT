'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface CelebrationModalProps {
  isOpen: boolean;
  isFirstWin: boolean;
  onClose: () => void;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({ 
  isOpen, 
  isFirstWin,
  onClose 
}) => {
  useEffect(() => {
    if (isOpen) {
      // Launch confetti explosion
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Additional burst after a short delay
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 300);

      // Auto-close after 2.5 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-6 pointer-events-none">
        {/* Big Reward Text */}
        <div className="text-8xl font-bold text-white drop-shadow-2xl animate-bounce">
          {isFirstWin ? '+0.1 TON' : '+1'}
        </div>
        
        {/* Reward Label */}
        <div className="text-2xl text-white/90 drop-shadow-lg">
          {isFirstWin ? 'First Win Bonus!' : 'Credit Earned!'}
        </div>
      </div>
    </div>
  );
};
