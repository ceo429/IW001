import type { Config } from 'tailwindcss';

/**
 * Tailwind configuration.
 *
 * The brand palette (`brand.*`) mirrors the spec's #EAB308 gold — define it
 * in ONE place so components can just write `bg-brand-500` instead of
 * sprinkling hex values.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde68a',
          400: '#facc15',
          500: '#eab308', // primary
          600: '#ca9a06', // secondary
          700: '#a16207',
          800: '#8b6914', // accent
          900: '#713f12',
        },
      },
      fontFamily: {
        sans: [
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
