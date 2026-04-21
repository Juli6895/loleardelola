import type { Config } from "tailwindcss";

// Configuración de Tailwind con la paleta de LolearDeLola
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta rosa palo / blanco / negro
        rosa: {
          50: "#fff5f7",
          100: "#ffe9ee",
          200: "#fbd3dc",
          300: "#f5b3c2",
          400: "#ec88a0",
          500: "#db627f",
          600: "#c34862",
          700: "#a23850",
          800: "#862f44",
          900: "#6e2838",
        },
        noche: "#111111",
      },
      fontFamily: {
        display: ["var(--font-playfair)", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        suave: "0 6px 30px -10px rgba(219, 98, 127, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
