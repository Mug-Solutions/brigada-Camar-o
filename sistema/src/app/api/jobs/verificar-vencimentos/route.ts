import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { docStatus } from "@/lib/domain";
import { enviarEmail } from "@/lib/email/enviar";
import { enviarWhatsApp } from "@/lib/whatsapp/enviar";
import type { Bombeiro } from "@/lib/types";

/**
 * Job diário de verificação de vencimento (Fase 4 do roadmap): checa
 * ASO e Credenciamento de todo bombeiro, gera notificação in-app +
 * e-mail (e WhatsApp, quando o provedor existir) pra quem estiver
 * vencendo (≤30 dias) ou vencido.
 *
 * Não é uma Server Action — é uma rota de API pensada pra ser chamada
 * por um agendador externo (cron do provedor de hospedagem, ainda não
 * escolhido). Protegida por CRON_SECRET pra não poder ser disparada
 * por qualquer um que descubra a URL — sem a env var configurada,
 * a rota recusa TODA chamada (falha fechada, mesma postura do
 * src/proxy.ts quando faltam variáveis de auth em produção).
 */

// Bloqueio simples em memória contra força bruta do CRON_SECRET —
// achado real de revisão de segurança (rota HTTP pública, sem nenhum
// rate limit no projeto). É por instância de processo (não sobrevive
// a cold start/múltiplas instâncias em serverless), então não
// substitui a solução de produção real (allowlist de IP do provedor
// de cron, ou rate limit no nível do host) — mas já barra tentativa
// de força bruta ingênua contra uma única instância.
const JANELA_MS = 5 * 60 * 1000;
const LIMITE_TENTATIVAS = 5;
const tentativasPorIp = new Map<string, { falhas: number; desde: number }>();

function segredoConfere(recebido: string | null, segredo: string): boolean {
  const esperado = Buffer.from(`Bearer ${segredo}`);
  const dado = Buffer.from(recebido ?? "");
  // timingSafeEqual exige buffers do mesmo tamanho — comparar o
  // tamanho primeiro não reintroduz o timing leak de forma prática
  // (vazar só o comprimento do segredo não ajuda a adivinhar o valor).
  if (dado.length !== esperado.length) return false;
  return timingSafeEqual(dado, esperado);
}

export async function POST(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconhecido";
  const agora = Date.now();
  const registro = tentativasPorIp.get(ip);
  if (registro && agora - registro.desde < JANELA_MS && registro.falhas >= LIMITE_TENTATIVAS) {
    return NextResponse.json({ error: "Muitas tentativas. Tente novamente mais tarde." }, { status: 429 });
  }

  const auth = request.headers.get("authorization");
  if (!segredoConfere(auth, segredo)) {
    const atual = registro && agora - registro.desde < JANELA_MS ? registro : { falhas: 0, desde: agora };
    tentativasPorIp.set(ip, { falhas: atual.falhas + 1, desde: atual.desde });
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  tentativasPorIp.delete(ip);

  const supabase = createServerSupabaseClient();

  const [{ data: bombeirosData }, { data: usuariosData }] = await Promise.all([
    supabase.from("bombeiros").select("id, nome, telefone, aso_data, credenciamento_data"),
    supabase.from("usuarios").select("auth_id, bombeiro_id").eq("papel", "bombeiro").eq("ativo", true),
  ]);

  const bombeiros = (bombeirosData ?? []) as Pick<
    Bombeiro,
    "id" | "nome" | "telefone" | "aso_data" | "credenciamento_data"
  >[];
  const authIdPorBombeiro = new Map((usuariosData ?? []).map((u) => [u.bombeiro_id, u.auth_id]));

  // E-mail vive em auth.users, não em `bombeiros` — precisa da API
  // admin pra resolver auth_id -> email (paginada, 1000 é folga
  // grande pro tamanho atual do quadro).
  const { data: listaUsuarios } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailPorAuthId = new Map((listaUsuarios?.users ?? []).map((u) => [u.id, u.email ?? null]));

  let notificacoesCriadas = 0;
  let emailsEnviados = 0;

  for (const bombeiro of bombeiros) {
    const checagens: { tipoDocumento: "aso" | "credenciamento"; data: string | null; nomeDoc: string }[] = [
      { tipoDocumento: "aso", data: bombeiro.aso_data, nomeDoc: "ASO" },
      { tipoDocumento: "credenciamento", data: bombeiro.credenciamento_data, nomeDoc: "Credenciamento" },
    ];

    for (const checagem of checagens) {
      const status = docStatus(checagem.data);
      if (status.level !== "warn" && status.level !== "crit") continue;

      const mensagem =
        status.level === "crit"
          ? `Seu ${checagem.nomeDoc} está vencido. Atualize em /portal/documentos.`
          : `Seu ${checagem.nomeDoc} vence em breve (${status.label}). Atualize em /portal/documentos.`;

      const { error: insertError } = await supabase.from("notificacoes").insert({
        bombeiro_id: bombeiro.id,
        tipo_documento: checagem.tipoDocumento,
        nivel: status.level,
        mensagem,
      });

      // 23505 = já existe notificação não lida idêntica (índice único
      // da migração 0014) — não é erro, é o job evitando duplicar
      // alerta que o bombeiro ainda não leu.
      if (insertError) {
        if (insertError.code !== "23505") {
          console.error("[verificar-vencimentos] falha ao criar notificação", {
            bombeiroId: bombeiro.id,
            erro: insertError,
          });
        }
        continue;
      }

      notificacoesCriadas += 1;

      const authId = authIdPorBombeiro.get(bombeiro.id);
      const email = authId ? emailPorAuthId.get(authId) : null;
      if (email) {
        const resultado = await enviarEmail({
          to: email,
          subject: `Brigada Camarão — ${checagem.nomeDoc} ${status.level === "crit" ? "vencido" : "vencendo"}`,
          html: `<p>Olá, ${bombeiro.nome}.</p><p>${mensagem}</p>`,
        });
        if (resultado.ok) emailsEnviados += 1;
      }

      if (bombeiro.telefone) {
        await enviarWhatsApp({ telefone: bombeiro.telefone, mensagem });
      }
    }
  }

  return NextResponse.json({ ok: true, notificacoesCriadas, emailsEnviados });
}
