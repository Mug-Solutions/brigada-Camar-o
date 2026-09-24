const DIMENSAO_MAXIMA_PX = 1920;
const QUALIDADE_INICIAL = 0.82;
const QUALIDADE_MINIMA = 0.5;
const PASSO_QUALIDADE = 0.12;

/**
 * Redimensiona/recomprime uma imagem no navegador até caber em
 * `tamanhoMaximoBytes`, via <canvas> — evita bloquear o bombeiro só
 * porque a foto do celular saiu em resolução máxima (8-15MB comuns).
 * Sempre reencoda como JPEG (formato aceito pelo servidor e o que
 * melhor comprime fotografia). Só roda no navegador — chamar durante
 * SSR não funciona (document/canvas não existem lá).
 */
export async function comprimirImagemSeNecessario(arquivo: File, tamanhoMaximoBytes: number): Promise<File> {
  if (arquivo.size <= tamanhoMaximoBytes) return arquivo;

  const bitmap = await createImageBitmap(arquivo);
  try {
    let largura = bitmap.width;
    let altura = bitmap.height;
    const maiorLado = Math.max(largura, altura);
    if (maiorLado > DIMENSAO_MAXIMA_PX) {
      const escala = DIMENSAO_MAXIMA_PX / maiorLado;
      largura = Math.round(largura * escala);
      altura = Math.round(altura * escala);
    }

    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) return arquivo;
    ctx.drawImage(bitmap, 0, 0, largura, altura);

    let qualidade = QUALIDADE_INICIAL;
    let blob = await canvasParaBlob(canvas, qualidade);
    while (blob && blob.size > tamanhoMaximoBytes && qualidade > QUALIDADE_MINIMA) {
      qualidade -= PASSO_QUALIDADE;
      blob = await canvasParaBlob(canvas, qualidade);
    }
    if (!blob) return arquivo;

    const nome = arquivo.name.replace(/\.(png|jpe?g)$/i, "") + ".jpg";
    return new File([blob], nome, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}

function canvasParaBlob(canvas: HTMLCanvasElement, qualidade: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", qualidade));
}
