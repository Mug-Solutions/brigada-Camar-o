export default function FinanceiroPage() {
  return (
    <div>
      <div className="mb-6">
        <h1
          className="mb-1 text-[26px] uppercase tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Financeiro
        </h1>
        <p className="max-w-[56ch] text-[13.5px]" style={{ color: "var(--text-soft)" }}>
          Resultado por evento — o que é cobrado do cliente, o que é pago aos bombeiros e a margem líquida.
        </p>
      </div>

      <div className="panel-block p-6 text-[13.5px]" style={{ color: "var(--text-soft)" }}>
        Este módulo depende das escalas lançadas em Eventos &amp; Escalas para calcular o custo e o
        lucro por evento automaticamente. Assim que esse módulo estiver pronto, o financeiro aparece
        aqui sem nenhum lançamento manual — igual ao comportamento já validado no protótipo.
      </div>
    </div>
  );
}
