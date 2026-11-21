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
  experimental: {
    // Padrão do Next é 1 MB; o anexo de documentos (Solicitação hospitalar)
    // aceita arquivos até 15 MB, então o limite precisa acompanhar.
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
