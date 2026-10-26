import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/components/**/*.{js,ts,jsx,tsx,mdx}", "./src/app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "var(--font-arabic)", "system-ui", "Segoe UI", "Tahoma", "sans-serif"],
      },
      colors: {
        // Navy for structure, blue for action (enterprise "trust" palette).
        brand: {
          DEFAULT: "#0F172A",
          600: "#1E293B",
        },
        accent: {
          50: "#F0F9FF",
          100: "#E0F2FE",
          600: "#0284C7",
          700: "#0369A1",
          800: "#075985",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
