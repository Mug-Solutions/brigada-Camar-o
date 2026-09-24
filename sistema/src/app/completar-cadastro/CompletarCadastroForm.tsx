"use client";

import { useActionState, useState } from "react";
import { enviarDadosCadastro, type CompletarCadastroState } from "./actions";
import { mascararCPF, mascararTelefone } from "@/lib/validation/mascara";
import { TAMANHO_MAXIMO_DOCUMENTO_BYTES } from "@/lib/constants";
import { comprimirImagemSeNecessario } from "@/lib/imagem-cliente";

const initialState: CompletarCadastroState = { error: null };
const TAMANHO_MAXIMO_MB = TAMANHO_MAXIMO_DOCUMENTO_BYTES / (1024 * 1024);

interface CompletarCadastroFormProps {
  funcoes: string[];
}

const CAMPOS_ARQUIVO: { campo: string; label: string }[] = [
  { campo: "foto_rosto", label: "foto" },
  { campo: "aso_documento", label: "arquivo do ASO" },
  { campo: "credenciamento_documento", label: "arquivo do Credenciamento" },
];

export function CompletarCadastroForm({ funcoes }: CompletarCadastroFormProps) {
  const [state, formAction, pending] = useActionState(enviarDadosCadastro, initialState);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [comprimindo, setComprimindo] = useState(false);

  return (
    <form
      action={async (formData) => {
        // Mesmo achado do upload de documentos (src/app/portal/documentos/EnviarDocumentoForm.tsx):
        // um arquivo de celular em resolução máxima passa fácil do limite
        // do body das Server Actions — comprime cada campo de imagem aqui
        // antes de enviar em vez de deixar travar. PDF não dá pra
        // comprimir no navegador — só bloqueia com mensagem clara.
        setComprimindo(true);
        try {
          for (const { campo, label } of CAMPOS_ARQUIVO) {
            const arquivo = formData.get(campo);
            if (!(arquivo instanceof File) || arquivo.size <= TAMANHO_MAXIMO_DOCUMENTO_BYTES) continue;

            if (arquivo.type === "application/pdf") {
              setErroFoto(`O ${label} (PDF) passa de ${TAMANHO_MAXIMO_MB}MB — comprima o arquivo antes de enviar.`);
              return;
            }
            try {
              const comprimido = await comprimirImagemSeNecessario(arquivo, TAMANHO_MAXIMO_DOCUMENTO_BYTES);
              if (comprimido.size > TAMANHO_MAXIMO_DOCUMENTO_BYTES) {
                setErroFoto(`Não foi possível reduzir o ${label} abaixo de ${TAMANHO_MAXIMO_MB}MB — tire com menos zoom.`);
                return;
              }
              formData.set(campo, comprimido);
            } catch {
              // Mantém o original — o erro amigável de tamanho do servidor cobre esse caso.
            }
          }
        } finally {
          setComprimindo(false);
        }
        setErroFoto(null);
        await formAction(formData);
      }}
      className="panel-block w-full max-w-[420px] p-6"
    >
      {(erroFoto ?? state.error) && (
        <div
          className="mb-5 rounded-md border px-4 py-3 text-[13px]"
          style={{ borderColor: "var(--crit)", background: "var(--crit-bg)", color: "var(--crit)" }}
        >
          {erroFoto ?? state.error}
        </div>
      )}

      <fieldset className="mb-6 border-0 p-0">
        <legend
          className="mb-3.5 w-full border-b pb-2.5 text-[12px] uppercase tracking-wide"
          style={{ borderColor: "var(--line)", fontFamily: "var(--font-display)" }}
        >
          Dados Pessoais
        </legend>
        <div className="field mb-4">
          <label htmlFor="nome">Nome completo</label>
          <input type="text" id="nome" name="nome" required />
        </div>
        <div className="field mb-4">
          <label htmlFor="foto_rosto">Foto do rosto</label>
          <input
            type="file"
            id="foto_rosto"
            name="foto_rosto"
            accept="image/jpeg,image/png"
            required
            onChange={() => setErroFoto(null)}
          />
          <p className="mt-1 text-[11.5px]" style={{ color: "var(--text-faint)" }}>
            Foto nítida do rosto, sem óculos escuros ou boné — usada pela coordenação pra identificação.
          </p>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="field">
            <label htmlFor="cpf">CPF</label>
            <input
              type="text"
              id="cpf"
              name="cpf"
              placeholder="000.000.000-00"
              maxLength={14}
              onChange={(e) => {
                e.target.value = mascararCPF(e.target.value);
              }}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="telefone">Telefone</label>
            <input
              type="text"
              id="telefone"
              name="telefone"
              placeholder="(31) 90000-0000"
              maxLength={15}
              onChange={(e) => {
                e.target.value = mascararTelefone(e.target.value);
              }}
              required
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="funcao">Função</label>
          <select id="funcao" name="funcao" defaultValue={funcoes[0]}>
            {funcoes.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset className="mb-6 border-0 p-0">
        <legend
          className="mb-3.5 w-full border-b pb-2.5 text-[12px] uppercase tracking-wide"
          style={{ borderColor: "var(--line)", fontFamily: "var(--font-display)" }}
        >
          Documentação
        </legend>
        <div className="field mb-4">
          <label htmlFor="aso_data">Data do ASO</label>
          <input type="date" id="aso_data" name="aso_data" required />
        </div>
        <div className="field mb-4">
          <label htmlFor="aso_documento">Arquivo do ASO</label>
          <input
            type="file"
            id="aso_documento"
            name="aso_documento"
            accept="application/pdf,image/jpeg,image/png"
            required
            onChange={() => setErroFoto(null)}
          />
        </div>
        <div className="field mb-4">
          <label htmlFor="esocial_matricula">Matrícula E-Social</label>
          <input type="text" id="esocial_matricula" name="esocial_matricula" placeholder="Ex.: 822" required />
        </div>
        <div className="field mb-4">
          <label htmlFor="credenciamento_data">Validade do Credenciamento</label>
          <input type="date" id="credenciamento_data" name="credenciamento_data" required />
        </div>
        <div className="field">
          <label htmlFor="credenciamento_documento">Arquivo do Credenciamento</label>
          <input
            type="file"
            id="credenciamento_documento"
            name="credenciamento_documento"
            accept="application/pdf,image/jpeg,image/png"
            required
            onChange={() => setErroFoto(null)}
          />
        </div>
      </fieldset>

      <fieldset className="mb-6 border-0 p-0">
        <legend
          className="mb-3.5 w-full border-b pb-2.5 text-[12px] uppercase tracking-wide"
          style={{ borderColor: "var(--line)", fontFamily: "var(--font-display)" }}
        >
          Pagamento
        </legend>
        <div className="field">
          <label htmlFor="chave_pix">Chave PIX</label>
          <input
            type="text"
            id="chave_pix"
            name="chave_pix"
            placeholder="CPF, e-mail, telefone ou chave aleatória"
            maxLength={140}
            required
          />
        </div>
      </fieldset>

      <button type="submit" className="btn btn--primary w-full justify-center" disabled={pending || comprimindo}>
        {comprimindo ? "Preparando arquivos..." : pending ? "Enviando..." : "Enviar cadastro"}
      </button>
    </form>
  );
}
