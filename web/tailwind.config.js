/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-nunito)', 'system-ui', 'sans-serif'],
        display: ['var(--font-nunito)', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#7c3aed',
          600: '#6d28d9',
          700: '#5b21b6',
          800: '#4c1d95',
          900: '#3b0764',
        },
        accent: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        // Warm daycare accent (soft orange/peach – friendly, welcoming)
        warm: {
          50: '#fffbf5',
          100: '#fff4e6',
          200: '#ffe4c4',
          300: '#ffd4a0',
          400: '#ffb366',
          500: '#f59e0b',
          600: '#ea8c2c',
          700: '#c4731f',
          800: '#9c5d1a',
          900: '#7d4b14',
        },
      },
      borderRadius: {
        'card': '1.25rem',
        'card-lg': '1.5rem',
      },
      boxShadow: {
        soft: '0 2px 16px -4px rgba(124, 58, 237, 0.06), 0 4px 8px -2px rgba(0, 0, 0, 0.04)',
        card: '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 12px 32px -12px rgba(124, 58, 237, 0.18), 0 8px 20px -8px rgba(0, 0, 0, 0.08)',
        'card-raised': '0 20px 40px -16px rgba(124, 58, 237, 0.15), 0 12px 24px -8px rgba(0, 0, 0, 0.06)',
        glow: '0 0 24px -4px rgba(124, 58, 237, 0.25), 0 0 48px -12px rgba(20, 184, 166, 0.15)',
        'glow-sm': '0 0 16px -4px rgba(124, 58, 237, 0.2)',
        'input-focus': '0 0 0 3px rgba(124, 58, 237, 0.25)',
        header: '0 1px 0 0 rgb(0 0 0 / 0.05), 0 2px 8px -2px rgb(0 0 0 / 0.04)',
        'btn-hover': '0 8px 20px -4px rgba(124, 58, 237, 0.35), 0 4px 12px -2px rgba(0, 0, 0, 0.1)',
      },
      transitionDuration: {
        250: '250ms',
        350: '350ms',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
        bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.45s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'stagger-in': 'staggerIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeInUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        staggerIn: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'gradient-shift': { '0%, 100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
      },
      backgroundImage: {
        'dots': 'radial-gradient(circle at 1px 1px, rgb(0 0 0 / 0.06) 1px, transparent 0)',
        'dots-dark': 'radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.06) 1px, transparent 0)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh': 'linear-gradient(135deg, var(--tw-gradient-from) 0%, transparent 50%), linear-gradient(225deg, var(--tw-gradient-to) 0%, transparent 50%)',
      },
      backgroundSize: {
        'dots': '24px 24px',
      },
    },
  },
  plugins: [],
};
