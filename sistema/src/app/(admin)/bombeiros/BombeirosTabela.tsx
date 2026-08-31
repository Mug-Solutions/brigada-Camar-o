"use client";

import { Fragment, useActionState, useRef, useState } from "react";
import { bombeiroAptidao, docStatus, fmtDateBR } from "@/lib/domain";
import { Chip } from "@/components/Chip";
import type { Bombeiro, BombeiroDocumento } from "@/lib/types";
import { enviarDocumentoBombeiroStaff, type EnviarDocumentoStaffState } from "./actions";

const ROTULO_TIPO_ANEXO: Record<BombeiroDocumento["tipo_documento"], string> = {
  aso: "ASO",
  credenciamento: "Credenciamento",
  curso: "Curso",
};

interface BombeirosTabelaProps {
  bombeiros: Bombeiro[];
  documentos: BombeiroDocumento[];
}

export function BombeirosTabela({ bombeiros, documentos }: BombeirosTabelaProps) {
  const [abertoId, setAbertoId] = useState<string | null>(null);

  return (
    <table className="min-w-[640px]">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Função</th>
          <th>ASO</th>
          <th>E-Social</th>
          <th>Credenciamento</th>
          <th>Situação</th>
        </tr>
      </thead>
      <tbody>
        {bombeiros.length === 0 ? (
          <tr>
            <td colSpan={6} className="py-10 text-center" style={{ color: "var(--text-faint)" }}>
              Nenhum bombeiro cadastrado ainda.
            </td>
          </tr>
        ) : (
          bombeiros.map((b) => {
            const aso = docStatus(b.aso_data);
            const cred = docStatus(b.credenciamento_data);
            const aptidao = bombeiroAptidao(b);
            const aberto = abertoId === b.id;
            const documentosDoBombeiro = documentos.filter((d) => d.bombeiro_id === b.id);
            return (
              <Fragment key={b.id}>
                <tr>
                  <td className="font-semibold">
                    <button
                      type="button"
                      onClick={() => setAbertoId(aberto ? null : b.id)}
                      className="text-left hover:underline"
                    >
                      {b.nome}
                    </button>
                    <span
                      className="mt-0.5 block text-[11.5px] font-normal"
                      style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
                    >
                      {b.cpf}
                    </span>
                  </td>
                  <td>{b.funcao}</td>
                  <td>
                    <Chip level={aso.level} label={`${fmtDateBR(b.aso_data)} · ${aso.label}`} />
                  </td>
                  <td>
                    <Chip
                      level={b.esocial_status === "Ativo" ? "ok" : "crit"}
                      label={`${b.esocial_matricula ?? "—"} · ${b.esocial_status}`}
                    />
                  </td>
                  <td>
                    <Chip level={cred.level} label={`${fmtDateBR(b.credenciamento_data)} · ${cred.label}`} />
                  </td>
                  <td>
                    <Chip level={aptidao.level} label={aptidao.label} />
                  </td>
                </tr>
                {aberto && (
                  <tr>
                    <td colSpan={6} className="bg-[var(--surface)] p-0">
                      <div className="p-5">
                        <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
                          Documentos anexados
                        </div>
                        {documentosDoBombeiro.length === 0 ? (
                          <p className="mb-3 text-[12.5px]" style={{ color: "var(--text-faint)" }}>
                            Nenhum arquivo anexado ainda.
                          </p>
                        ) : (
                          <ul className="mb-3 space-y-1">
                            {documentosDoBombeiro.map((doc) => (
                              <li key={doc.id} className="text-[13px]">
                                <span className="font-semibold">{ROTULO_TIPO_ANEXO[doc.tipo_documento]}</span>{" "}
                                <span style={{ color: "var(--text-soft)" }}>
                                  — {doc.nome_arquivo} · {fmtDateBR(doc.enviado_em.slice(0, 10))}
                                </span>{" "}
                                <a
                                  href={`/api/documentos/${doc.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline"
                                >
                                  Ver
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                        <EnviarDocumentoStaffForm bombeiroId={b.id} />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })
        )}
      </tbody>
    </table>
  );
}

const initialState: EnviarDocumentoStaffState = { error: null };

function EnviarDocumentoStaffForm({ bombeiroId }: { bombeiroId: string }) {
  const [state, formAction, pending] = useActionState(enviarDocumentoBombeiroStaff, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <input type="hidden" name="bombeiro_id" value={bombeiroId} />
      <div className="field">
        <label htmlFor={`tipo_documento_${bombeiroId}`}>Tipo</label>
        <select id={`tipo_documento_${bombeiroId}`} name="tipo_documento" defaultValue="aso">
          <option value="aso">ASO</option>
          <option value="credenciamento">Credenciamento</option>
          <option value="curso">Curso</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor={`arquivo_${bombeiroId}`}>Arquivo</label>
        <input
          type="file"
          id={`arquivo_${bombeiroId}`}
          name="arquivo"
          accept="application/pdf,image/jpeg,image/png"
          required
        />
      </div>
      <button type="submit" className="btn" disabled={pending}>
        {pending ? "Enviando..." : "Anexar"}
      </button>
      {state.error && (
        <p className="w-full text-[12px]" style={{ color: "var(--crit)" }}>
          {state.error}
        </p>
      )}
    </form>
  );
}
