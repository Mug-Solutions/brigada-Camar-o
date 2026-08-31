import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brigada Camarão — Sistema de Gestão",
  description: "Cadastro de bombeiros, escalas de eventos e financeiro.",
  // appleWebApp: iOS não usa o manifest.webmanifest do mesmo jeito que
  // Android/Chrome — precisa dessas meta tags pra "Adicionar à Tela de
  // Início" abrir em modo standalone lá também.
  appleWebApp: {
    title: "Brigada Camarão",
    statusBarStyle: "black-translucent",
    capable: true,
  },
};

// themeColor mudou de `metadata` pra um export próprio no Next 15+
// (breaking change — ver node_modules/next/dist/docs/.../generate-viewport.md).
export const viewport: Viewport = {
  themeColor: "#c1440e",
};

// Deliberadamente sem <Sidebar> aqui: o shell administrativo vive em
// src/app/(admin)/layout.tsx (route group, não afeta a URL), porque
// /login e /portal não podem herdar a navegação administrativa.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
