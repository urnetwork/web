import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'ok': '#15cd72',
        'danger': '#CD4439',
        'primary': {
          DEFAULT: '#4148CD',
          'dark': '#292D80'
        },
        'secondary': {
          DEFAULT: '#A5ACB9'
        }
      }
    },
  },
  plugins: [],
}
export default config
