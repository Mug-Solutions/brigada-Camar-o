export function DemoBanner() {
  return (
    <div
      className="mb-5 rounded-md border-l-[3px] px-4 py-3 text-[12.5px]"
      style={{ borderColor: "var(--accent)", background: "var(--accent-tint)", color: "var(--text-soft)" }}
    >
      <strong style={{ color: "var(--text)" }}>Modo de apresentação:</strong> sem banco de
      dados conectado ainda, exibindo dados fictícios só para visualizar a tela. Configure o
      Supabase (veja o README) para trabalhar com dados reais.
    </div>
  );
}
