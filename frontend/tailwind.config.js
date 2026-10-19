/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        quantum: {
          dark: '#0a0d14',
          panel: '#121824',
          cyan: '#00f0ff',
          green: '#00ff88',
          yellow: '#ffbb00',
          red: '#ff0055',
          purple: '#aa00ff'
        }
      }
    },
  },
  plugins: [],
}
