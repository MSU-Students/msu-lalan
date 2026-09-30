import type { Config } from 'tailwindcss';

export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './error.vue',
  ],
  theme: {
    extend: {
      colors: {
        msu: {
          maroon: '#800000',
          'maroon-dark': '#5a0000',
          'maroon-light': '#9e1b1b',
          gold: '#FFD700',
          'gold-dark': '#cca700',
          'gold-light': '#ffeb60',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
