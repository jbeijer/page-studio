/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
          active: '#1D4ED8'
        },
        secondary: {
          DEFAULT: '#6B7280',
          hover: '#4B5563',
          active: '#374151'
        },
        accent: {
          green: '#10B981',
          orange: '#F59E0B',
          red: '#EF4444'
        },
        canvas: {
          background: '#F9FAFB',
          grid: '#E5E7EB',
          guides: '#3B82F6',
          selection: 'rgba(59, 130, 246, 0.3)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      fontSize: {
        'xs': '12px',
        'sm': '14px',
        'base': '16px',
        'lg': '18px',
        'xl': '20px',
        '2xl': '24px'
      }
    }
  },
  plugins: []
}