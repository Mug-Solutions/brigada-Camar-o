import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { ImportarBombeirosForm } from "./ImportarBombeirosForm";

export default async function ImportarBombeirosPage() {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-[26px] uppercase tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Importar Bombeiros
          </h1>
          <p className="max-w-[56ch] text-[13.5px]" style={{ color: "var(--text-soft)" }}>
            Sobe o cadastro atual (planilha) de uma vez, em vez de digitar bombeiro por bombeiro.
          </p>
        </div>
        <Link href="/bombeiros" className="btn">
          ← Voltar
        </Link>
      </div>

      <div className="panel-block mb-4 p-5">
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
          Formato esperado
        </h2>
        <p className="mb-2 text-[13px]" style={{ color: "var(--text-soft)" }}>
          Arquivo CSV com as colunas: Nome, CPF, Função, Data ASO, Matrícula E-Social, Status E-Social, Data
          Credenciamento. Datas no formato DD/MM/AAAA.
        </p>
        <a href="/modelo-importacao-bombeiros.csv" download className="btn">
          Baixar modelo CSV
        </a>
      </div>

      <ImportarBombeirosForm />
    </div>
  );
}
