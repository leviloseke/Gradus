/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3758F9',
          50: '#F0F3FF', 100: '#DEE5FF', 200: '#C3D1FF', 300: '#9DB2FE',
          400: '#7B93FC', 500: '#5475FA', 600: '#3758F9', 700: '#2B43D6',
          800: '#2434AC', 900: '#222E85',
        },
        dark: {
          DEFAULT: '#111928', 2: '#1F2A37', 3: '#374151', 4: '#4B5563',
          5: '#6B7280', 6: '#9CA3AF', 7: '#D1D5DB', 8: '#E5E7EB',
        },
        stroke: '#DFE4EA',
        'body-color': '#637381',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(16, 24, 40, 0.08), 0 1px 2px -1px rgba(16, 24, 40, 0.06)',
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
