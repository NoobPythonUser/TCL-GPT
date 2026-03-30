import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#09090B",
        card: "#111116",
        border: "#232329",
        accent: "#39FF14",
        accentBlue: "#00D1FF"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        soft: "0 8px 30px rgba(0,0,0,0.35)"
      }
    }
  },
  plugins: []
};

export default config;
