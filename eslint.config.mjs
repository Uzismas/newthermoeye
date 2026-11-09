import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      ".github/**",
      ".claude/**",
      "build/**",
      "coverage/**",
      "dist/**",
      "node_modules/**",
      "backend/.venv/**",
      "backend/train/.venv/**",
      "backend/models/**",
      "out/**",
      "output/**",
      "tmp/**",
      "web/**",
      "next-env.d.ts",
      "*.log",
      "*.tsbuildinfo",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
];

export default config;
