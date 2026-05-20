import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bgPrimary: "#0A0F1E",
        bgCard: "#1A2340",
        accent: "#00D4AA",
        accentHover: "#00B896",
        textPrimary: "#FFFFFF",
        textSecondary: "#8B9EC7",
        borderColor: "#1E2D4A",
        error: "#FF4D6D",
      },
    },
  },
  plugins: [],
};
export default config;
