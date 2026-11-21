import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";

import { ThemeScript } from "@/components/theme/theme-script";
import { AppToaster } from "@/components/theme/app-toaster";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Medflow Cirurgias",
  description: "Gestão cirúrgica, operacional e financeira — Dr. Flávio Morita",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Permite pinch-to-zoom (não trava em 1x) — importante pra
  // acessibilidade, só fixamos a largura inicial.
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0f1e" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
