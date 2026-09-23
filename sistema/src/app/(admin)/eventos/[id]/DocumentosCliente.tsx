import { NOME_DOCUMENTO, TIPOS_DOCUMENTO, type TipoDocumento } from "@/lib/documentos-cliente/dados";

interface DocumentosClienteProps {
  eventoId: string;
  pendencias: Record<TipoDocumento, string[]>;
}

/**
 * Botões de orçamento/contrato em PDF. Com pendência, o botão some e
 * a lista do que falta aparece no lugar — a rota re-checa as mesmas
 * regras (pendenciasDocumento), então isso aqui é só a explicação.
 */
export function DocumentosCliente({ eventoId, pendencias }: DocumentosClienteProps) {
  return (
    <div className="panel-block mb-4 p-5">
      <h2 className="mb-1 text-[13px] font-semibold uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
        Documentos para o cliente
      </h2>
      <p className="mb-3.5 text-[11.5px]" style={{ color: "var(--text-faint)" }}>
        PDF preenchido com os dados do evento, do cliente e da programação, já com a assinatura da Brigada.
      </p>
      <div className="space-y-3">
        {TIPOS_DOCUMENTO.map((tipo) => {
          const faltando = pendencias[tipo];
          return (
            <div key={tipo}>
              {faltando.length === 0 ? (
                // <a> e não <Link>: é download de arquivo. Sem o atributo
                // `download` de propósito — o Content-Disposition da rota já
                // baixa o PDF, e se a rota redirecionar (sessão expirada,
                // pendência nova) o navegador segue pra tela em vez de
                // salvar o HTML do redirect como se fosse o PDF.
                <a href={`/api/eventos/${eventoId}/${tipo}`} className="btn btn--primary w-full justify-center">
                  Gerar {NOME_DOCUMENTO[tipo].toLowerCase()} (PDF)
                </a>
              ) : (
                <div
                  className="rounded-md border px-3 py-2.5 text-[12.5px]"
                  style={{ borderColor: "var(--warn)", background: "var(--warn-bg)" }}
                >
                  <p className="mb-1 font-semibold">{NOME_DOCUMENTO[tipo]}: falta completar</p>
                  <ul className="list-disc pl-4" style={{ color: "var(--text-soft)" }}>
                    {faltando.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
