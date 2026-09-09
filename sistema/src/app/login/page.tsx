import { LogoBadge } from "@/components/LogoBadge";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const pendente = params?.pendente === "1";

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex items-center gap-3">
            <div style={{ fontFamily: "var(--font-display)" }}>
              <span className="block text-[15px] tracking-wide" style={{ color: "var(--text-soft)" }}>
                BRIGADA
              </span>
              <span className="block text-[26px] leading-tight" style={{ color: "var(--accent)" }}>
                CAMARÃO
              </span>
            </div>
            <LogoBadge size={48} />
          </div>
        </div>
        <LoginForm pendente={pendente} />
      </div>
    </div>
  );
}
