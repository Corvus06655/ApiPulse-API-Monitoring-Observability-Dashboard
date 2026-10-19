/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        graphite: '#0b0d0e',
        panel: '#111415',
        lime: '#b8ff64',
        teal: '#36dcc8',
      },
    },
  },
  plugins: [],
};
