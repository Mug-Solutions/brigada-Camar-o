import { NovoBombeiroForm } from "./NovoBombeiroForm";

export default function NovoBombeiroPage() {
  return (
    <div>
      <div className="mb-6">
        <h1
          className="mb-1 text-[26px] uppercase tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Novo Bombeiro
        </h1>
        <p className="max-w-[56ch] text-[13.5px]" style={{ color: "var(--text-soft)" }}>
          Cadastro e documentação obrigatória.
        </p>
      </div>
      <NovoBombeiroForm />
    </div>
  );
}
