// Tailwind 4 ships as its own PostCSS plugin, and it prefixes through Lightning
// CSS — so `autoprefixer` is removed rather than left in as a no-op.
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
