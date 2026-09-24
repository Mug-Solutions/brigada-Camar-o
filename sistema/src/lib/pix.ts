import "server-only";
import { createStaticPix, hasError } from "pix-utils";
import { EMPRESA } from "@/lib/documentos-cliente/empresa";

export interface PixGerado {
  brCode: string;
  qrCodeImage: string;
}

export type PixGeradoResultado = { error: string; brCode?: undefined } | ({ error: null } & PixGerado);

/**
 * Gera o BR Code (Copia e Cola) e o QR code pra pagar um bombeiro via
 * PIX — só formatação de texto conforme o padrão EMV do Banco Central,
 * sem nenhuma chamada de rede nem integração bancária: o financeiro
 * cola o código ou escaneia o QR no próprio app do banco pra concluir
 * o pagamento manualmente. Mantém a decisão do projeto de que o
 * sistema nunca dispara pagamento diretamente (ver decisoes-tecnicas.md).
 *
 * merchantName/merchantCity têm limite de 25/15 caracteres no padrão
 * EMV — truncar aqui evita que createStaticPix rejeite por tamanho.
 * merchantCity usa a cidade da própria Brigada Camarão (não temos
 * cidade cadastrada do bombeiro): o app do pagador resolve o
 * recebedor real pela chave PIX no momento do pagamento, então esse
 * campo é só um rótulo de exibição, nunca a validação de verdade.
 */
export async function gerarPixBombeiro(params: {
  nomeBombeiro: string;
  chavePix: string;
  valor: number;
  descricao: string;
}): Promise<PixGeradoResultado> {
  const pix = createStaticPix({
    merchantName: params.nomeBombeiro.slice(0, 25),
    merchantCity: EMPRESA.cidadeAssinatura.slice(0, 15),
    pixKey: params.chavePix,
    infoAdicional: params.descricao.slice(0, 99),
    transactionAmount: params.valor,
  });

  if (hasError(pix)) {
    return { error: pix.message };
  }

  const qrCodeImage = await pix.toImage();
  return { error: null, brCode: pix.toBRCode(), qrCodeImage };
}
