import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: '#102A43',
          ocean: '#0F766E',
          clay: '#F97316',
          mint: '#14B8A6',
          cream: '#FFF7ED',
        },
      },
      boxShadow: {
        card: '0 20px 55px -35px rgba(15, 118, 110, 0.55)',
      },
    },
  },
  plugins: [],
};

export default config;
