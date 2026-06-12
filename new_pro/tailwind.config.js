/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sovereign: {
          bg: '#FBF7EE',
          accent: '#CB5534',
          'accent-hover': '#B24629',
          primary: '#1E1A17',
          secondary: '#5C524C',
          muted: '#8E8279',
          card: '#FFFFFF',
          alt: '#F5EFEB',
          border: '#E2D9CD',
          'border-strong': '#CB5534',
        }
      },
      fontFamily: {
        sans: ['var(--font-body)', 'sans-serif'],
        display: ['var(--font-display)', 'sans-serif'],
        serif: ['var(--font-serif)', 'serif'],
      },
      keyframes: {
        particleRise: {
          '0%': { transform: 'translateY(100vh) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(-20px) rotate(360deg)', opacity: '0' },
        },
      },
      animation: {
        'particle-rise': 'particleRise linear infinite',
      },
    },
  },
  plugins: [],
}
