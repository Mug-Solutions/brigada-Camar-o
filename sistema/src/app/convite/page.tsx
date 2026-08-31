import { DefinirSenhaForm } from "./DefinirSenhaForm";

// O e-mail de convite (src/app/(admin)/bombeiros/aprovacoes/actions.ts,
// via inviteUserByEmail) linka pra ESTA página com ?token_hash=...&type=invite
// na query string — não mais direto pro endpoint de verificação do
// Supabase. Motivo: um link cru pro endpoint de verificação é consumido
// por qualquer requisição GET, inclusive o escaneamento automático de
// segurança de provedores de e-mail (Gmail, Outlook) — o convite
// "expirava" antes da pessoa clicar de verdade. Aqui a verificação só
// acontece quando a pessoa clica no botão "Confirmar e continuar"
// (client-side, dentro de DefinirSenhaForm), o que um scanner de link
// não faz. Exige trocar o template de e-mail no painel do Supabase pra
// apontar pra cá — ver docs/decisoes-tecnicas.md.
export default async function ConvitePage({ searchParams }: PageProps<"/convite">) {
  const params = await searchParams;
  const tokenHash = typeof params?.token_hash === "string" ? params.token_hash : null;
  const type = typeof params?.type === "string" ? params.type : null;

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <div style={{ fontFamily: "var(--font-display)" }}>
            <span className="block text-[15px] tracking-wide" style={{ color: "var(--text-soft)" }}>
              BRIGADA
            </span>
            <span className="block text-[26px] leading-tight" style={{ color: "var(--accent)" }}>
              CAMARÃO
            </span>
          </div>
          <p className="mt-2 max-w-[34ch] text-[12.5px]" style={{ color: "var(--text-faint)" }}>
            Você foi convidado pela coordenação. Confirme pra continuar.
          </p>
        </div>
        <DefinirSenhaForm tokenHash={tokenHash} type={type} />
      </div>
    </div>
  );
}
