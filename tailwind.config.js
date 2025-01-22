/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FFE51D',
        dark: '#221E19',
        light: '#FCFAF3',
        secondary: {
          honey: '#FFF184',
          orange: '#F27C08',
        },
        tertiary: {
          blue: '#67D1EF',
          darkBlue: '#0B5AD5',
          cyan: '#79E5E4',
          green: '#42DB98',
          pink: '#F88396',
        }
      },
      fontFamily: {
        codec: ['Codec Pro', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

