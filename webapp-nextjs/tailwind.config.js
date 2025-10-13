/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom theme colors
        'bg-main': '#0e1111',
        'icon-idle': '#7b7b7a',
        'icon-active': '#1689ff',
        'text-active': '#a9a9a9',
        'text-idle': '#6d6d71',
        'box-bg': '#282727',
        'icon-white': '#ffffff',
        
        // Legacy support
        'tg-bg': '#0e1111',
        'tg-text': '#6d6d71',
        'tg-hint': '#7b7b7a',
        'tg-link': '#1689ff',
        'tg-button': '#1689ff',
        'tg-button-text': '#ffffff',
        'tg-secondary-bg': '#282727',
        'tg-header-bg': '#0e1111',
        'tg-accent': '#1689ff',
        'tg-section-bg': '#282727',
        'tg-section-header': '#1689ff',
        'tg-subtitle': '#a9a9a9',
        'tg-destructive': '#ff3b30',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 1s infinite alternate',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(50px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-10px)' },
        },
      },
      boxShadow: {
        'tg': '0 2px 10px rgba(0, 0, 0, 0.1)',
        'tg-lg': '0 4px 20px rgba(0, 0, 0, 0.15)',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
