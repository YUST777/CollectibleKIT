'use client';

import React from 'react';
import { ButtonProps } from '@/types';
import { clsx } from 'clsx';

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  children,
  className,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-icon-active text-icon-white hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 focus:ring-icon-active',
    secondary: 'bg-box-bg text-text-idle border border-icon-idle hover:bg-icon-idle/20 focus:ring-icon-idle',
    danger: 'bg-red-600 text-icon-white hover:opacity-90 focus:ring-red-600',
    ghost: 'text-text-idle hover:bg-icon-idle/20 focus:ring-icon-idle',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm min-h-[36px]',
    md: 'px-6 py-3 text-base min-h-[44px]',
    lg: 'px-8 py-4 text-lg min-h-[52px]',
  };

  return (
    <button
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        loading && 'cursor-wait',
        className
      )}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      )}
      {children}
    </button>
  );
};
