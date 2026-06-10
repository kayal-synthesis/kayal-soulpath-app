/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Your core identity (keep these)
        primary: {
          50: '#F2EEFF',
          100: '#E5DBFF',
          200: '#CBB7FF',
          300: '#B193FF',
          400: '#8A6BFF',
          500: '#7A5AF5',
          600: '#5D3FD3',
          700: '#3F2A7A',
          800: '#2D1F5E',
          900: '#1A103C',
        },
        secondary: {
          50: '#FDF8E9',
          100: '#FBEFD3',
          200: '#F7DFA7',
          300: '#F3CF7B',
          400: '#E5C87B',
          500: '#D4AF37',
          600: '#B8860B',
          700: '#8B6508',
          800: '#5D4305',
          900: '#2E2203',
        },
        
        // NEW: Action colors for conversion
        action: {
          50: '#FFEFED',
          100: '#FED7D2',
          200: '#FDB6AB',
          300: '#FC9584',
          400: '#FA745D',
          500: '#E94F37',
          600: '#C43C27',
          700: '#9F2C1B',
          800: '#7A1E10',
          900: '#551108',
        },
        
        // NEW: Trust colors for security
        trust: {
          50: '#E6F6F6',
          100: '#CCEDED',
          200: '#99DBDB',
          300: '#66C9C9',
          400: '#33B7B7',
          500: '#2C7A7B',
          600: '#236262',
          700: '#1A4949',
          800: '#123131',
          900: '#091818',
        },
        
        // NEW: Domain-specific accents
        domain: {
          love: '#F687B3',      // Pink
          career: '#4FD1C5',     // Turquoise
          wealth: '#F6AD55',     // Orange
          spiritual: '#9F7AEA',  // Light purple
          health: '#68D391',      // Green
          'life-path': '#7A5AF5', // Your primary
        },
        
        // Enhanced neutrals
        neutral: {
          50: '#FCFAF8',
          100: '#F7F5F2',
          200: '#F0EDE8',
          300: '#E5E0D9',
          400: '#CBC3B9',
          500: '#9B8F82',
          600: '#6B6258',
          700: '#4A4A4A',
          800: '#2D2D2D',
          900: '#1A1A1A',
        },
        
        // Keep your semantic colors
        success: '#2E5C4E',
        warning: '#E67E22',
        error: '#DC2626',
        info: '#4A6FA5',
      },
      
      // NEW: Gradient combinations
      backgroundImage: {
        'gradient-spiritual': 'linear-gradient(135deg, #1A103C 0%, #5D3FD3 100%)',
        'gradient-action': 'linear-gradient(135deg, #E94F37 0%, #FF6B4A 100%)',
        'gradient-trust': 'linear-gradient(135deg, #2C7A7B 0%, #4FD1C5 100%)',
        'gradient-wealth': 'linear-gradient(135deg, #B8860B 0%, #D4AF37 100%)',
        'gradient-love': 'linear-gradient(135deg, #F687B3 0%, #FFB6C1 100%)',
      },
      
      // NEW: Animation variants
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'gradient': 'gradient 3s ease infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
}