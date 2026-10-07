/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // URnetwork brand tokens — source of truth: urnetwork/elements src/index.css
        'ur-black': '#101010',
        'ur-white': '#f8f8f8',
        'ur-blue': '#0039de',
        'ur-blue-hover': '#2657e3', // color-mix(ur-blue 85%, white 15%)
        'ur-blue-disabled': '#4d74e8', // color-mix(ur-blue 70%, white 30%)
        'ur-blue-light': '#d6e6f4',
        'ur-navy': '#1a1460',
        'ur-green': '#87fb67',
        'ur-pink': '#ed8fff',
        'ur-coral': '#ff6c58',
        'ur-coral-hover': '#ff8271', // color-mix(ur-coral 85%, white 15%)
        'ur-yellow-light': '#eff7bb',
        'ur-maroon': '#421006',
        'ur-gray': '#b7b7b7',
        'ur-gray-dark': '#909090',
        // Surface elevation = ur-black tinted with white (elements uses color-mix)
        'ur-tint': '#151515', // 2% white
        'ur-panel': '#1c1c1c', // 5% white
        'ur-raised': '#212121', // 7% white
        'ur-hover': '#282828', // 10% white
        'ur-border': '#282828', // 10% white
        'ur-active': '#343434', // 15% white
      },
      fontFamily: {
        sans: [
          'PpNeueMontrealRegular',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        display: ['AbcGravityExtended', 'system-ui', 'sans-serif'],
        condensed: ['AbcGravityExtraCondensed', 'system-ui', 'sans-serif'],
        pixel: ['PpNeueBitBold', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        ur: '0.8rem',
        'ur-sm': '0.5rem',
      },
      boxShadow: {
        'ur-flat': '4px 4px 0 rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
};
