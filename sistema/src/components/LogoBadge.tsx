import Image from "next/image";

interface LogoBadgeProps {
  size: number;
}

/**
 * Emblema da Brigada Camarão (fornecido pelo cliente, public/logo.jpg).
 * O arquivo original tem fundo cinza claro (não é PNG/SVG transparente)
 * — sem ferramenta de edição de imagem disponível pra gerar uma versão
 * com fundo transparente, então usa o próprio recorte circular do CSS:
 * o emblema já preenche quase todo o quadro da imagem, então
 * `object-cover` + `rounded-full` corta só as pontas do fundo cinza
 * que sobram nos cantos, sem precisar remover o fundo de verdade.
 */
export function LogoBadge({ size }: LogoBadgeProps) {
  return (
    <Image
      src="/logo.jpg"
      alt="Brigada Camarão"
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  );
}
