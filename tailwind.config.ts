import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: { colors: { brand: { 50: "#E7F5F1", 100: "#D3ECE5", 600: "#168A78", 700: "#145B52" } } } },
  plugins: []
};
export default config;