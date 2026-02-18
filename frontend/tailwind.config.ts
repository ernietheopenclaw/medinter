import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1E40AF",
        accent: "#059669",
        danger: "#DC2626",
        medical: {
          blue: "#1E40AF",
          green: "#059669",
          red: "#DC2626",
          amber: "#D97706",
          purple: "#7C3AED",
          gray: "#6B7280",
        },
      },
    },
  },
  plugins: [],
};

export default config;
