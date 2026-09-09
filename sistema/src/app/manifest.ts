import type { MetadataRoute } from "next";

/**
 * Manifest do PWA — instalável a partir do Portal do Bombeiro
 * (scope/start_url apontam pra /portal; a área admin não precisa ser
 * instalável, mas ter o link de manifest presente em todo o app não
 * causa efeito nenhum fora do fluxo de instalação).
 *
 * Ícone de marca definitivo fornecido pelo cliente (public/logo.jpg) —
 * substitui o placeholder provisório de iniciais "BC". `purpose: "any"`
 * (não "maskable") de propósito: a arte já preenche quase todo o
 * quadro da imagem, sem a margem de safe-zone que um ícone maskable
 * exige — declarar "maskable" faria o Android recortar as bordas do
 * emblema. Sem ferramenta de edição de imagem disponível pra gerar uma
 * versão com esse padding; se um dia existir, revisitar aqui.
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
        src: "/logo.jpg",
        sizes: "1291x1218",
        type: "image/jpeg",
        purpose: "any",
      },
    ],
  };
}
