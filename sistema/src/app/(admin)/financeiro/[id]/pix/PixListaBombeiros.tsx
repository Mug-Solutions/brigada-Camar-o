"use client";

import { useState } from "react";
import { fmtDateBR, fmtMoney } from "@/lib/domain";
import { MarcarPagoCheckbox } from "../MarcarPagoCheckbox";
import { CopiarPixButton } from "./CopiarPixButton";

export interface ItemPix {
  id: string;
  nomeBombeiro: string;
  chavePix: string | null;
  data: string;
  turno: string;
  valor: number;
  pago: boolean;
  pix: { erro: string } | { erro: null; brCode: string; qrCodeImage: string };
}

interface PixListaBombeirosProps {
  itens: ItemPix[];
  eventoId: string;
}

/**
 * Achado do cliente: QR code é lido fácil demais pela câmera — com
 * mais de um QR aberto na tela ao mesmo tempo, o admin arrisca
 * escanear o do bombeiro errado e mandar o PIX pra pessoa errada. Só
 * um QR fica visível por vez (mesmo padrão de "abertoId" já usado em
 * EventosTabela.tsx pra expandir uma linha da lista de eventos): abrir
 * um fecha automaticamente o anterior.
 */
export function PixListaBombeiros({ itens, eventoId }: PixListaBombeirosProps) {
  const [abertoId, setAbertoId] = useState<string | null>(null);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {itens.map((item) => {
        const aberto = abertoId === item.id;
        return (
          <div key={item.id} className="panel-block p-5">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{item.nomeBombeiro}</div>
                <div className="mt-0.5 text-[12.5px]" style={{ color: item.chavePix ? "var(--text-soft)" : "var(--warn)" }}>
                  {item.chavePix ?? "Sem chave PIX cadastrada"}
                </div>
                <div className="mt-0.5 text-[12.5px]" style={{ color: "var(--text-soft)" }}>
                  {fmtDateBR(item.data)} · {item.turno} · {fmtMoney(item.valor)}
                </div>
              </div>
              <MarcarPagoCheckbox escalaId={item.id} eventoId={eventoId} pago={item.pago} />
            </div>

            {!item.chavePix ? (
              <p className="text-[13px]" style={{ color: "var(--warn)" }}>
                Não dá pra pagar até a chave ser preenchida.
              </p>
            ) : item.pix.erro !== null ? (
              <p className="text-[13px]" style={{ color: "var(--crit)" }}>
                Não foi possível gerar o PIX: {item.pix.erro}.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  className="btn w-full justify-center"
                  onClick={() => setAbertoId(aberto ? null : item.id)}
                >
                  {aberto ? "Ocultar QR Code" : "Ver QR Code"}
                </button>

                {aberto && (
                  <div className="mt-3 flex flex-col items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.pix.qrCodeImage}
                      alt={`QR code PIX de ${item.nomeBombeiro}`}
                      className="h-[180px] w-[180px]"
                    />
                    <CopiarPixButton brCode={item.pix.brCode} />
                    <p
                      className="w-full break-all rounded-md border p-2 text-center text-[10.5px]"
                      style={{ borderColor: "var(--line)", color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
                    >
                      {item.pix.brCode}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
