/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        bg2: 'var(--color-bg2)',
        bg3: 'var(--color-bg3)',
        surface: 'var(--color-surface)',
        border: 'var(--color-border)',
        border2: 'var(--color-border2)',
        accent: 'var(--color-accent)',
        accent2: 'var(--color-accent2)',
        text: 'var(--color-text)',
        text2: 'var(--color-text2)',
        text3: 'var(--color-text3)',
      },
      fontFamily: {
        heading: ['Plus Jakarta Sans', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease both',
        'fade-up-2': 'fadeUp 0.4s 0.1s ease both',
        'fade-up-3': 'fadeUp 0.4s 0.2s ease both',
        'fade-up-4': 'fadeUp 0.4s 0.3s ease both',
      },
    },
  },
  plugins: [],
};
