import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        panel: "#f7f9fc",
        line: "#d9e2ef"
      },
      boxShadow: {
        soft: "0 10px 24px rgba(23, 32, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
