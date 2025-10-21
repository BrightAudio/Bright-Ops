/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{ts,tsx,js,jsx,mdx}',
    './pages/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './src/**/*.{ts,tsx,js,jsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
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
      },
      boxShadow: {
        xl: '0 4px 24px 0 rgba(0,0,0,0.18)',
      },
    },
  },
  plugins: [],
};
