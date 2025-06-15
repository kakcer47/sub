/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Rubik', 'sans-serif'],
      },
      colors: {
        primary: '#383838',
        secondary: '#626262',
        background: '#f8f7f6',
      },
      backdropBlur: {
        modal: '10px',
        '2px': '2px',
      },
      animation: {
        'spin-slow': 'spin 1s linear infinite',
      },
      backgroundImage: {
        'dot-grid': 'radial-gradient(circle, rgba(150,150,150,0.3) 1px, transparent 1px)',
      },
      backgroundSize: {
        '12px': '12px 12px',
      },
    },
  },
  plugins: [],
};