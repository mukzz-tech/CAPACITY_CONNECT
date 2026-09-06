/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        imd: {
          blue: '#0a3663',
          dark: '#06203d',
          gold: '#c59b27',
          sky: '#1e88e5',
          light: '#f4f8fc',
          accent: '#0d9488',
        },
      },
    },
  },
  plugins: [],
}
