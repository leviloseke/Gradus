/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Claude-style terracotta accent
        primary: {
          DEFAULT: '#C96442',
          50: '#FBF5F1', 100: '#F5E6DC', 200: '#EBCDBB', 300: '#E2B098',
          400: '#DC9476', 500: '#D97757', 600: '#C96442', 700: '#A84E31',
          800: '#8A4129', 900: '#703723',
        },
        // Warm charcoal dark-mode surfaces
        dark: {
          DEFAULT: '#262624', 2: '#30302E', 3: '#3E3E3A', 4: '#52524E',
          5: '#6E6E68', 6: '#9B9A93', 7: '#C9C7BE', 8: '#E8E6DC',
        },
        // Remap gray to warm neutrals so existing text-gray-*/bg-gray-* warm up too
        gray: {
          50: '#FAF9F5', 100: '#F0EEE6', 200: '#E8E6DC', 300: '#D5D2C8',
          400: '#A6A39A', 500: '#87867F', 600: '#6B6A63', 700: '#4D4C45',
          800: '#34332E', 900: '#21201C', 950: '#161512',
        },
        stroke: '#E8E6DC',
        'body-color': '#6B6A63',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(38, 38, 36, 0.08), 0 1px 2px -1px rgba(38, 38, 36, 0.06)',
        'card-dark': '0 1px 3px 0 rgba(0, 0, 0, 0.35)',
      },
      fontFamily: {
        sans: [
          'Inter', 'ui-sans-serif', 'system-ui', '-apple-system',
          'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
