/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/settings/**/*.html"],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
};
