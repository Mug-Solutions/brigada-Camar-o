"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtMoney } from "@/lib/domain";

export interface PontoSerieMensal {
  mes: string;
  faturamento: number;
  lucro: number;
}

/**
 * Só roda no cliente (Recharts precisa do DOM pra medir/desenhar o
 * SVG) — os dados já vêm calculados do servidor, este componente só
 * desenha. Cores via var() do CSS: os tokens de tema (claro/escuro) já
 * existem em globals.css, funcionam em atributo de presença SVG como
 * qualquer outra propriedade CSS herdada.
 */
export function FaturamentoLucroChart({ dados }: { dados: PontoSerieMensal[] }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dados} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis
            dataKey="mes"
            tick={{ fill: "var(--text-soft)", fontSize: 12 }}
            axisLine={{ stroke: "var(--line)" }}
            padding={{ right: 12 }}
          />
          <YAxis
            tick={{ fill: "var(--text-soft)", fontSize: 12 }}
            axisLine={{ stroke: "var(--line)" }}
            tickFormatter={(valor) => fmtMoney(Number(valor)).replace("R$", "").trim()}
            width={64}
          />
          <Tooltip
            formatter={(valor) => fmtMoney(Number(valor))}
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8 }}
            labelStyle={{ color: "var(--text-soft)" }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-soft)" }} />
          <Line type="monotone" dataKey="faturamento" name="Faturamento" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="lucro" name="Lucro" stroke="var(--ok)" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
