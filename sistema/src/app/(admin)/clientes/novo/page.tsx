import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { NovoClienteForm } from "./NovoClienteForm";

export default async function NovoClientePage() {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  return (
    <div>
      <div className="mb-6">
        <h1
          className="mb-1 text-[26px] uppercase tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Novo Cliente
        </h1>
        <p className="max-w-[56ch] text-[13.5px]" style={{ color: "var(--text-soft)" }}>
          Cadastro de empresa contratante.
        </p>
      </div>
      <NovoClienteForm />
    </div>
  );
}
