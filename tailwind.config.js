/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      colors: {
        agotado: {
          bg: '#fef2f2',
          border: '#fca5a5',
          text: '#dc2626'
        },
        nuevo: {
          bg: '#eff6ff',
          border: '#93c5fd',
          text: '#2563eb'
        }
      }
    }
  },
  plugins: []
};
