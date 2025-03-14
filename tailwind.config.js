/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        montserrat: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

module.exports = {
  darkMode: 'media', // ou 'media' se quiser ativar automaticamente pelo sistema
  theme: {
    extend: {},
  },
  plugins: [],
};