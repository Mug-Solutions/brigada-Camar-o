"use client";

import { useEffect } from "react";

/** Registra o service worker só dentro do Portal do Bombeiro — a área
 * admin não precisa (nem deve) ser instalável como app separado. */
export function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Instalação sem service worker ainda funciona (fica só sem o
        // cache básico) — não é motivo pra quebrar a tela.
      });
    }
  }, []);

  return null;
}
