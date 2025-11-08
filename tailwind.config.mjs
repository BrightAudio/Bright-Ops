/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './app/**/*.{ts,tsx,js,jsx,mdx}',
    './pages/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './src/**/*.{ts,tsx,js,jsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter var"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#3b82f6', // blue-500
        },
        surface: {
          DEFAULT: '#18181b', // zinc-900
          light: '#27272a',   // zinc-800
        },
        border: {
          DEFAULT: '#1f2937', // gray-800
        },
        'rentman-blue': '#0070F0',
        'rentman-light': '#F5F8FC',
        'rentman-dark': '#1C2A39',
        'rentman-accent': '#00B3A4',
      },
      boxShadow: {
        xl: '0 4px 24px 0 rgba(0,0,0,0.18)',
      },
    },
  },
  plugins: [],
};

export default config;
