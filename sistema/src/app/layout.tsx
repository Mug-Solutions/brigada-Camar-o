import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ATRIBUTO_TEMA, CHAVE_TEMA, TEMA_PADRAO } from "@/lib/tema";

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
/**
 * Aplica o tema guardado ANTES da primeira pintura. Se isso virasse um
 * efeito de React, a página apareceria clara e piscaria para escura
 * depois de hidratar — e o servidor não tem como saber a preferência,
 * que mora no localStorage do aparelho. Por isso é um script síncrono
 * no <head>: 4 linhas, sem dependência, dentro de try/catch (navegação
 * privada pode recusar o armazenamento; aí vale o padrão claro).
 */
const APLICA_TEMA = `try{var t=localStorage.getItem(${JSON.stringify(CHAVE_TEMA)});if(t!==${JSON.stringify(
  TEMA_PADRAO
)}&&t){document.documentElement.setAttribute(${JSON.stringify(
  ATRIBUTO_TEMA
)},t);document.documentElement.style.colorScheme=t==="escuro"?"dark":"light"}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" data-tema={TEMA_PADRAO}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APLICA_TEMA }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
