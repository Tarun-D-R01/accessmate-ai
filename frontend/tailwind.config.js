/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          indigo: '#4338CA',
          blue: '#2563EB',
          offwhite: '#F8FAFC',
          slate: '#0F172A',
          teal: '#0D9488',
        },
      },
      fontFamily: {
        sans: ['"Atkinson Hyperlegible"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
