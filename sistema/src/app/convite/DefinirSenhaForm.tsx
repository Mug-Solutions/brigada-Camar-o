"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { EmailOtpType } from "@supabase/supabase-js";

type Etapa = "confirmar" | "confirmando" | "senha" | "invalido";

const TIPOS_VALIDOS: readonly string[] = ["invite", "recovery", "email", "magiclink", "email_change"];

export function DefinirSenhaForm({ tokenHash, type }: { tokenHash: string | null; type: string | null }) {
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [etapa, setEtapa] = useState<Etapa>(tokenHash && type && TIPOS_VALIDOS.includes(type) ? "confirmar" : "invalido");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleConfirmar() {
    if (!tokenHash || !type) return;
    setError(null);
    setEtapa("confirmando");

    // É este clique — uma ação de verdade da pessoa, não uma requisição
    // GET automática — que consome o token e estabelece a sessão. Um
    // scanner de e-mail que só segue o link no HTML nunca chega a
    // clicar aqui, então não gasta o convite antes da hora.
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });

    if (verifyError) {
      setError("Link inválido ou já usado. Peça um novo convite à coordenação.");
      setEtapa("invalido");
      return;
    }

    setEtapa("senha");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (senha.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setError("As senhas não coincidem.");
      return;
    }

    setPending(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: senha });
    setPending(false);

    if (updateError) {
      setError("Não foi possível definir a senha. Tente novamente ou peça um novo convite.");
      return;
    }

    // Navegação de página inteira, não router.push(): a sessão nova
    // foi criada inteiramente no navegador (verifyOtp/updateUser rodam
    // client-side) — só um carregamento completo garante que o
    // servidor recebe o cookie atualizado na próxima página. Foi
    // testado e confirmado: com router.push(), a pessoa caía de volta
    // no /login como se não tivesse sessão nenhuma.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload é intencional aqui, ver comentário acima
    window.location.href = "/completar-cadastro";
  }

  if (etapa === "invalido") {
    return (
      <div className="panel-block w-full max-w-[380px] p-6 text-center">
        <p className="text-[13.5px]" style={{ color: "var(--crit)" }}>
          {error ?? "Link inválido ou expirado. Peça um novo convite à coordenação."}
        </p>
      </div>
    );
  }

  if (etapa === "confirmar" || etapa === "confirmando") {
    return (
      <div className="panel-block w-full max-w-[380px] p-6 text-center">
        <button
          type="button"
          className="btn btn--primary w-full justify-center"
          disabled={etapa === "confirmando"}
          onClick={handleConfirmar}
        >
          {etapa === "confirmando" ? "Confirmando..." : "Confirmar e continuar"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="panel-block w-full max-w-[380px] p-6">
      {error && (
        <div
          className="mb-5 rounded-md border px-4 py-3 text-[13px]"
          style={{ borderColor: "var(--crit)", background: "var(--crit-bg)", color: "var(--crit)" }}
        >
          {error}
        </div>
      )}

      <div className="field mb-4">
        <label htmlFor="senha">Nova senha</label>
        <input
          type="password"
          id="senha"
          autoComplete="new-password"
          minLength={8}
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
      </div>
      <div className="field mb-6">
        <label htmlFor="confirmacao">Confirme a senha</label>
        <input
          type="password"
          id="confirmacao"
          autoComplete="new-password"
          minLength={8}
          required
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
        />
      </div>

      <button type="submit" className="btn btn--primary w-full justify-center" disabled={pending}>
        {pending ? "Salvando..." : "Definir senha e entrar"}
      </button>
    </form>
  );
}
