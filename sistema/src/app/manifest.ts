import type { MetadataRoute } from "next";

/**
 * Manifest do PWA — instalável a partir do Portal do Bombeiro
 * (scope/start_url apontam pra /portal; a área admin não precisa ser
 * instalável, mas ter o link de manifest presente em todo o app não
 * causa efeito nenhum fora do fluxo de instalação).
 *
 * icon.svg é um ícone provisório (iniciais "BC" sobre o fundo escuro da
 * marca) — trocar por PNG com padding de safe-zone maskable assim que
 * existir um ícone de marca definitivo (ver docs/decisoes-tecnicas.md).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Brigada Camarão — Portal do Bombeiro",
    short_name: "Brigada Camarão",
    description: "Cadastro, documentos e escala do bombeiro civil.",
    start_url: "/portal",
    scope: "/portal",
    display: "standalone",
    background_color: "#f3ede2",
    theme_color: "#c1440e",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
