/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: "#FAF7EE",
          100: "#F5EFDB",
          200: "#EBDDB7",
          300: "#DFC78E",
          400: "#D4B66B",
          500: "#C6A45B", // Champagne gold signature
          600: "#AB8943",
          700: "#86692E",
          800: "#654F22",
          900: "#493917",
        },
        violet: {
          50: "#F8F5FB",
          100: "#F0EAF6",
          200: "#E0D3EB",
          300: "#C7B1DC",
          400: "#9C76C2",
          500: "#6F4A91", // Royal violet
          600: "#5D3C7C",
          700: "#4B2E65",
          800: "#38204E",
          900: "#271439",
        },
        blush: {
          50: "#FAF5F8",
          100: "#F5EAF1",
          200: "#EAD0E0", // Blush pink signature
          300: "#DCB1CD",
          400: "#C98BB3",
          500: "#B46597",
          600: "#984F7C",
        },
        plum: {
          DEFAULT: "#21182A", // Deep plum
          dark: "#17101E",
          light: "#2E233B",
          surface: "#2A1F36",
        },
        cream: {
          DEFAULT: "#FFF9F2", // Vanilla cream
          muted: "#F7EFE4",
          card: "#FFFFFF",
          border: "#EFE5D6",
        },
        cocoa: {
          DEFAULT: "#4A2926", // Cocoa brown
          light: "#663935",
          dark: "#331B19",
        },
        neutralMuted: {
          DEFAULT: "#766D78",
          light: "#A49CA6",
          border: "#D8D2DA",
        },
      },
      fontFamily: {
        serif: ["'Playfair Display'", "Georgia", "Cambria", "'Times New Roman'", "serif"],
        sans: ["'Plus Jakarta Sans'", "Inter", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
      },
      boxShadow: {
        gold: "0 4px 20px -2px rgba(198, 164, 91, 0.25)",
        luxury: "0 10px 30px -5px rgba(33, 24, 42, 0.08)",
        "luxury-lg": "0 20px 40px -10px rgba(33, 24, 42, 0.15)",
      },
    },
  },
  plugins: [],
};
