/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eaf3de',
          100: '#c0dd97',
          200: '#97c459',
          400: '#639922',
          600: '#3b6d11',
          800: '#27500a',
          900: '#173404x',
        }
      },
      fontFamily: {
        sans: ['Noto Sans', 'sans-serif'],
      }
    }
  },
  plugins: []
}