module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'heading': ['Cabinet Grotesk', 'sans-serif'],
        'body': ['IBM Plex Sans', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: '#5c59e8',
          50: '#f0efff',
          100: '#dcd9ff',
          200: '#bab3ff',
          300: '#988dff',
          400: '#7667ff',
          500: '#5c59e8',
          600: '#4a47d1',
          700: '#3936b1',
          800: '#28258f',
          900: '#1e1b71',
        },
        background: '#FFFFFF',
        surface: '#F4F4F5',
        'surface-hover': '#E4E4E7',
        border: '#D4D4D8',
        'text-main': '#09090B',
        'text-secondary': '#34374a',
        'primary-action': '#5c59e8',
        'primary-action-hover': '#4a47d1',
        'accent-warning': '#F59E0B',
        'accent-error': '#E11D48',
        'accent-success': '#10B981',
      },
      borderRadius: {
        'none': '0',
        'sm': '4px',
      },
    },
  },
  plugins: [],
}
