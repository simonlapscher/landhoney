/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: '#221E19',
        light: '#FCFAF3',
        primary: {
          DEFAULT: '#FFE51D',
          dark: '#E5CE1A',
          light: '#FFF184',
        },
        secondary: {
          DEFAULT: '#2B2B2B',
          dark: '#1A1A1A',
          light: '#3C3C3C',
        },
        tertiary: {
          DEFAULT: '#F2F2F2',
          dark: '#E6E6E6',
          light: '#FFFFFF',
        },
      },
      fontFamily: {
        codec: ['Codec Pro', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

