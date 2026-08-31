import "server-only";

/**
 * Camada de adaptador pro WhatsApp Business API — decisão já tomada
 * no planejamento (ver docs/decisoes-tecnicas.md): provedor concreto
 * (Meta Cloud API direto, Z-API ou Twilio) ainda não foi escolhido
 * pelo cliente. Esta função existe pra o resto do código (o job diário
 * de verificação de vencimento) já poder chamar "enviar WhatsApp" sem
 * reescrever nada quando o provedor for definido — só troca o corpo
 * desta função.
 */
export async function enviarWhatsApp(params: {
  telefone: string;
  mensagem: string;
}): Promise<{ ok: boolean; erro?: string }> {
  console.error("[enviarWhatsApp] provedor ainda não configurado — mensagem não enviada", {
    telefone: params.telefone,
  });
  return { ok: false, erro: "Provedor de WhatsApp ainda não definido" };
}
