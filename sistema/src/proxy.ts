import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { HOME_POR_PAPEL, type Papel } from "@/lib/constants";
import { ehAreaDoPapel, ehRotaProtegida } from "@/lib/auth/protected-routes";

/**
 * Next.js 16 renomeou middleware.ts -> proxy.ts (mesma função, nome
 * novo — ver node_modules/next/dist/docs/.../proxy.md). Roda em runtime
 * Node por padrão nesta versão.
 */

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Em produção, ausência dessas variáveis nunca é "modo apresentação"
    // deliberado — é configuração quebrada (env var esquecida/errada no
    // deploy). Deixar passar nesse caso abriria TODAS as rotas admin sem
    // login algum. Falha alta e visível em vez de bypass silencioso.
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Configuração de autenticação ausente.", { status: 500 });
    }
    // Fora de produção: modo apresentação, nada é bloqueado (mesmo
    // comportamento de hoje — ver decisão registrada em docs/decisoes-tecnicas.md).
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (!ehRotaProtegida(pathname) && pathname !== "/login") {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname === "/login") {
    // Já logado tentando ver a tela de login: manda direto pra home dele.
    if (user) {
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("papel, ativo")
        .eq("auth_id", user.id)
        .maybeSingle();
      if (usuario?.ativo) {
        return NextResponse.redirect(new URL(HOME_POR_PAPEL[usuario.papel as Papel], request.url));
      }
    }
    return response;
  }

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("papel, ativo")
    .eq("auth_id", user.id)
    .maybeSingle();

  // Sem linha em `usuarios`, ou cadastro ainda pendente de aprovação
  // (Fase B): trata como não autorizado a entrar nas áreas protegidas.
  if (!usuario || !usuario.ativo) {
    return NextResponse.redirect(new URL("/login?pendente=1", request.url));
  }

  const papel = usuario.papel as Papel;

  // Bombeiro tentando abrir uma rota admin, ou staff tentando abrir o
  // Portal: manda cada um para a área do próprio papel. IMPORTANTE: staff
  // tem 4 áreas (/painel, /bombeiros, /eventos, /financeiro), não só a
  // home — checar só "pathname começa com a home" bloquearia staff de
  // acessar as outras 3 (bug real, pego testando no navegador com um
  // Supabase de verdade; em modo apresentação isso nunca roda).
  if (!ehAreaDoPapel(papel, pathname)) {
    return NextResponse.redirect(new URL(HOME_POR_PAPEL[papel], request.url));
  }

  return response;
}

// CRITICAL corrigido em 2026-08-29 (achado real testando, não hipotético):
// este array precisa ser mantido manualmente em sincronia com
// ROTAS_PROTEGIDAS (src/lib/auth/protected-routes.ts) — o Next.js exige
// que `matcher` seja uma constante estática (não aceita import de valor
// computado, ver node_modules/next/dist/docs/.../proxy.md: "matcher
// values need to be constants so they can be statically analyzed at
// build-time"). `/clientes` e `/precos` foram adicionados a
// ROTAS_POR_PAPEL sem atualizar este matcher, o que deixou as duas
// rotas 100% sem autenticação em produção — o proxy nem chega a rodar
// pra paths fora desta lista, então nenhuma checagem de sessão/papel
// acontecia. Por isso toda página admin agora TAMBÉM chama
// requireStaff()/getSessionUsuario() diretamente (defesa em
// profundidade) — não depende só deste matcher estar certo.
export const config = {
  matcher: [
    "/portal/:path*",
    "/painel/:path*",
    "/bombeiros/:path*",
    "/clientes/:path*",
    "/eventos/:path*",
    "/precos/:path*",
    "/financeiro/:path*",
    "/auditoria/:path*",
    "/login",
  ],
};
