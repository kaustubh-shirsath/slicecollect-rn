/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#D30AD7',
          dark: '#A008A3',
          light: '#FAE2FA',
          violet: '#7B2FFF',
        },
        surface: {
          appBg: '#F0F4F7',
          card: '#FFFFFF',
          nearBlack: '#090B0C',
          darkText: '#1A1A1A',
          neutralPill: '#EAEBED',
          divider: '#E8E8E8',
          inputBg: '#F5F5F5',
        },
      },
    },
  },
  plugins: [],
}
