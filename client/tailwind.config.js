/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        bg: '#f6f5f1',
        ink: '#1f1e1a',
        muted: '#7a766a',
        line: '#e7e4da',
        track: '#eeece4',
        accent: {
          DEFAULT: '#2f5d50',
          hover: '#264a40',
          soft: '#e6efeb',
        },
        warn: {
          DEFAULT: '#b86e00',
          soft: '#fff4df',
        },
        danger: {
          DEFAULT: '#b03a2e',
          soft: '#fbeceb',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgb(0 0 0 / 0.04), 0 4px 14px rgb(0 0 0 / 0.05)',
        lift: '0 10px 30px rgb(0 0 0 / 0.10)',
      },
      keyframes: {
        grow: { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        grow: 'grow .9s cubic-bezier(.2,.8,.2,1) both',
        fadeUp: 'fadeUp .4s ease-out both',
      },
    },
  },
  plugins: [],
};