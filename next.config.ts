import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * `cacheComponents` (ex-PPR/dynamicIO) desligado de propósito: todo o
   * grupo (dashboard) é protegido por sessão (cookies() no layout), então
   * não há nada para pré-renderizar estaticamente. Revisar quando houver
   * páginas públicas ou dados pesados que valham cache explícito.
   */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
