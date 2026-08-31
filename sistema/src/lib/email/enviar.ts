import "server-only";

/**
 * Envio de e-mail transacional via Resend — diferente do SMTP
 * configurado no painel do Supabase (que só cobre e-mails de auth,
 * tipo o convite). Isso aqui é pra e-mails de negócio disparados pelo
 * próprio app (ex.: alerta de documento vencendo), precisa da própria
 * API key do Resend (RESEND_API_KEY), não reaproveita a config de auth.
 *
 * Sem a env var configurada, não quebra o chamador — só loga e volta
 * `ok:false`, mesma postura de "modo apresentação" usada em outras
 * partes do sistema quando falta configuração externa.
 */
export async function enviarEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; erro?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[enviarEmail] RESEND_API_KEY não configurada — e-mail não enviado", {
      to: params.to,
      subject: params.subject,
    });
    return { ok: false, erro: "RESEND_API_KEY não configurada" };
  }

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Domínio de sandbox do Resend por padrão — só entrega de
        // forma confiável pro próprio dono da conta Resend, não serve
        // pra mandar e-mail de verdade pra bombeiro/cliente em
        // produção. EMAIL_FROM assume assim que houver um domínio
        // próprio verificado no Resend (registros SPF/DKIM/DMARC no
        // DNS do domínio público — ver docs/deploy-cloud-run.md).
        from: process.env.EMAIL_FROM ?? "Brigada Camarão <onboarding@resend.dev>",
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!resp.ok) {
      const corpo = await resp.text();
      console.error("[enviarEmail] Resend retornou erro", { to: params.to, status: resp.status, corpo });
      return { ok: false, erro: `Resend HTTP ${resp.status}` };
    }

    return { ok: true };
  } catch (erro) {
    console.error("[enviarEmail] falha de rede ao chamar Resend", { to: params.to, erro });
    return { ok: false, erro: "Falha de rede" };
  }
}
