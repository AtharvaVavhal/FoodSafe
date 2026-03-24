/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'SF Pro Display', 'sans-serif'],
        serif: ['Instrument Serif', 'Playfair Display', 'serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        background: '#04090e',
        surface: {
          50:  'rgba(255,255,255,0.02)',
          100: 'rgba(255,255,255,0.04)',
          200: 'rgba(255,255,255,0.08)',
          300: 'rgba(255,255,255,0.12)',
        },
        brand: {
          light: '#6effd9',
          DEFAULT: '#00e09c',
          dark: '#00a674',
          glow: 'rgba(0, 224, 156, 0.4)',
        },
        gold: {
          light: '#ffebb0',
          DEFAULT: '#f5c842',
          dark: '#c9a84c',
        }
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
        'halo-green': 'radial-gradient(ellipse at top, rgba(0, 224, 156, 0.15) 0%, transparent 60%)',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    }
  },
  plugins: []
}