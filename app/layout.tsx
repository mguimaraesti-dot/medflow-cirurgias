import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Medflow Cirurgias",
  description: "Gestão cirúrgica, operacional e financeira — Dr. Flávio Morita",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
