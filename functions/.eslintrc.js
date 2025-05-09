module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: ["eslint:recommended", "google"],
  rules: {
    quotes: ["error", "double"],
    indent: ["error", 2],
    "object-curly-spacing": ["error", "as-needed"],
    "comma-dangle": ["error", "only-multiline"],
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
};
