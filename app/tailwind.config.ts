import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ok: "#15cd72",
        danger: "#CD4439",
        primary: {
          DEFAULT: "#1D3150",
          semidark: "#1a2c48",
          dark: "#172740",
        },
        secondary: {
          DEFAULT: "#A5ACB9",
        },
      },
      width: {
        "128": "32rem",
      },
    },
  },
  plugins: [require("@headlessui/tailwindcss")],
};
export default config;
