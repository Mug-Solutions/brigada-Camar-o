import "server-only";
import { Font, renderToBuffer } from "@react-pdf/renderer";
import { ContratoPdf } from "./ContratoPdf";
import type { DadosDocumento, TipoDocumento } from "./dados";
import { carregarImagensDocumento } from "./imagens";
import { OrcamentoPdf } from "./OrcamentoPdf";

// O react-pdf hifeniza com regras do inglês ("presta-ção" vira
// "pres-tação" no lugar errado, ou pior). Documento jurídico em
// português fica melhor sem hifenização nenhuma: a palavra inteira
// desce pra próxima linha.
Font.registerHyphenationCallback((palavra) => [palavra]);

export async function gerarPdfDocumento(
  tipo: TipoDocumento,
  dados: DadosDocumento,
  emitidoEm: Date = new Date()
): Promise<Buffer> {
  const imagens = carregarImagensDocumento();
  const props = { dados, imagens, emitidoEm };
  return renderToBuffer(tipo === "orcamento" ? <OrcamentoPdf {...props} /> : <ContratoPdf {...props} />);
}
