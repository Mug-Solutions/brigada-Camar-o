# Log de Decisões Técnicas — Sistema Brigada Camarão

> Registro cronológico de toda decisão de arquitetura, segurança ou escopo tomada durante a construção, com o motivo por trás de cada uma. Objetivo: servir de base para a conversa de entrega com o cliente — nada aqui deveria ser uma surpresa na hora da entrega.
>
> Formato de cada entrada: **decisão** · contexto/motivo · alternativas descartadas (quando relevante).

---

## 2026-08-26 — Fase de planejamento (arquitetura geral)

**1. PWA em vez de app nativo para o Portal do Bombeiro.**
Motivo: cobre login, autocadastro com upload de foto/documento (câmera do celular), notificação e ícone na tela inicial sem o custo/fricção de loja de app (aprovação, atualização, manter duas versões). Único gap conhecido: push notification no iOS só funciona de forma confiável a partir do iOS 16.4+; como WhatsApp é canal obrigatório no PRD, ele cobre esse gap.
Alternativa descartada: React Native/Expo nativo — fica em standby, só se aparecer necessidade concreta que PWA não resolve (ex.: geolocalização em segundo plano, exigência de presença na loja por imagem institucional).

**2. Sistema single-tenant, não SaaS multi-cliente.**
Motivo: construído especificamente para a Brigada Camarão. RBAC separa os 4 papéis (Direção/Operação/Financeiro/Bombeiro) dentro dessa única organização.
Nota para o futuro: se a MUG quiser revender o mesmo produto para outras empresas de brigada, o ponto de extensão é `organizacao_id` em todas as tabelas + RLS por organização — não é uma reescrita, mas não está sendo construído agora.

**3. O sistema nunca dispara pagamento bancário diretamente.**
Motivo: ele calcula e prepara a "folha pronta para pagar" (lista + valores + chave PIX) e, quando aplicável, o arquivo de remessa — mas quem aprova e dispara o pagamento no banco continua sendo o time financeiro da Brigada Camarão. Isso mantém o sistema fora do escopo regulatório de instituição de pagamento.

**4. Integrações externas (WhatsApp, ERP/contábil, folha de pagamento) via camada de adaptador, provedor concreto ainda não definido.**
Motivo: o cliente ainda não informou qual provedor de WhatsApp Business API, qual ERP/contábil usa, nem qual sistema de folha de pagamento. Construir atrás de uma interface interna estável evita retrabalho quando essas respostas chegarem. Ver pendências em `arquitetura-sistema.html`, seção 11.

---

## 2026-08-26 — Planejamento do Portal do Bombeiro (App)

**5. Autocadastro do bombeiro liberado só quando CPF + telefone informados batem com um registro já existente na tabela `bombeiros`.**
Motivo: alternativa de convite por link foi descartada a pedido do cliente (Gabriel) por risco de vazamento — um link vazado permitiria qualquer pessoa se cadastrar e sujar a base. CPF sozinho também foi descartado como gate único, porque pode ser adivinhado/conhecido por terceiros (ex.: familiar do bombeiro). CPF+telefone juntos fecham essa brecha sem exigir nenhum trabalho manual extra da coordenação, porque os dois campos já existem no cadastro atual dos 300 bombeiros.
Segunda camada de proteção: mesmo com CPF+telefone corretos, a conta nasce "pendente" — só libera acesso à escala depois que a coordenação aprova manualmente (isso já era um requisito essencial do PRD, não é trabalho novo).
Para bombeiros novos (fora da base atual): a coordenação precisa cadastrar nome/CPF/telefone pelo formulário admin já existente antes que a pessoa consiga se autocadastrar — mesmo pré-requisito de hoje, nada muda no fluxo da coordenação.

**6. RLS (Row Level Security) ligado em todas as tabelas administrativas já na Fase A da construção do Portal, não deixado para depois.**
Motivo: as telas admin atuais usam um client com service-role key (que ignora RLS), então ligar RLS agora não quebra nada que já funciona — só passa a filtrar corretamente o acesso via sessão de usuário comum (bombeiro/staff logado). Adiar isso deixaria uma falsa sensação de segurança assim que o login existisse.

**7. Service worker do PWA escrito à mão (cache mínimo do app shell), em vez de biblioteca (next-pwa/serwist).**
Motivo: o projeto está em Next.js 16.3.0 com Turbopack, uma combinação muito recente — bibliotecas de PWA mais populares ainda não têm compatibilidade comprovada nessa versão. O requisito real é só "instalável na tela inicial" (não offline completo), então uma solução mínima e sem dependência externa é mais confiável que arriscar incompatibilidade.

**8. Vitest escolhido como framework de testes.**
Motivo: o projeto não tinha nenhum framework de teste até agora. Vitest foi escolhido por ser o padrão recomendado para projetos Next.js modernos e ter setup mais leve que Jest.

**9. Middleware é o único ponto de proteção de rota na Fase A (nenhuma página admin foi reestruturada ainda).**
Motivo: mover as rotas admin para um route group `(admin)` com layout próprio é trabalho da Fase C (estrutura do Portal). Para não adiantar essa reestruturação nem duplicar checagem de sessão em 4 páginas diferentes, a Fase A concentra toda a exigência de sessão/papel em `middleware.ts`. Quando `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` não estão configurados (modo demonstração), o middleware não bloqueia nada — preserva o comportamento atual de apresentação sem banco.

---

## 2026-08-26 — Execução da Fase A (autenticação)

**10. Next.js 16 renomeou `middleware.ts` para `proxy.ts`.**
Motivo: descoberto ao consultar a documentação embutida no próprio pacote (`node_modules/next/dist/docs`), como o `AGENTS.md` do projeto instrui a fazer antes de escrever código nessa versão. `middleware.ts` na raiz continuaria funcionando (deprecado, não removido), mas o arquivo novo já nasceu como `src/proxy.ts`, seguindo a convenção atual. Mesma função, nome e local do arquivo diferentes.

**11. Parte da reestruturação de rotas planejada para a Fase C foi antecipada para a Fase A.**
Motivo: o layout raiz (`src/app/layout.tsx`) renderizava o `Sidebar` administrativo para toda e qualquer rota. A tela de `/login` (Fase A) não pode herdar essa navegação. Em vez de adiar isso, as 4 rotas administrativas (`painel`, `bombeiros`, `eventos`, `financeiro`) foram movidas para um route group `src/app/(admin)/` com layout próprio — as URLs não mudam (route group não aparece na URL), só a organização de pastas. O layout raiz ficou só com `<html>/<body>`.

**12. `requireStaff()` — guard de papel obrigatório em toda Server Action que usa a service-role key.**
Motivo: revisão do agente `security-reviewer` (achado HIGH) apontou que as Server Actions administrativas (ex.: `criarBombeiro`) usam um client com service-role key (ignora RLS) sem nenhuma checagem de papel própria — a proteção dependia 100% do `matcher` do `src/proxy.ts` cobrir a rota. A própria documentação do Next.js 16 alerta que uma Server Function não é uma rota separada na cadeia do proxy: uma mudança de rota ou de matcher pode remover essa proteção silenciosamente. Criado `requireStaff()` em `src/lib/auth/session.ts`, já aplicado em `criarBombeiro` — toda nova Server Action administrativa criada nas próximas fases deve chamar essa função como primeira linha.

**13. Corrigida brecha crítica na policy de RLS `usuarios_self_insert` antes de qualquer aplicação em banco real.**
Motivo: revisão do `security-reviewer` (achado CRITICAL) mostrou que a policy original só checava `auth_id = auth.uid()`, sem restringir `papel`/`ativo` — qualquer pessoa com uma sessão válida do Supabase Auth (inclusive fora do app, direto na API pública do GoTrue) poderia se auto-inserir como `papel='staff', ativo=true` e ganhar acesso total via `is_staff_ativo()`. A policy agora exige `papel='bombeiro' and ativo=false` na própria inserção — elevar para staff/aprovar continua sendo só através da Server Action de aprovação da Fase B (service-role, verificada por `requireStaff()`).

**14. Ausência das variáveis de auth em produção passou a ser falha visível (HTTP 500), não bypass silencioso.**
Motivo: achado MEDIUM do `security-reviewer` — o "modo apresentação" (nenhuma rota bloqueada quando `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` não estão configuradas) é intencional em desenvolvimento, mas se essas variáveis faltassem por engano num deploy de produção, o efeito seria abrir todas as rotas admin sem exigir login nenhum. `src/proxy.ts` agora só aplica esse bypass quando `NODE_ENV !== "production"`.

## 2026-08-26 — Execução da Fase B (autocadastro + aprovação)

**15. Vínculo do autocadastro implementado como trigger no banco (`auth.users` → `usuarios`), não como lógica no Server Action.**
Motivo: o Supabase pode ou não abrir sessão imediatamente após `signUp()`, dependendo da configuração "Confirm email" do projeto. Uma trigger no `INSERT` de `auth.users` funciona nos dois casos, porque não depende de sessão — só do registro ter sido criado. O Server Action de cadastro (`src/app/cadastro/actions.ts`) faz uma pré-checagem (função `bombeiro_disponivel_para_cadastro`) só para poder mostrar uma mensagem de erro específica antes de criar a conta; quem decide de verdade o vínculo é a trigger.

**16. `Confirm email` precisa ficar desligado no projeto Supabase real — decisão de produto, não só técnica.**
Motivo: com "Confirm email" ligado, não existe sessão ativa logo após o `signUp()`, e o fluxo atual depende disso para confirmar ao bombeiro se o CPF/telefone bateu. Dado que o próprio gate de segurança do cadastro já é o CPF+telefone (não o e-mail), e a aprovação manual da coordenação é a segunda camada, a confirmação por e-mail foi julgada dispensável para esse fluxo interno. Registrado como configuração manual obrigatória no topo de `supabase/migrations/0002_cadastro.sql`.

**17. Recusar um cadastro pendente também apaga a conta de login (`auth.users`), não só o vínculo.**
Motivo: sem isso, uma pessoa que errou o CPF/telefone na hora de se cadastrar ficaria com o e-mail "preso" (Supabase não permite duas contas com o mesmo e-mail) e não conseguiria tentar de novo sem um administrador mexer direto no painel do Supabase.

**18. Rate limit de 5 tentativas / 15 minutos por CPF na pré-checagem de cadastro (`bombeiro_disponivel_para_cadastro`).**
Motivo: achado do `security-reviewer` — essa função precisa ser chamável sem login (roda antes de existir sessão) e fica acessível direto pela API pública do Supabase, não só pelo formulário do site. Vazamento de CPF fora do sistema é um cenário realista no Brasil; sem limite, alguém que já soubesse um CPF válido poderia tentar adivinhar o telefone por força bruta. O limite é por CPF normalizado (não por IP), porque é exatamente esse o vetor que precisava ser fechado.

**19. Correções aplicadas depois da revisão de segurança da Fase B (achados reais, não hipotéticos):**
- 🔴 **Crítico**: `recusarCadastro` apagava a conta de login usando um `auth_id` que vinha de um campo oculto do formulário — reenviável/editável por qualquer requisição forjada, sem nenhuma checagem cruzada com o cadastro sendo recusado. Uma sessão de staff comprometida (ou só uma requisição adulterada) conseguiria apagar o login de **qualquer pessoa** no sistema, não só de um cadastro pendente. Corrigido: o `auth_id` agora é sempre resolvido no servidor a partir da própria linha excluída, nunca do valor enviado pelo formulário; `aprovarCadastro` e `recusarCadastro` passaram a exigir `papel='bombeiro' AND ativo=false` na query, não só o `id`.
- 🟠 **Médio**: o comentário original dizia que a trigger "fechava a corrida" entre dois cadastros concorrentes com o mesmo CPF+telefone, mas um `select` seguido de `insert` dentro da trigger não é atômico sozinho — dava pra duas contas ficarem vinculadas ao mesmo bombeiro em caso de corrida real. Corrigido com um índice único (`usuarios_bombeiro_unico`) que faz o próprio Postgres recusar a segunda inserção, com a exceção capturada na trigger para não abortar a criação da conta de quem perdeu a corrida.
- 🟠 **Médio**: conta de login `auth.users` ficava órfã (sem linha em `usuarios`) quando o vínculo falhava depois do `signUp()`, travando uma nova tentativa com o mesmo e-mail. Corrigido: o Server Action agora apaga essa conta órfã antes de devolver o erro.

## 2026-08-27 — Validação de ponta a ponta contra Supabase real

Primeira vez testando as Fases A e B contra um projeto Supabase de verdade (via navegador com a extensão Claude in Chrome + chamadas diretas à API para diagnosticar erros que a UI propositalmente disfarça). Duas categorias de achado: configuração do projeto (não é código) e um bug real de código.

**20. Bug real encontrado: staff só conseguia acessar `/painel`, não as outras 3 áreas administrativas.**
Ao testar `/bombeiros/aprovacoes` logado como staff, o proxy redirecionava de volta pro `/painel` — bug, não comportamento esperado. Causa: a checagem de "área correta" em `src/proxy.ts` comparava a rota pedida só com a *home* do papel (`pathname.startsWith(home)`), e a home do staff é `/painel` — então `/bombeiros`, `/eventos` e `/financeiro` (as outras 3 áreas que o staff deveria acessar) eram tratadas como "fora da área" e redirecionadas. Esse bug nunca teria aparecido testando só em modo apresentação (sem Supabase configurado), porque nesse modo o proxy não bloqueia nada — só apareceu ao testar com autenticação real ligada, que é exatamente por que decidimos testar isso antes de empilhar mais fases em cima. Corrigido com `ehAreaDoPapel()` (`src/lib/auth/protected-routes.ts`), que mapeia cada papel para a lista completa de prefixos de rota que ele pode acessar, não só a home — com testes de regressão cobrindo especificamente esse caso.

**21. Duas configurações do próprio projeto Supabase pegaram o cliente de surpresa (não são bugs de código):**
- **"Email provider" desativado** em Authentication → Providers → Email — um toggle separado do "Confirm email", que bloqueava login e cadastro por e-mail/senha completamente (erro `email_provider_disabled` só visível chamando a API direto, porque nossa mensagem de erro no app é propositalmente genérica por segurança).
- **"Confirm email" não tinha realmente salvo como desligado** na primeira tentativa — ficou aparentemente configurado mas voltou a ficar ativo, causando `over_email_send_rate_limit` (o SMTP padrão do Supabase é bem limitado) ao tentar cadastrar um bombeiro de teste.

Registrado aqui porque é o tipo de coisa que vale confirmar de novo antes da entrega final ao cliente — configuração de painel não fica versionada em lugar nenhum do código, só aqui.

**22. Fluxo completo validado de ponta a ponta com dados de teste descartáveis, criados e apagados na mesma sessão:**
- Login do staff (Fase A) — funcionando, redireciona pra `/painel` com dados reais do banco (vazio).
- RLS: bombeiro só lê a própria linha em `bombeiros` (testado com o token de sessão real do bombeiro de teste) e não lê `clientes` nenhuma (sem policy = bloqueado por padrão) — confirmado direto na API, não só por inspeção do código.
- Autocadastro (Fase B): bombeiro de teste (CPF/telefone fictícios) → vínculo automático via trigger → aparece na fila de aprovação → staff aprova → bombeiro consegue logar. Passo a passo completo, sem atalho.
- Todos os dados de teste (bombeiro, vínculo `usuarios`, conta `auth.users`, linha de rate-limit) foram apagados ao final — banco real do cliente ficou só com a conta de staff.

## 2026-08-27 — Fase C (estrutura do Portal / shell PWA)

**23. Manifest gerado via `src/app/manifest.ts` (file convention do Next), com `scope`/`start_url` apontando pra `/portal`.**
Motivo: só o Portal do Bombeiro deve ser instalável como app — a área admin continua sendo uso de navegador normal em desktop. O link de manifest acaba presente em todo o `<head>` do app (efeito colateral da convenção do Next ficar na raiz), mas isso não tem efeito nenhum fora do fluxo de instalação.

**24. Ícone do PWA é um SVG provisório (iniciais "BC"), não o ícone de marca definitivo.**
Motivo: ícone de app de verdade (com padding de safe-zone pra variante "maskable" no Android) precisa vir de um asset de design real da MUG, não faz sentido eu inventar a identidade visual final. SVG funciona bem o suficiente pra Chrome/Android instalarem o app agora; troca por PNG oficial fica pendente antes de qualquer lançamento real.

**25. Service worker mínimo escrito à mão, escopado só às rotas do Portal (`/portal/*`, manifest, ícone) — reafirma a decisão #7 da Fase A/B, já tomada antes de começar a construir.**

**26. Não foi possível confirmar visualmente (screenshot/clique real) que o shell do Portal renderiza — problema de infraestrutura da integração do navegador, não do código.**
Depois de validar Fases A e B inteiras com sucesso via navegador nesta mesma sessão, a conexão da extensão Claude in Chrome parou de funcionar especificamente para acessar `localhost:3000` a partir de um certo ponto (após o dev server cair e reiniciar sozinho por causa de um `rm -rf .next` que rodei enquanto ele estava de pé) — mesmo depois de reiniciar o servidor do zero, trocar de aba, reconectar o browser e o usuário reabrir a extensão. O usuário confirmou que a página abre normalmente no navegador dele fora dessa integração, então não é um problema real de servidor/rede — é a sincronização da extensão com o ambiente onde os comandos de terminal rodam. A Fase C foi fechada com base em verificação automatizada (build limpo com as rotas certas, lint, 16 testes passando, código conferido contra a documentação oficial do Next 16 antes de escrever) — a confirmação visual (instalação na tela inicial, navegação inferior) fica pendente de um teste manual do usuário ou de uma sessão futura com a integração de navegador funcionando.

## 2026-08-27 — Redesenho do autocadastro (feedback direto do cliente)

**27. Trocado o gate "CPF+telefone contra registro pré-existente" (Fase B original) por "solicitação revisada por humano antes de qualquer conta existir".**
Motivo: o cliente rejeitou o modelo anterior — não quer que a coordenação precise pré-cadastrar cada bombeiro em `/bombeiros/novo` antes dele conseguir se autocadastrar. Novo fluxo: o bombeiro manda os próprios dados (nome, CPF, telefone, função, e-mail) pra uma tabela de solicitações (`solicitacoes_cadastro`); nada entra em `bombeiros`/`usuarios` até a coordenação aprovar. Isso resolve a preocupação original de segurança (base "suja" por link vazado) de forma mais direta que o desenho anterior — o gate agora é revisão humana, não mais correspondência de dado.

**28. Convite por e-mail (o bombeiro define a própria senha) em vez de senha gerada pelo sistema.**
Motivo: o cliente originalmente pediu "senha gerada e enviada por e-mail" — recomendei o padrão de link de convite (`supabase.auth.admin.inviteUserByEmail`) porque mandar senha em texto puro por e-mail é prática insegura (fica salva indefinidamente na caixa de entrada, pode ser encaminhada, e-mail não é canal criptografado ponta a ponta). Confirmado pelo cliente. Resultado prático é o mesmo pro bombeiro (recebe e-mail assim que aprovado, clica, acessa), mas nenhuma senha real trafega em lugar nenhum — ele define a própria em `/convite` (`src/app/convite/`), usando a sessão que o próprio link do Supabase já estabelece.

**29. `usuarios.ativo` passa a nascer `true` direto na aprovação — não existe mais um estado "conta criada mas pendente".**
Motivo: no desenho anterior, a conta nascia primeiro (via autocadastro) e só depois ficava pendente de aprovação. Agora a ordem se inverte: a aprovação acontece ANTES de qualquer conta existir (é o que cria a conta). Não faz sentido um segundo estado de "pendência" depois disso.

**30. `solicitacoes_cadastro` não tem nenhuma policy de RLS pra `anon`/`authenticated` — ao contrário da Fase B antiga, que precisava de uma função `security definer` chamável publicamente.**
Motivo: a submissão do formulário agora roda inteira dentro de uma Server Action server-side (`src/app/cadastro/actions.ts`), usando a service-role key — não existe mais nenhum cliente do navegador tocando o banco diretamente nessa etapa. Superfície de ataque menor que antes (nenhuma RPC pública exposta).

**31. Removido o rate-limiter dedicado (`cadastro_tentativas`) que existia na Fase B antiga.**
Motivo: aquele limite protegia contra alguém tentando adivinhar o telefone de um CPF real por força bruta (o gate antigo comparava contra dados reais de bombeiros). Nesse novo desenho não existe mais esse gate — uma submissão falsa só polui a fila de revisão da coordenação (que pode simplesmente recusar), não expõe nem cria nada sensível. Ameaça mudou, proteção antiga não fazia mais sentido pro novo risco.

## 2026-08-27 — Revisão de segurança do redesenho

Segunda revisão do `security-reviewer` desde o achado CRITICAL da semana passada (delete de conta por campo não confiável) — **dessa vez nenhum CRITICAL**, a correção estrutural anterior segurou. Dois achados corrigidos:

**32. 🟠 Alto — chamadas de rollback em `aprovarSolicitacao` não verificavam o próprio resultado.**
Se o convite fosse enviado mas o insert em `bombeiros` falhasse, o código desfazia a conta (`deleteUser`) sem checar se esse próprio desfazimento funcionou. Se o rollback em si falhasse (erro transitório na API do Auth), sobrava uma conta de convite órfã — sem bombeiro, sem `usuarios`, mas com e-mail de convite já entregue. Como `auth.users.email` é único, qualquer nova tentativa de aprovar a mesma solicitação passaria a falhar pra sempre no envio do convite, sem ninguém saber por quê. Corrigido: toda etapa de rollback agora verifica o próprio erro e loga alto (`console.error`) especificamente quando o PRÓPRIO rollback falha — esse é o único ponto do fluxo que fala com uma API externa fora de uma transação, então não pode falhar em silêncio.

**33. 🟡 Médio — fila de aprovação sem limite de consulta + formulário público sem nenhuma proteção contra automação.**
Sem `LIMIT` na consulta de `/bombeiros/aprovacoes`, uma enchente de submissões falsas no `/cadastro` (público, sem rate limit) não seria só "chato de recusar" — deixaria a própria tela de aprovação lenta ou instável. Corrigido com `.limit(200)` na consulta e um campo honeypot no formulário de cadastro (invisível pra humano, tende a ser preenchido só por preenchimento automatizado — se vier preenchido, a Server Action finge sucesso sem gravar nada). Rate limit por IP mais robusto fica como item pra reavaliar se algum abuso real aparecer — mesmo raciocínio já usado antes pra não superengenhar uma proteção sem sinal de que é necessária.

## 2026-08-27 — Terceiro desenho do autocadastro (correção do cliente sobre quem inicia o convite)

**34. O convite passa a começar pelo admin (só e-mail), não mais pelo bombeiro.**
Motivo: depois de testar a versão anterior (bombeiro preenchia formulário público completo, staff aprovava depois), o cliente corrigiu — o admin precisa autorizar o e-mail primeiro. Fluxo final: admin cadastra só o e-mail → sistema convida na hora → bombeiro define senha e preenche os próprios dados → admin revisa e aprova/recusa → acesso liberado. Essa é a terceira versão desse fluxo na mesma sessão; cada correção do cliente melhorou a segurança um degrau: v1 (CPF+telefone contra registro existente) → v2 (revisão humana antes de qualquer conta) → v3 (só quem foi convidado pelo admin chega no formulário — fecha a brecha de link vazado de forma mais direta que as duas anteriores).

**35. `solicitacoes_cadastro` ganhou um novo estado inicial (`convidado`) antes de `pendente`.**
Ciclo agora: `convidado` (admin convidou, sem dado pessoal nenhum ainda) → `pendente` (bombeiro preencheu, aguardando revisão) → `aprovado`/`recusado`. Nome/CPF/telefone/função passaram a ser opcionais na tabela (só existem a partir do estado `pendente`).

**36. Nova rota `/completar-cadastro` fica deliberadamente fora da lista de rotas protegidas do proxy.**
Motivo: nesse ponto do fluxo o bombeiro já tem sessão (definiu senha no convite) mas ainda não tem linha em `usuarios` — o proxy trataria isso como "não autorizado" pra qualquer rota protegida, o que é certo pro `/portal` mas errado pra essa tela específica. Resolvido com uma checagem de sessão só nessa página, sem tocar em `src/proxy.ts` (já revisado duas vezes — menor risco não mexer nele de novo).

**37. `/cadastro` (formulário público sem convite prévio) foi removido por completo.**
Não existe mais nenhum jeito de entrar nesse fluxo sem ser convidado por um admin primeiro.

## 2026-08-27 — Revisão de segurança da terceira rodada

**38. Terceira revisão do `security-reviewer` seguida sem CRITICAL nem HIGH** — a disciplina das duas correções anteriores (nunca confiar em campo de formulário pra identidade; sempre checar erro de rollback) se manteve válida no código novo. Dois achados menores corrigidos:

- 🟡 **Médio**: convidar o mesmo e-mail duas vezes enquanto o primeiro convite ainda estava em aberto (`convidado`/`pendente`) criava duas linhas pro mesmo login — a tela de `/completar-cadastro` quebrava (esperava uma linha só) e travava um convite legítimo até alguém arrumar direto no banco. Corrigido com índice único parcial (`solicitacoes_cadastro_auth_id_ativo`) + checagem prévia amigável em `convidarBombeiro` antes de gastar o envio do convite.
- 🟢 **Baixo**: o update final de `aprovarSolicitacao` (marcar `status='aprovado'`) não conferia se a solicitação ainda estava `pendente` — se dois membros da coordenação clicassem Aprovar e Recusar quase ao mesmo tempo na mesma solicitação, o Aprovar podia sobrescrever um `recusado` de volta pra `aprovado`, mesmo com a conta já apagada. Corrigido escopando o update também a `status='pendente'` e conferindo se realmente afetou alguma linha.

Também recriei, no lugar certo do ciclo, o índice de "1 CPF pendente por vez" (`solicitacoes_cadastro_cpf_pendente`) — a versão anterior desse índice trancava na hora do convite (quando o CPF nem existe ainda), então foi removida; agora ele trava na hora certa (`status='pendente'`, quando o CPF já foi preenchido), que é quando a proteção faz sentido de novo.

**39. Corrigido de passagem: a tela de aprovações nunca mostrava as mensagens de erro que as próprias actions já geravam.** As actions sempre redirecionavam com `?erro=1`/`?erro=convite` na URL, mas a página nunca lia esse parâmetro — o staff via a URL mudar sem nenhum feedback visual do que deu errado. Não é achado de segurança, só uma lacuna de UX que apareceu mexendo nessa área; corrigido junto.

## 2026-08-27 — Bug real encontrado testando: sessão do link de convite colidia com sessão já salva no navegador

**40. `/convite` agora extrai os tokens do link manualmente e força a sessão, em vez de confiar no comportamento automático do cliente do Supabase.**
Achado testando de verdade (não em revisão de código): ao clicar no link de convite no mesmo navegador em que a conta de staff já estava logada, a tela de "definir senha" processou a ação **na sessão errada** — a senha digitada pra o convite sobrescreveu a senha da conta de staff que já estava aberta, em vez de criar a senha do bombeiro convidado. Duas vezes seguidas, foi preciso redefinir a senha do admin via API depois disso.

Causa raiz: o `createBrowserClient` do `@supabase/ssr` mantém **um único cliente compartilhado por navegador** (`localStorage`), reaproveitado entre abas do mesmo perfil — não é por aba, é por navegador. Deixar o mecanismo automático de "detectar sessão pela URL" competir com uma sessão já salva é uma corrida, não uma garantia.

Correção: `src/app/convite/DefinirSenhaForm.tsx` agora lê `access_token`/`refresh_token` direto da URL do link e chama `supabase.auth.setSession(...)` explicitamente, de forma determinística — não depende mais de "quem chega primeiro" entre a sessão salva e a sessão do link.

**Nota prática pra continuar testando**: mesmo com a correção, testar fluxos de convite/redefinição de senha no mesmo navegador onde já existe uma sessão de staff logada é um cenário propenso a esse tipo de confusão. Vale usar uma janela anônima/privada (ou outro navegador) para testar como o bombeiro, sempre que o staff já estiver logado na janela normal.

## 2026-08-27 — Link de convite sendo consumido antes do bombeiro clicar

**41. O link do e-mail de convite não aponta mais direto pro endpoint de verificação do Supabase — aponta pra uma página nossa com um botão "Confirmar e continuar".**
Achado testando de verdade: o link de convite deu "expirado" mesmo recém-enviado. Causa confirmada (não foi hipótese — reproduzi o próprio consumo do token com um `curl` de teste): o link padrão do Supabase (`{{ .ConfirmationURL }}`) aponta direto pro endpoint `/auth/v1/verify`, que é um `GET` — e **qualquer requisição a essa URL consome o token de uso único**, inclusive o escaneamento automático de segurança que Gmail/Outlook fazem em links de e-mail antes da pessoa clicar de verdade. Como o público-alvo real (bombeiros usando e-mail pessoal, provavelmente Gmail) tem boa chance de usar exatamente esses provedores, isso não era só um acidente de teste — ia quebrar convites reais.

Correção: o e-mail agora linka pra `{{ .SiteURL }}/convite?token_hash={{ .TokenHash }}&type=invite` (nossa própria página) em vez do link cru. `src/app/convite/DefinirSenhaForm.tsx` só chama `supabase.auth.verifyOtp({token_hash, type})` — a ação que de fato consome o token — quando a pessoa clica no botão "Confirmar e continuar". Um scanner de e-mail segue o link (visita a página), mas não clica em botão nenhum, então não consome mais nada.

**Exige uma configuração manual no painel do Supabase** (Authentication → Email Templates → Invite user) — modelo de e-mail pronto salvo em `prototipo/sistema/supabase/email-templates/convite.html`, já em português e com o link certo.

**42. Achado secundário, corrigido junto: colisão de sessão no mesmo navegador.**
Antes de chegar na causa raiz acima, também apareceu um segundo problema real: testar o link de convite no MESMO navegador em que uma conta de staff já estava logada fez a troca de senha acontecer **na conta errada** (a senha do admin foi sobrescrita duas vezes seguidas por acidente, precisou ser redefinida via API). Causa: o cliente do Supabase no navegador (`@supabase/ssr`) mantém uma única instância compartilhada por navegador (não por aba), com a sessão em `localStorage` — deixar o "auto-detect" de sessão da URL competir com uma sessão já salva é uma corrida. `DefinirSenhaForm.tsx` agora extrai os tokens explicitamente e chama `setSession`/`verifyOtp` de forma determinística, sem depender dessa corrida. Mesmo assim, testar como um usuário diferente do que já está logado no navegador continua sendo mais seguro numa janela anônima.

## 2026-08-29 — SMTP próprio configurado (Resend) + terceiro bug de sessão corrigido

**43. SMTP próprio (Resend) configurado no projeto Supabase**, liberando edição do template de e-mail (exigência do próprio Supabase) e tirando o limite de envio baixo do serviço compartilhado que travou os testes várias vezes nas sessões anteriores.

**44. Depois do SMTP configurado, apareceu mais um bug real de sessão: `router.push()` depois de definir a senha não levava a sessão nova pro servidor — a pessoa caía de volta no `/login` como se não tivesse conta.**
Causa: toda a etapa de convite (`verifyOtp`, `updateUser`) roda inteiramente no navegador, então a sessão nova é escrita via cookie pelo próprio JavaScript do cliente. `router.push()` é uma navegação client-side do Next.js (busca só os dados da próxima rota, sem recarregar a página) — não há garantia de que o servidor já enxerga esse cookie recém-escrito nesse tipo de navegação. Corrigido trocando por `window.location.href` (recarregamento completo de página) só nesse ponto específico — depois de definir a senha, garantindo que a próxima página (`/completar-cadastro`) é servida já com a sessão certa.

Terceiro bug de sessão encontrado testando esse mesmo fluxo (depois da colisão de sessão no mesmo navegador e do link sendo consumido por scanner de e-mail) — todos na mesma área (`/convite`), todos só apareceram testando de verdade, não em revisão de código.

## 2026-08-29 — Achado real no template: `{{ .SiteURL }}` vs `{{ .RedirectTo }}`

**45. O template do e-mail de convite usava `{{ .SiteURL }}` (configuração fixa do projeto no Supabase) em vez de `{{ .RedirectTo }}` (o valor dinâmico que a Server Action já manda a cada convite).**
Isso fazia o link do e-mail ignorar completamente a URL que a aplicação estava pedindo (`SITE_URL` do `.env.local`, incluindo quando trocamos pra um túnel público de teste) — sempre usava o mesmo endereço fixo configurado uma vez no painel do Supabase. Foi a causa real de várias tentativas de teste "não funcionarem": o link que chegava no e-mail não era o que a gente esperava, mesmo depois de mudar a configuração local. Corrigido no template (`prototipo/sistema/supabase/email-templates/convite.html`).

**46. Formulário de `/completar-cadastro` expandido pra incluir os campos de compliance (ASO, matrícula E-Social, credenciamento) — não só dados pessoais.**
Pedido do cliente: o autocadastro do bombeiro deve coletar os mesmos campos que o formulário admin "Novo Bombeiro" já pede, não só nome/CPF/telefone/função. `aprovarSolicitacao` agora copia esses campos pro registro real em `bombeiros` na aprovação, e a fila de aprovação (`/bombeiros/aprovacoes`) mostra o status desses documentos (usando os mesmos `docStatus()`/`Chip` já existentes) pra o staff revisar antes de aprovar — reforça a regra de bloqueio automático por documento vencido, já que agora o bombeiro entra com essa informação desde o autocadastro.

## 2026-08-29 — Link do convite continuou quebrado mesmo após corrigir allowlist e template; validação adiada pra hospedagem real

**47. Investigação aprofundada não achou a causa definitiva do link do e-mail de convite continuar renderizando `http://localhost:3000` (sem `/convite`) mesmo depois de quatro correções distintas testadas em sequência:** URL do túnel adicionada à allowlist de Redirect URLs, template trocado pra usar `{{ .RedirectTo }}` com `/convite` explícito, `Site URL` do projeto trocada pra apontar pro túnel, e template trocado pra usar `{{ .SiteURL }}` com `/convite` explícito. Nenhuma dessas mudanças alterou uma única letra do link recebido — sinal de que ou as edições no painel não estavam sendo salvas de fato, ou há uma camada de cache no lado do Supabase que este ambiente de teste (projeto pausável, túnel temporário) não deixou expor claramente.

Reconstruindo pela hora dos e-mails: os testes que **funcionaram de verdade** (chegaram até a tela de criar senha) foram feitos numa sessão anterior, num período em que `SITE_URL` ainda era `localhost` puro — ou seja, o mecanismo em si já foi validado funcionando; o que quebrou depois foi especificamente a combinação "trocar pra um domínio de túnel temporário + Supabase respeitar essa troca dinamicamente", não o fluxo de convite/senha/aprovação em si (esse já tem 3 rodadas de teste e revisão de segurança limpas, ver itens 22, 38 e 40-44).

**Decisão do cliente: parar de tentar isolar esse problema em ambiente local/túnel e validar o link de convite quando o sistema estiver hospedado** (mesmo que num hospedeiro gratuito). Motivo: com domínio público fixo, `SITE_URL`/Site URL do Supabase deixam de mudar a cada sessão de teste — a causa mais provável do problema (alguma forma de descompasso entre o valor esperado e o que o Supabase realmente usa) some estruturalmente, sem precisar ser diagnosticada às cegas.

**Nota pra continuar depois:** ao repetir esse teste já hospedado, se o link ainda vier errado, os quatro pontos já testados aqui (allowlist, template com RedirectTo, Site URL, template com SiteURL) podem ser descartados como causa — sobra investigar cache/propagação do lado do Supabase ou abrir chamado de suporte com eles.

## 2026-08-29 — Início da Fase 1 (núcleo operacional): módulo de Clientes

**48. Primeiro item construído da Fase 1 foi Clientes, não Compliance (que é o primeiro item listado no roadmap).** Motivo: os dois pedaços que faltam em Compliance (bloqueio automático de escalação; múltiplas hierarquias) dependem estruturalmente de Escala existir — não dá pra bloquear uma escalação que ainda não pode ser feita. Esses itens se resolvem naturalmente quando Escala for construída (mesma fase, mais adiante), não antes. Clientes é o próximo item da lista sem nenhuma dependência pendente, e Eventos já referencia `cliente_id` — é pré-requisito real do próximo item também. Decisão confirmada com o cliente antes de começar.

**49. CRUD de Clientes (listar + criar) espelha exatamente o padrão já revisado 3x em Bombeiros** — mesma estrutura de Server Action com `requireStaff()` como primeira linha, mesmo tratamento de formulário (`String(...).trim()`, nunca confiado), mesmo padrão de erro. Revisão de segurança dedicada não achou CRITICAL nem HIGH; os dois achados MEDIUM/LOW (mensagem de erro do Postgres repassada ao usuário; validação de CNPJ só por contagem de dígitos, sem dígito verificador) são heranças do mesmo padrão já aceito em Bombeiros, não regressões novas — registrados aqui caso decidam endurecer isso depois.

**50. Migração `0006_clientes_endereco.sql` adiciona a coluna `endereco`** — o schema inicial de `clientes` só tinha nome/cnpj/contato/email; o roadmap pede "cadastro completo (CNPJ, contato, endereço)". RLS de `clientes` já cobria a tabela inteira desde a migração `0001_auth.sql` (`clientes_staff_all`), então não foi preciso nenhuma policy nova.

## 2026-08-29 — Fase 1, segundo item: criação de Eventos + fluxo de aprovação de orçamento

**51. "Fluxo de aprovação de orçamento" (item do roadmap) implementado como transição de status, não como uma entidade de orçamento separada.** Evento nasce em `Planejamento` com um `valor_fechamento` proposto; a ação "Aprovar orçamento" move pra `Confirmado` (é o momento em que aquele valor passa a valer de fato); "Marcar concluído" fecha em `Concluído`. As transições são hardcoded nos dois pontos de chamada (nunca vêm de `formData`), então não existe caminho de pular ou regredir estágio — reforçado pela mesma CHECK constraint do banco que já limitava `status` aos 3 valores.

**52. `cliente_id` do formulário de criação de evento não é checado contra `clientes` antes do insert — decisão deliberada, não descuido.** A foreign key do Postgres (`eventos.cliente_id references clientes(id)`) já rejeita um id inexistente na escrita, e o `&lt;select&gt;` do formulário só lista clientes reais buscados no servidor — checar de novo na Server Action seria redundante. Confirmado em revisão de segurança dedicada.

**53. "Múltiplos turnos/dias" (outro item do roadmap para Eventos) não ganhou UI própria neste módulo — fica pro item Escala, que é o próximo da lista.** O evento já suporta intervalo de datas (`data_inicio`/`data_fim`); turno por dia é responsabilidade de cada linha de `escalas`, não do evento em si. `bombeiroAptidao()` (`src/lib/domain.ts`) já existe desde a Fase B e seu comentário já previa isso: "não deve aparecer como opção selecionável nas telas de escala" — ou seja, o bloqueio automático por documento vencido (outro item pendente de Compliance) também se resolve ali, não antes.

## 2026-08-29 — Fase 1, terceiro item: montagem de Escala (titulares, reserva, ponto) + fecha o item de Compliance pendente

**54. Escala (titular/reserva/registro de ponto) construída como uma página de detalhe por evento (`/eventos/[id]`), não uma tela separada.** Motivo: escala só faz sentido no contexto de um evento específico (bombeiro, data dentro do período do evento, turno) — juntar tudo numa página evita duplicar a busca do evento e deixa a ação "Escalar bombeiro" perto do que ela afeta.

**55. "Bloqueio automático de escalação" (item pendente de Compliance desde a Fase 1) resolvido aqui, usando `bombeiroAptidao()` que já existia desde a Fase B especificamente para este uso.** Dupla camada: o `&lt;select&gt;` de bombeiros já vem pré-filtrado (só aptos) do servidor, mas isso é só UX — a Server Action `adicionarEscala` busca o bombeiro de novo no banco pelo id recebido e roda `bombeiroAptidao()` uma segunda vez antes do insert, rejeitando se a documentação estiver vencida. Confirmado em revisão de segurança dedicada que essa re-checagem é incontornável (não existe caminho que pule ela, nem enviando o `bombeiro_id` direto via requisição forjada).

**56. Migração `0007_escalas_reserva.sql` adiciona `tipo` ('titular'/'reserva') e um índice único parcial `(bombeiro_id, data, turno) WHERE tipo='titular'`.** Deliberadamente sem `evento_id` no índice — um bombeiro titular não pode estar em dois eventos no mesmo turno/dia (conflito físico real), mas reservas podem se sobrepor livremente entre si e com titulares, porque reserva não ocupa o turno de fato. Confirmado como modelagem correta em revisão de segurança.

**57. Achado MEDIUM corrigido: `removerEscala`/`registrarPonto` recebiam `escala_id` e `evento_id` do formulário mas só usavam `escala_id` na cláusula WHERE — um `evento_id` incompatível não travava nada, só direcionava o redirect errado.** Não era uma falha de autorização de fato (o modelo atual é um papel `staff` só, com acesso total — não existe fronteira por evento pra vazar), mas era uma lacuna real de robustez (mexer/apagar a escala errada silenciosamente em caso de bug ou formulário adulterado). Corrigido escopando as duas queries também por `evento_id`, mesma disciplina de "nunca confiar num id sozinho" já usada em `aprovarSolicitacao`/`recusarSolicitacao`.

## 2026-08-29 — CRITICAL real encontrado e corrigido: `/clientes` e `/precos` sem autenticação nenhuma em produção

**58. Achado em revisão de segurança do módulo de Preços, não em teste manual: `/precos` (e, retroativamente, `/clientes` desde que foi criada nesta mesma sessão) estavam 100% acessíveis sem login.** Causa raiz: `src/proxy.ts` tem dois lugares que precisam saber quais rotas são protegidas — `ROTAS_POR_PAPEL` (`src/lib/auth/protected-routes.ts`, usado pela lógica de autorização) e o `config.matcher` do proxy (usado pelo Next.js pra decidir se a função `proxy()` roda ou não pra um path). São duas listas **separadas**, porque o Next.js exige que `matcher` seja uma constante estática — não aceita importar um valor computado (documentado no próprio `node_modules/next/dist/docs/.../proxy.md`: "matcher values need to be constants so they can be statically analyzed at build-time"). Ao criar `/clientes` e `/precos` nesta sessão, `ROTAS_POR_PAPEL` foi atualizado nas duas vezes, mas o `matcher` não — e pra qualquer path fora do `matcher`, o proxy **nem chega a rodar**, então nenhuma checagem de sessão acontecia. Isso é exatamente o cenário que a decisão #12 (Fase A) já tinha alertado como risco pra Server Actions ("uma mudança de rota ou matcher pode remover a proteção silenciosamente") — só que dessa vez aconteceu de verdade, e numa página inteira (leitura de dado via service-role), não numa action.

**Corrigido em duas camadas:**
- `src/proxy.ts`: `/clientes/:path*` e `/precos/:path*` adicionados ao `matcher`, com comentário explicando por que essa lista precisa ser mantida manualmente em sincronia com `ROTAS_POR_PAPEL`.
- **Toda página administrativa agora chama `requireStaff()` diretamente**, não só a Server Action de cada uma — mesma defesa em profundidade que já existia em `bombeiros/aprovacoes/page.tsx` e `eventos/[id]/page.tsx` desde que foram criadas, agora estendida a `bombeiros`, `bombeiros/novo`, `clientes`, `clientes/novo`, `eventos`, `eventos/novo`, `painel`, `financeiro` e `precos`. Essa é a correção que importa de verdade: mesmo que o `matcher` fique desatualizado de novo no futuro (é um erro fácil de repetir, dado que o Next.js força as duas listas a existirem separadas), a página em si já nega acesso sem sessão staff válida.

**Verificado ao vivo, não só por leitura de código**: `curl` sem cookie de sessão contra `/precos` e `/clientes` no servidor local retornou `307` para `/login` nos dois casos, depois da correção.

**Impacto real**: como o sistema ainda não está em produção (só testes locais/túnel), não houve exposição de dado real de cliente — mas seria uma exposição real de dado de negócio (preços internos, dados de contato de clientes) se isso tivesse ido pro ar sem essa correção. Fica registrado como lição pra fases futuras: **toda vez que uma rota nova for adicionada a `ROTAS_POR_PAPEL`, checar `src/proxy.ts` no mesmo commit** — e a nova disciplina de página sempre chamar `requireStaff()` deixa de depender de lembrar disso.

## 2026-08-29 — Achado testando de verdade: campos de CPF/CNPJ/telefone aceitavam qualquer coisa

**59. Campo de CNPJ do formulário de Cliente aceitou 29 dígitos digitados sem formatação nenhuma (só tinha `placeholder`, nenhuma máscara ativa) — só travava no envio, pela validação server-side.** Corrigido com máscara aplicada em tempo real (`onChange`) nos 6 campos equivalentes do sistema: CPF e telefone em `bombeiros/novo/NovoBombeiroForm.tsx` e `completar-cadastro/CompletarCadastroForm.tsx`; CNPJ e contato em `clientes/novo/NovoClienteForm.tsx`. Novo módulo `src/lib/validation/mascara.ts` (com testes) formata progressivamente e trava no tamanho máximo de dígitos (11 para CPF/telefone, 14 para CNPJ) — não dá mais pra digitar ou colar além do que o formato aceita. Campos de texto livre (nome, e-mail, endereço, local, materiais) foram deixados sem máscara, de propósito — não têm um formato fixo pra impor.

## 2026-08-29 — Ficha do evento ganha status da escala e custo ajustável

**60. Pedido do cliente: a ficha inline do evento (achado da sessão anterior) precisava mostrar status da escala e custo do evento, não só materiais/titulares/reserva.** "Status da escala" é só um chip calculado (`X/Y escalados`, ok/atenção/crítico conforme titulares vs. `quantitativo_bombeiros`) — não precisou de coluna nova. "Custo do evento" precisou: `eventos.custo_estimado` (migração `0009`, nullable, `check >= 0`) — fica `null` até o staff ajustar manualmente pela primeira vez; o campo do formulário vem pré-preenchido com a soma dos titulares já escalados (é só isso que o sistema consegue calcular sozinho — materiais não tem valor numérico rastreado, por isso o ajuste é manual, não automático).

**61. Isso é uma fatia bem pequena, deliberada, do que a Fase 3 (Financeiro) vai fazer por completo depois ("cálculo automático de custo/lucro por evento").** Não implementei margem/lucro (`valor_fechamento - custo`) agora — ficou só o custo em si, editável, porque foi só isso que foi pedido; entrar em lucro/margem sem pedido explícito seria adiantar escopo da Fase 3 sem necessidade.

## 2026-08-29 — Achado real testando: bombeiro escalado como titular e reserva ao mesmo tempo

**62. Corrige o item 56: o índice único da migração 0007 só impedia titular+titular pro mesmo bombeiro/data/turno — não impedia titular+reserva.** O cliente encontrou um bombeiro de teste (Marcos Paulo Teixeira) escalado como titular E aparecendo na lista de reserva do mesmo evento/turno simultaneamente, o que não faz sentido (quem já está escalado pra trabalhar não é o próprio plano B dele mesmo). Migração `0010` substitui o índice parcial por um índice único cobrindo a tabela inteira — `(bombeiro_id, data, turno)`, sem filtro de `tipo` — um bombeiro só pode ter uma linha de escala por data/turno, seja titular ou reserva, independente do evento. Isso também revoga a parte da decisão #56 que dizia "reservas podem se sobrepor livremente entre si" — não foi pedido testar esse caso especificamente, mas a mesma lógica de "uma pessoa, um compromisso por turno" se aplica igual.

## 2026-08-29 — Início da Fase 2: chave PIX fecha o item de autocadastro

**63. Chave PIX adicionada ao autocadastro (obrigatória) e ao cadastro manual pelo staff (opcional) — fecha o item "Portal do Bombeiro" do roadmap que faltava (dados, documentos, chave PIX).** Migração `0011` adiciona `chave_pix text` em `solicitacoes_cadastro` e `bombeiros`, sem constraint de formato — chave PIX pode ser CPF, e-mail, telefone ou UUID aleatório, formatos incompatíveis entre si, então não dá pra validar formato de verdade (só existência e tamanho máximo).

**64. Revisão de segurança (rigor extra por ser dado financeiro) achou 1 MEDIUM e 1 LOW, ambos corrigidos:** campo sem limite de tamanho (corrigido com `maxLength={140}` no HTML + checagem `chavePix.length > 140` nas duas Server Actions); e over-fetch de `chave_pix` via `select("*")` em `bombeiros` em `painel/page.tsx` e `eventos/[id]/page.tsx` — nenhum vazamento real pro navegador nos dois casos (dado ficava só em memória do servidor ou era reduzido antes de cruzar pro client), mas corrigido por disciplina, selecionando só as colunas realmente usadas em cada tela. RLS e logs de erro confirmados limpos (nenhum `console.error` inclui `chave_pix`).

## 2026-08-29 — Tela de Escala do Portal do Bombeiro + achado HIGH real na RLS

**65. "Visualização de escala confirmada e histórico" implementada em `/portal/escala`, lendo via RLS (não via service-role) — primeira tela do sistema em que o próprio bombeiro consulta dado diretamente, respeitando policy.** Duas policies novas (migração `0012`): `escalas_bombeiro_self_select` (bombeiro só lê a própria escala) e `eventos_bombeiro_self_select` (bombeiro só lê eventos em que tem escala).

**66. Revisão de segurança achou HIGH real: a policy de `eventos` inicial não filtrava por `status`, liberando a linha inteira do evento (inclusive `valor_fechamento` e `cliente_id`) pra qualquer status, não só Confirmado.** A tela filtrava por status só em JavaScript (`e.eventos?.status === "Confirmado"`) — isso protege a UI, mas não a API: como `getSessionSupabaseClient()` usa a anon key (pública, é uma PWA) com o token de sessão do próprio bombeiro, uma requisição direta ao PostgREST (fora da tela) veria o evento inteiro, inclusive em `Planejamento` — valor de fechamento é dado interno de precificação, não deveria estar acessível a um contratado antes (ou independente) da confirmação do evento. Corrigido movendo o filtro pra dentro da própria policy (`status in ('Confirmado','Concluído') and exists(...)`) — a válvula de segurança real é a RLS, não a tela.

**67. Achado MEDIUM junto: o filtro original (só `'Confirmado'`) faria o "Histórico" desaparecer no exato momento em que o staff marca o evento como `Concluído`** (`concluirEvento` transiciona `Confirmado → Concluído`) — o próprio propósito da seção "histórico" seria quebrado pelo ciclo de vida normal do evento. Corrigido incluindo `'Concluído'` na mesma condição da policy — uma vez confirmado, o bombeiro nunca perde a visibilidade dele, só o status muda.

## 2026-08-29 — Pendência de decisão do cliente: atualização de documento vencido pelo bombeiro

**68. Antes de construir "atualização de documentos vencidos pelo próprio bombeiro" (item da Fase 2), surgiu uma decisão de confiança que precisa ser validada com o cliente, não decidida unilateralmente:** quando o bombeiro informa que renovou um documento (ex.: nova data do ASO), isso deve valer na hora (self-service, mesmo nível de confiança de uma edição de perfil) ou precisa passar por aprovação da coordenação antes de valer (mesma lógica já usada no autocadastro inicial — nada em `bombeiros` muda sem revisão humana)? A segunda opção é consistente com o resto do sistema (nenhum dado de compliance entra sem revisão), mas exige uma segunda fila de aprovação (além da já existente em `/bombeiros/aprovacoes`); a primeira é mais rápida de construir e usar, mas remove a checagem humana que existe em todo o resto do fluxo de documentos.

**Decisão adiada a pedido do cliente — Gabriel vai levar essa pergunta pra call com o cliente.** Este item da Fase 2 fica pausado até a resposta chegar; o restante da Fase 2 (PWA instalável) não depende disso e segue.

## 2026-08-29 — PWA: checagem por HTTP confirma tudo que dá pra confirmar sem dispositivo real

**69. Tentativa de confirmar visualmente a instalação do PWA (item pendente desde a Fase C, item 26) esbarrou de novo na mesma lacuna já documentada — a extensão do navegador não alcança `localhost:3000` nem o túnel público a partir deste ambiente.** Não é regressão nem problema novo, é a mesma causa já registrada (sincronização da extensão com o ambiente onde os comandos rodam).

Confirmado por HTTP direto (`curl`), que é tudo que dá pra verificar sem um navegador de verdade: `/manifest.webmanifest` responde 200 com `content-type: application/manifest+json` e todos os campos obrigatórios (nome, ícone, `display: standalone`, `start_url`); `/sw.js` responde 200 com `Content-Type: application/javascript`; `/icon.svg` responde 200; `RegisterSW` está montado no layout do Portal (`src/app/portal/layout.tsx`) e só registra o service worker se `"serviceWorker" in navigator`. Todo critério de instalabilidade verificável sem dispositivo real está OK — falta só a confirmação visual (ícone de instalação aparecendo, tela adicionada), que fica pendente de teste do usuário num navegador/celular de verdade.

**Isso fecha, do lado do código, os 4 itens da Fase 2 — restam duas pendências externas ao código: PWA precisa de confirmação visual do usuário; atualização de documento vencido pelo bombeiro está pausada aguardando decisão do cliente (item 68).**

## 2026-08-29 — Fecha a Fase 2: atualização de documento vencido (com aprovação), decisão provisória do cliente

**70. Item 68 respondido (por ora — Gabriel confirma na call com o cliente): atualização de ASO/Credenciamento pelo bombeiro não vale na hora, precisa de aprovação da coordenação — mesma lógica do autocadastro inicial.** Construído com o mesmo padrão de "solicitação → aprovação" já usado em `solicitacoes_cadastro`: nova tabela `solicitacoes_documento` (migração `0013`), bombeiro pede em `/portal/documentos`, staff revisa numa nova seção de `/bombeiros/aprovacoes`. Cobre ASO e Credenciamento (os dois documentos com data de validade) — o pedido original citou só ASO, mas o mecanismo é idêntico para os dois e a Credenciamento também estava em "Em construção".

**71. Revisão de segurança (rigor extra: essa é a única gravação em `bombeiros.aso_data`/`credenciamento_data` fora do fluxo já revisado de aprovação de cadastro, e esses campos alimentam o bloqueio automático de escalação) achou 1 MEDIUM, corrigido:** a validação "data precisa ser no futuro" comparava strings (`dataNova <= hoje`), não datas de verdade — uma data sem zero à esquerda (ex.: `"2026-1-5"`) passava como "futura" por comparação lexicográfica. Corrigido com regex estrito (`/^\d{4}-\d{2}-\d{2}$/`) antes de comparar `Date` reais. Importante: mesmo sem essa correção, o bloqueio automático de escalação (`bombeiroAptidao()`) nunca dependia dessa validação — ele recalcula sempre a partir do valor real gravado em `bombeiros`, então o risco era só uma solicitação mal formatada enganar a coordenação na fila de revisão, não abrir brecha de segurança física.

**72. Confirmado sem achados: `bombeiro_id` nunca vem de campo de formulário (resolvido pela sessão), as duas actions de aprovação exigem `requireStaff()`, o mapeamento tipo→coluna do banco não aceita nome arbitrário, RLS impede um bombeiro ler pedido de outro, e o índice único parcial fecha a corrida de dois pedidos pendentes simultâneos (é constraint de banco, não checagem em código).**

## 2026-08-29 — Início da Fase 3 (Financeiro): custo/lucro por evento + contas a pagar/receber

**73. Primeiros dois itens da Fase 3 construídos juntos: "cálculo automático de custo/lucro por evento" e "contas a pagar (bombeiros) e a receber (cliente), controle de inadimplência".** `/financeiro` deixou de ser placeholder — lucro é calculado como `valor_fechamento - custo` (usando `custo_estimado` quando o staff já ajustou manualmente em `/eventos`, senão a soma dos titulares escalados, mesmo fallback já usado lá). `eventos_financeiro` (tabela que já existia desde o schema inicial, com RLS `eventos_financeiro_staff_all` desde a migração 0001, nunca usada por nenhuma tela até agora) passou a ser escrita via `upsert` — não ganha linha automática quando um evento é criado, nasce na primeira mudança de status. "Controle de inadimplência" fica como um status `Atrasado` marcado manualmente pelo staff (sem detecção automática de atraso por enquanto — não há campo de data de vencimento no sistema ainda pra calcular isso sozinho).

**74. Revisão de segurança sem achados.** Confirmado que as duas actions (pagamento a bombeiros / recebimento de cliente) escrevem só a própria coluna de status sem zerar a outra (upsert parcial), e que a ausência de checagem de concorrência otimista (diferente de `transicionarStatus` em Eventos) é intencional — são flags independentes, não uma máquina de estados sequencial.

**75. Restam 3 itens da Fase 3: emissão de nota fiscal/recibo, folha de pagamento por evento (pronta pra pagar via PIX) e relatórios de DRE.** Não construídos ainda — ficam pro próximo passo dentro da mesma fase.

## 2026-08-29 — Fase 3: folha de pagamento por evento (pronta pra PIX)

**76. Terceiro item da Fase 3: "folha de pagamento por evento — pronta para pagar (PIX)".** Nova página `/financeiro/[id]`, acessada clicando no nome do evento em `/financeiro` — lista os titulares escalados com nome, chave PIX e valor, soma o total, e avisa se algum bombeiro estiver sem chave PIX cadastrada (não dá pra pagar até isso ser preenchido). Só leitura, sem Server Action nova — reaproveita `chave_pix` (Fase 2) e `escalas.valor` (Fase 1) que já existiam. Mantém a decisão #3 do projeto (sistema nunca dispara pagamento sozinho — só prepara a lista pronta pra o financeiro executar manualmente). Revisão de segurança sem achados.

**77. Restam 2 itens da Fase 3: emissão de nota fiscal/recibo e relatórios de DRE.** DRE tem sobreposição real com a Fase 6 (Relatórios) — vale considerar se uma versão simples entra aqui ou se espera a Fase 6 dedicada.

## 2026-08-29 — DRE simples (por cliente e por período)

**78. Versão simples do item "relatórios de DRE por evento/cliente/período" — `/financeiro/dre`, agrupando por cliente e por mês.** "Por evento" já existia na própria tela `/financeiro`. Extraído `calcularLinhasFinanceiro()` (`financeiro/calculo.ts`) do que já estava em `page.tsx`, pra `/financeiro` e `/financeiro/dre` usarem exatamente o mesmo cálculo de custo/receita/lucro — evita as duas telas divergirem se a lógica de custo mudar depois. Não tem Server Action nova (só leitura, reaproveita a mesma consulta já revisada em segurança na tela Financeiro) — não abriu revisão de segurança dedicada por isso.

**79. Decisão do cliente (por ora, confirmar depois): DRE fica com essa versão simples agora; nota fiscal/recibo fica pro final, depois de fechar as Fases 4-6.** Isso fecha 5 dos 5 itens de Financeiro que fazem sentido construir nesse estágio — só falta nota fiscal/recibo, que tem escopo próprio (geração de documento) mais adequado pra revisitar mais perto da entrega.

## 2026-08-29/30 — Início da Fase 4 (Comunicação): notificação in-app/e-mail + job diário

**80. WhatsApp Business API segue travado — decisão de provedor (Meta Cloud API, Z-API ou Twilio) ainda não veio do cliente (já era um risco mapeado desde o planejamento).** Construído o resto da Fase 4 com uma camada de adaptador pro WhatsApp (`src/lib/whatsapp/enviar.ts`) — hoje só loga e retorna `ok:false`; quando o provedor for escolhido, é só trocar o corpo dessa função, nada mais no sistema precisa mudar.

**81. Notificação in-app + e-mail + job diário de verificação de vencimento implementados juntos.** Nova tabela `notificacoes` (migração `0014`) — bombeiro vê no Portal (`/portal`) documentos vencendo/vencidos, com "marcar como lida". E-mail via Resend (`src/lib/email/enviar.ts`) — precisa de `RESEND_API_KEY` própria (diferente do SMTP do Supabase Auth, que só cobre e-mail de autenticação como o convite); sem essa variável, a notificação in-app continua funcionando, só o e-mail não sai. Job em `POST /api/jobs/verificar-vencimentos` — não é Server Action nem página, é a primeira rota HTTP pública do sistema (pensada pra ser chamada por um agendador externo, provedor de hospedagem ainda não escolhido), protegida por `CRON_SECRET`.

**82. Revisão de segurança (rigor extra: primeiro endpoint com modelo de ameaça diferente — HTTP público, não sessão autenticada) achou 1 HIGH e 1 MEDIUM, os dois corrigidos:**
- HIGH: nenhum limite de tentativas no endpoint — um segredo longo dificulta força bruta, mas nada impedia tentar milhares de vezes. Corrigido com bloqueio em memória por IP (5 tentativas falhas / 5 minutos) — documentado como paliativo de instância única, não substitui a solução de produção real (allowlist de IP do provedor de cron, ou rate limit no nível do host).
- MEDIUM: a comparação do segredo (`auth !== ...`) não era resistente a timing attack. Corrigido com `crypto.timingSafeEqual`.

Confirmado sem achados: fail-closed quando `CRON_SECRET` não está configurado; a resposta do endpoint só devolve contadores agregados, nunca dado de bombeiro; `marcarNotificacaoLida` não tem oráculo de existência (um `notificacao_id` de outro bombeiro simplesmente não casa nenhuma linha, sem diferença observável); RLS de `notificacoes` seguindo o mesmo padrão `NULL`-safe já validado em `escalas`/`solicitacoes_documento`; nenhum CPF/chave PIX passa pelos envios de e-mail/WhatsApp.

**83. Achado LOW não corrigido (documentado, não bloqueante): `listUsers({perPage:1000})` sem paginação — se o projeto Supabase Auth (não só bombeiros) passar de 1000 usuários, quem ficar fora da primeira página deixa de receber e-mail (a notificação in-app continua funcionando normalmente).** Revisitar quando o quadro crescer.

## 2026-08-30 — Achado real comparando com a planilha da Brigada Camarão: custo/lucro não incluía alimentação

**84. Cliente apontou as planilhas modelo já existentes no projeto (`Modelo Planilhas/`) — comparação revelou que o cálculo de custo/lucro construído na Fase 3 estava incompleto.** A planilha financeira real da Brigada Camarão soma **Valor Pago aos Bombeiros + Alimentação** pra chegar no "Total de Custo"; o sistema só considerava o valor pago aos bombeiros, apesar de já existir um preço de alimentação configurável em `/precos` desde a Fase 1 — só nunca tinha sido ligado ao cálculo. Corrigido em `financeiro/calculo.ts` (agora usado por `/financeiro`, `/financeiro/dre` e também pelo pré-preenchimento do campo "Custo do evento" em `/eventos`, extraído o helper `buscarPrecoAlimentacao()` em `src/lib/precos.ts` pra evitar as 3 telas divergirem). Custo automático agora é `soma(titulares) + qtd_diárias × alimentacao_dia`; o campo `custo_estimado` continua funcionando como estava — quando o staff ajusta manualmente, esse valor tem prioridade total sobre o cálculo automático (ele já é considerado o custo final completo).

**85. As três planilhas modelo também confirmam o desenho de dados já construído está certo:** cadastro de bombeiros bate campo a campo com `bombeiros` (Nome/CPF/Função/ASO/E-Social/Credenciamento); a estrutura de eventos (cabeçalho + tabela de escala com Data/Horário/Nome/CPF/Remuneração) bate com `eventos`+`escalas`, faltando só um campo "Responsável" por evento que o sistema ainda não rastreia. Isso destrava a migração de planilhas (Fase 5) com confiança — o layout de origem já é conhecido, não é mais um item bloqueado por falta de informação.

## 2026-08-30 — Fase 5: importação de Bombeiros via CSV (primeiro upload de arquivo do sistema)

**86. "Migração de planilhas" (Fase 5) destravada: construída importação de Bombeiros via CSV em `/bombeiros/importar`, com modelo próprio (`public/modelo-importacao-bombeiros.csv`) em vez de tentar ler o cabeçalho de duas linhas mescladas da planilha original (não exporta bem pra CSV).** Validação linha a linha, sem derrubar o arquivo inteiro por uma linha ruim; CPF já cadastrado é pulado (não erro) — permite reenviar o mesmo arquivo depois de corrigir só o que falhou. Datas aceitas em DD/MM/AAAA (formato que a coordenação já usa), convertidas via novo helper `dataBrParaIso()` (testado). Biblioteca `papaparse` adicionada — primeira dependência de parsing do projeto.

**87. Revisão de segurança (rigor extra: primeiro upload de arquivo do sistema inteiro) achou 3 MEDIUM e 1 LOW, todos corrigidos:**
- MEDIUM: o limite de 2MB da aplicação era maior que o limite padrão do Next.js pra corpo de Server Action (1MB, não configurado em `next.config.ts`) — um CSV entre 1-2MB seria rejeitado pelo framework com erro genérico antes da Server Action nem rodar. Corrigido com `experimental.serverActions.bodySizeLimit: "2mb"`.
- MEDIUM: risco real de CSV/Formula Injection (OWASP) — um `nome` importado começando com `=`, `+`, `-` ou `@` seria executado como fórmula se esse dado um dia for exportado de volta pra CSV/Excel (candidato natural: a folha de pagamento em `/financeiro/[id]`, que já mostra nome de bombeiro). Corrigido rejeitando essas linhas na validação (nome de pessoa real nunca começa com esses caracteres) — mais correto que sanitizar e gravar um valor alterado num campo que é registro de identidade real.
- MEDIUM: insert em lote único, tudo-ou-nada — se um CPF colidisse por uma corrida rara entre duas importações simultâneas, o arquivo inteiro falhava junto, contradizendo o propósito declarado da tela ("reenviar só o que deu erro"). Corrigido com inserção em lotes de 200 + fallback linha a linha só quando um lote falha (isola exatamente qual CPF colidiu, sem pagar o custo de 1 query por bombeiro no caminho comum sem conflito).
- LOW: erro bruto do Postgres (que inclui o CPF em texto) exposto na tela em caso de conflito — corrigido junto com o item acima, agora usa mensagem amigável sem vazar o valor.

**88. Achado MEDIUM aceito sem correção (decisão consciente, documentada): a importação em massa aceita ASO/E-Social/Credenciamento em branco, diferente do cadastro manual (`criarBombeiro`), que exige os três.** Intencional — dado legado de planilha real frequentemente tem campos incompletos, e travar a importação inteira por isso derrotaria o propósito da migração. O bombeiro entra no sistema mesmo com pendência de documento (aparece corretamente como "Impedido"/documentação vencida nas telas que já calculam isso).

## 2026-08-30 — Fase 5: exportação CSV (ERP + folha de pagamento) + achado HIGH real de injeção de fórmula

**89. Últimos dois itens da Fase 5 construídos como adaptadores CSV genéricos** (decisão do cliente: CSV resolve, não vale o esforço de gerar .xlsx/.pdf de verdade agora). `GET /api/export/financeiro` — CSV de todos os eventos (receita/custo/lucro/status), serve tanto de exportação pro contador quanto de "adaptador ERP" temporário. `GET /api/export/folha-pagamento/[id]` — CSV por evento (bombeiro, CPF, chave PIX, valor), pronto pra upload em lote no internet banking. Ambos com botão "Exportar CSV" nas telas correspondentes.

**90. Revisão de segurança achou HIGH real: a validação contra CSV/Formula Injection só existia no import de CSV (item 87), não nos outros formulários que alimentam os mesmos campos agora exportáveis — inclusive `enviarDadosCadastro`, o autocadastro do próprio candidato a bombeiro, o ponto de menor confiança do sistema inteiro.** Um `chave_pix` começando com `=HYPERLINK(...)` digitado por um candidato (só precisa ter recebido convite por e-mail, papel de confiança bem menor que staff) seria copiado sem alteração pra `bombeiros.chave_pix` na aprovação, e sairia direto na coluna adjacente ao CPF no CSV de folha de pagamento — abrindo esse arquivo no Excel executaria a fórmula.

Corrigido em duas camadas:
- **Entrada**: extraído `comecaComCaractereFormula()` (`src/lib/validation/csv-seguro.ts`, testado) do que antes só existia isolado no import de CSV — agora aplicado também em `criarEvento` (nome), `criarCliente` (nome), `criarBombeiro` (nome + chave PIX) e, principalmente, `enviarDadosCadastro` (nome + chave PIX). Rejeita a linha na validação, não altera o valor silenciosamente — é campo de identidade/pagamento real, não texto arbitrário pra sanitizar sem avisar.
- **Saída**: `escaparParaCsv()` (mesmo módulo) aplicado nos dois CSVs de exportação — defesa em profundidade pra qualquer dado que já estava gravado no banco antes desta correção existir, prefixando com apóstrofo se começar com caractere de fórmula.

**91. Achado MEDIUM junto, corrigido: as duas rotas de export não tinham `Cache-Control`, deixando em aberto a possibilidade de navegador/proxy guardar em cache um CSV com CPF e chave PIX (dado financeiro sensível) sem essa diretiva.** Adicionado `Cache-Control: no-store, private` nas duas respostas.

## 2026-08-30 — Fase 6: dashboard em tempo real + comparativo por trimestre/ano

**92. Painel (`/painel`) ganhou Faturamento e Lucro do Mês com variação percentual vs. mês anterior, e lista de próximos eventos confirmados — antes só tinha totais acumulados sem nenhuma noção de tempo.** Reaproveita `calcularLinhasFinanceiro()` (Fase 3/5), então o lucro mostrado aqui já vem com alimentação incluída no custo, igual ao Financeiro/DRE — sem essa reutilização, dava pra fácil os números do Painel e do Financeiro divergirem entre si.

**93. DRE ganhou agrupamento por trimestre e por ano, além de mês (que já existia) — fecha o item "comparativos por período (mês/trimestre/ano)" do roadmap.** De passagem, corrigido um bug real de ordenação que já existia: o agrupamento por mês usava o texto "Ago/2026" como chave de ordenação, o que ordena alfabeticamente (Abr, Ago, Dez, Fev...) e não cronologicamente. Corrigido separando chave de ordenação (`"2026-08"`, ordenável como string) do rótulo exibido (`"Ago/2026"`).

**94. "Exportação de relatórios" (terceiro item da Fase 6) já estava coberto pelos exports CSV construídos na Fase 5** (financeiro completo e folha de pagamento por evento) — decisão do cliente de usar CSV em vez de .xlsx/.pdf de verdade se aplica aqui também, mesma lógica.

Nenhuma revisão de segurança dedicada nesta rodada — são só leituras (Painel e DRE), reaproveitando consultas e o cálculo de custo/lucro já revisados em rodadas anteriores, sem Server Action nem escrita nova.

## 2026-08-30 — Início da Fase 7 (itens desejáveis): disponibilidade do bombeiro

**95. Primeiro item da Fase 7, seguindo a ordem do roadmap: "registro de disponibilidade do bombeiro (dias/horários/regiões)".** Implementado em `/portal/meus-dados` (seção nova, dentro da tela que já existia como placeholder) — dia da semana + turno (reaproveita o enum já usado em escalas, não horário livre) + região (texto opcional). Ainda não conectado a nada — os próximos itens da mesma fase (candidatura a evento, sugestão automática de escala) são quem vai consumir esse dado.

**96. Revisão de segurança achou 1 MEDIUM real: a tabela não tinha nenhuma proteção contra duplicata/acúmulo, ao contrário do padrão já estabelecido em `solicitacoes_documento` e `notificacoes` (que têm índice único equivalente).** Corrigido com índice único (`bombeiro_id, dia_semana, turno, coalesce(regiao,'')`) + teto de 50 linhas por bombeiro verificado na Server Action antes do insert, tratando o conflito de duplicata com mensagem amigável em vez de erro genérico. Achado LOW junto (região sem limite de tamanho) também corrigido (80 caracteres) — notado na revisão que é um gap que também existe em outros campos de texto livre do sistema (nome de evento/cliente/bombeiro), não introduzido por esta feature, mas não replicado aqui pelo menos.

## 2026-08-30 — Fase 7, segundo item: candidatura do bombeiro a evento em aberto

**97. Segundo item do roadmap: "bombeiro visualiza e se candidata a eventos em aberto".** Candidatura foi desenhada como manifestação de interesse, não como escalação automática: bombeiro vê (em `/portal/escala`) eventos Confirmado com vaga de titular ainda aberta e clica "Candidatar-se"; staff vê essas candidaturas na própria tela do evento (`/eventos/[id]`) e "Aceita" (só sinaliza — não carrega data/turno específicos, já que a candidatura é ao evento como um todo) ou "Recusa". Escalar de fato continua sendo o formulário "Escalar bombeiro" já existente, que já reaplica o bloqueio de documentação vencida.

**98. Achado de arquitetura durante a implementação, corrigido antes de qualquer revisão externa: a policy de RLS que libera "eventos com vaga aberta" pro bombeiro não podia ser uma subquery comum em `escalas`.** Motivo: RLS se aplica em cascata — mesmo dentro do `using` da policy de outra tabela, uma subquery em `escalas` ainda sofre a RLS de `escalas` (que restringe a `bombeiro_id = bombeiro_id_da_sessao()`, migração 0012), então a contagem de titulares ficaria sempre 0 ou 1 (só a própria linha do bombeiro), nunca o total real do evento. Resolvido com uma function `security definer` (`contagem_titulares_evento`) que ignora a RLS de propósito, mas expõe só o número agregado — nunca as linhas de `escalas` de outros bombeiros.

**99. Revisão de segurança (security-reviewer) achou 1 MEDIUM real: a function `security definer` não tinha `revoke`/`grant` explícito, e o Postgres concede `EXECUTE` a `PUBLIC` por padrão em toda function nova.** Como o PostgREST expõe qualquer function do schema `public` como endpoint RPC pra qualquer role com `EXECUTE` — inclusive `anon`, ou seja, sem sessão nenhuma —, isso permitiria chamar `contagem_titulares_evento(uuid)` direto pra qualquer `evento_id` já conhecido/adivinhado (inclusive um evento em Planejamento, que a RLS normal de `eventos` bloqueia por completo), lendo a contagem de titulares por fora da RLS que a própria function foi desenhada pra respeitar. Severidade limitada pelo UUID não ser enumerável e pelo vazamento ser só um inteiro agregado (nunca nome, data ou valor). Corrigido replicando o mesmo padrão já usado em `bombeiro_disponivel_para_cadastro` (migração 0002): `revoke all ... from public` + `grant execute ... to authenticated` (não `anon`, já que a function só serve pra apoiar a policy de bombeiro logado).

## 2026-08-31 — Achado real testando: "Aceitar" candidatura parecia não fazer nada

**100. Cliente testou o fluxo de ponta a ponta pelo celular e achou que tinha achado um bug: aceitou a candidatura de um bombeiro e a escala continuou vazia.** Não era bug de dado — era decisão de design (candidatura não carrega data/turno, então "Aceitar" só muda o status, nunca escala sozinho) mal comunicada na tela: só um texto pequeno avisava, fácil de não notar. Primeira correção foi um aviso + pré-seleção pontual do bombeiro no formulário logo após aceitar — o cliente pediu algo melhor: **uma lista persistente**, não um aviso que some.

**101. Redesenhado como seção "Pré-escalados" em `/eventos/[id]`: toda candidatura com status 'aceita' cujo bombeiro ainda não tem nenhuma linha em `escalas` para aquele evento aparece numerada, em ordem de quem aceitou primeiro (`revisado_em` ascendente — é a "prioridade de aceitação" pedida).** Cada linha tem um botão "Escalar" que só troca a query string (`?escalar=<bombeiro_id>`) pra pré-selecionar aquele bombeiro no formulário "Escalar bombeiro" já existente — sem duplicar a lógica de escrita da escala. A linha some da lista sozinha assim que o bombeiro é de fato escalado (comparando com os `bombeiro_id` já presentes em `escalas`), então a lista reflete sempre o que falta fazer, não um histórico que só cresce.

## 2026-08-31 — CRUD de evento: editar e excluir

**102. Pedido do cliente depois de testar o fluxo de ponta a ponta: precisava conseguir editar ou excluir um evento (inclusive os de teste criados durante a validação) sem recorrer a SQL direto.** Editar reaproveita a mesma validação de criarEvento, extraída pra `eventos/validacao.ts` (primeira vez que a mesma checagem passou a ser usada em dois lugares — critério de "extrair quando a repetição é real", não especulativa). Excluir tem uma trava: cascateia pra `escalas`, `candidaturas` e `eventos_financeiro` (FKs `on delete cascade`), então bloqueia se já existe pagamento a bombeiro ou recebimento de cliente registrado — não deixa apagar rastro financeiro já fechado.

**103. Revisão de segurança achou 1 HIGH real: o bloqueio de exclusão, do jeito que foi escrito primeiro (checar `eventos_financeiro` e só depois apagar, em duas idas ao banco separadas), tinha dois problemas — um TOCTOU (corrida entre checagem e exclusão) e, mais grave, o próprio bloqueio era burlável sem corrida nenhuma: bastava reverter o status de pago/recebido pra 'Pendente' em `/financeiro` (ação já permitida a qualquer staff, sem trilha nenhuma) e excluir logo em seguida.** Corrigido com uma function no banco (`excluir_evento_se_permitido`, migração 0017) que faz checagem + `DELETE` no mesmo statement — atômico por natureza, fecha o TOCTOU — e soma uma segunda camada de evidência mais difícil de reverter com um clique: bloqueia também se qualquer turno do evento já tem `horario_cumprido` preenchido (prova de trabalho de verdade realizado). Não é uma trilha de auditoria completa — reverter o status financeiro e limpar pontos registrados via SQL direto ainda contornaria — mas fecha o caminho de um clique que a revisão encontrou. Risco residual aceito conscientemente por ora; construir auditoria completa de mudança de status financeiro fica pra quando (se) isso importar de verdade.

**104. Achado secundário na mesma revisão, também real: ao criar a function `security definer`-like no banco, era preciso lembrar do `revoke`/`grant` (mesmo padrão da migração 0016) — sem isso, `EXECUTE` fica liberado pra `PUBLIC` por padrão, e essa function em especial não faz checagem nenhuma de "é staff?" (isso só acontece na Server Action que a chama). Sem o revoke/grant, qualquer requisição com a anon key pública do navegador conseguiria apagar um evento via `.rpc()` direto, pulando `requireStaff()` por completo.** Corrigido restringindo `EXECUTE` só a `service_role`.

**105. Achado MEDIUM real, mais sutil: o `<select>` de cliente na tela de editar não tinha uma `<option value="">` explícita.** Se o cliente original de um evento foi apagado (a FK tem `on delete set null`, então `cliente_id` pode legitimamente virar `null`), o navegador seleciona silenciosamente o primeiro cliente da lista (ordem alfabética) — e como o campo é `required`, isso passava despercebido pela validação: o staff podia salvar o evento reatribuído pro cliente errado sem perceber. Corrigido com uma opção "Selecione um cliente" desabilitada quando `cliente_id` é null.

## 2026-08-31 — Fase 7, terceiro item: sugestão automática de escala por disponibilidade/proximidade

**106. Implementado dentro do próprio formulário "Escalar bombeiro" (não uma tela separada): conforme o staff escolhe data e turno, aparece uma lista de "Sugeridos pra esse dia/turno" — bombeiros aptos com disponibilidade cadastrada (Meus Dados → Disponibilidade) pro mesmo dia da semana + turno, clicáveis pra pré-selecionar no campo Bombeiro.** Todo client-side (sem round-trip ao servidor a cada mudança de data/turno) — a página já traz todas as disponibilidades dos bombeiros aptos de uma vez (tabela pequena, uso interno) e o formulário filtra na hora.

**107. "Proximidade" é uma aproximação deliberada, não geolocalização real: o sistema não tem endereço geocodificado de bombeiro nem do evento.** Usa a região (texto livre já cadastrado em disponibilidade, ex.: "Zona Sul") contida no local do evento — ou o contrário — como sinal de perto/longe, e prioriza esses na ordenação (marcados com "· região"). Se/quando o sistema ganhar endereço estruturado e geocodificação, isso pode evoluir pra distância real — documentado aqui pra não fingir uma precisão que não existe hoje.

## 2026-08-31 — Achando a resposta bruta real do PRD: reauditoria dos itens essenciais + 3 gaps fechados de uma vez

**108. Cliente localizou o arquivo com as respostas brutas do formulário (`Docs/brigada-camarao-escopo-respondido-2026-08-26.txt`, preenchido por Livia, Auxiliar Administrativo) — diferente do `arquitetura-sistema.html`, que era só a minha categorização derivada.** Reauditei os 40 itens marcados "[Essencial]" um a um contra o código. Achado mais sério: **"Anexo/upload de documentos (ASO, credenciamento, cursos)" nunca foi implementado** — o sistema sempre rastreou só a DATA de validade, nunca o arquivo em si (nenhum uso de Supabase Storage existia no projeto inteiro até este momento). Outros gaps confirmados: log de auditoria (também nunca construído), confirmação de escala via WhatsApp/app, alertas de escala incompleta/pagamento atrasado (só documento vencendo tinha alerta), controle de inadimplência automático (só flag manual), nota fiscal/recibo (adiado por decisão já registrada do cliente).

**109. Fechados nesta rodada os dois gaps mais sérios que não dependiam de decisão externa nenhuma (upload de documento + log de auditoria), mais o alerta de escala incompleta/pagamento atrasado (decisão do cliente: aparecem no Painel com link direto, não por WhatsApp/e-mail).**

- **Upload de documento** (migração `0018`): bucket privado `documentos-bombeiros` no Storage + tabela `bombeiro_documentos`. Bombeiro anexa pelo Portal (`/portal/documentos`), staff anexa em nome de alguém pela tela de Bombeiros (linha expansível, mesmo padrão já usado em Eventos). Acesso só por `/api/documentos/{id}` — nunca expõe o caminho real do Storage nem uma URL de longa duração; gera uma signed URL nova (60s) a cada clique, força download (`Content-Disposition: attachment`) em vez de exibição inline. Validação em duas camadas: Content-Type declarado E os bytes reais do arquivo (magic number) — achado de revisão de segurança corrigido antes de fechar (um Content-Type forjado no multipart não bastava sozinho).

- **Log de auditoria** (migração `0019`): tabela `auditoria_logs` (quem, o quê, quando, antes/depois), só leitura por staff, escrita append-only via helper `registrarAuditoria()`. Instrumentado nos caminhos de escrita mais críticos — bombeiro (criar), evento (criar/editar/excluir/mudança de status), aprovações (cadastro, documento, candidatura), mudança de status financeiro, upload de documento — **não é literalmente toda escrita do sistema** (escalas/disponibilidade ficaram de fora nesta rodada, por escopo). Tela nova `/auditoria`, só staff.

- **Alertas no Painel**: nova seção "Alertas pendentes" com link direto pra cada item — documento vencendo/vencido (→ Bombeiros), escala incompleta em evento Confirmado (→ ficha do evento), pagamento/recebimento atrasado (→ Financeiro do evento). Só leitura, sem Server Action nova.

**110. Revisão de segurança achou 1 MEDIUM real e corrigido: `/auditoria` tinha `requireStaff()` na própria página (defesa em profundidade, correta), mas ficou de fora do `matcher` do proxy e de `ROTAS_POR_PAPEL` — exatamente a mesma classe de esquecimento que já causou o CRITICAL real de `/clientes`/`/precos` sem proteção nenhuma (2026-08-29).** Não era explorável desta vez (a página em si já bloqueava), mas corrigido mesmo assim: adicionado ao matcher e à lista de rotas por papel. Achado MEDIUM adicional (validação de upload só por Content-Type declarado, sem checar os bytes reais) também corrigido, descrito acima.

## 2026-08-31 — Folha de pagamento ganha check por turno, com status automático

**111. Pedido do cliente: check por linha na folha de pagamento (`/financeiro/[id]`) — quando todo titular do evento estiver marcado, `eventos_financeiro.pago_bombeiros_status` vira "Pago" sozinho.** Granularidade é a escala (`escalas.pago`, migração 0020), não o bombeiro agregado — o mesmo bombeiro pode ter mais de uma escala no evento, cada uma marcada independente, batendo com a própria granularidade da tela. Desmarcar depois de já estar "Pago" volta pra "Pendente" (a alegação deixou de ser verdade); não mexe num "Atrasado" definido manualmente, exceto pra promovê-lo a "Pago" quando os checks realmente completam.

**112. Revisão de segurança achou 1 MEDIUM real: a primeira versão recalculava o status em três idas separadas ao banco (ler escalas, ler status atual, decidir, escrever) — TOCTOU real contra uma mudança manual concorrente de status feita em `/financeiro` ao mesmo tempo, podendo sobrescrever silenciosamente.** Corrigido com o mesmo padrão já usado em `excluir_evento_se_permitido` (migração 0017): uma function no banco (`recalcular_status_pagamento_evento`, migração 0020) que faz leitura+decisão+escrita atomicamente, com `for update` travando a linha de `eventos_financeiro` — qualquer escritor concorrente daquela linha (inclusive o upsert comum de `/financeiro`) espera essa function terminar antes de agir. Mesmo achado secundário de sempre: `revoke`/`grant` restringindo `EXECUTE` só a `service_role`, porque essa function não checa "é staff?" sozinha.

## 2026-08-31 — Achado real testando: dropdown de status financeiro "voltava sozinho" depois de mudar

**113. Cliente testou e achou um bug de verdade: mudou "Recebido do Cliente" pra "Recebido" na tela `/financeiro`, a cor mudou (confirmando que salvou) mas o `<select>` voltou a mostrar "Pendente" visualmente.** Causa: os `<select>`/`<input>` com auto-submit (`onChange`/`onBlur` + `requestSubmit()`) usados nessa tela e em outras (Financeiro, Preços, custo do evento em Eventos, check de pago na folha) usam `defaultValue`/`defaultChecked` — React só aplica esse valor na montagem inicial do elemento; não sincroniza sozinho quando o dado do servidor muda depois de um `revalidatePath`. O dado no banco estava correto o tempo todo — só a exibição ficava dessincronizada.

**114. Corrigido com `key={valorAtual}` em todo elemento que segue esse padrão (força o React a remontar o elemento — e reaplicar defaultValue/defaultChecked corretamente — sempre que o valor confirmado pelo servidor muda): `FinanceiroTabela.tsx` (as 2 selects), `MarcarPagoCheckbox.tsx` (achado antes de alguém reportar, mesma classe de bug num componente escrito nesta mesma sessão), `PrecosTabela.tsx` e `EventosTabela.tsx` (custo do evento).** Mesma técnica já usada antes em `AdicionarEscalaForm.tsx` pro bombeiro pré-selecionado — passou a ser o padrão consolidado do projeto pra esse tipo de campo.

## 2026-08-31 — Mais 2 gaps essenciais fechados, nenhum dependendo do cliente

**115. "Confirmação de escala pelo bombeiro via WhatsApp/app" — construída a parte "app" (Portal), sem depender do provedor de WhatsApp ainda não escolhido pelo cliente.** Nova coluna `escalas.status_confirmacao` (migração 0021) — já estava prevista desde o TODO original da migração 0001, nunca tinha sido criada. Bombeiro vê um botão "Confirmar presença" em `/portal/escala` (só nas escalas futuras); staff vê o status (Confirmado/Pendente) na ficha do evento.

**116. "Múltiplas hierarquias/funções" — a lista de funções, que era fixa no código E travada por um CHECK direto no banco (`bombeiros_funcao_check`, `schema.sql`), virou uma tabela (`funcoes_bombeiro`) administrável pelo staff em `/bombeiros/funcoes` — mesma régua já usada pra preços.** O CHECK fixo foi trocado por uma foreign key pra essa tabela — continua impossível gravar uma função que não existe na lista, só que agora a lista cresce sem precisar de deploy. Desativar uma função só tira ela da lista oferecida pra cadastro novo (nunca apaga a linha, porque bombeiros existentes referenciam ela via FK). Atualizados os 3 pontos que validavam contra o array fixo: cadastro manual, import de CSV e autocadastro do candidato a bombeiro (o de menor confiança do sistema — reforçado com a mesma validação).

**117. Revisão de segurança sem achados de severidade real** (todos os 5 pontos verificados vieram "seguro" — escopo duplo por bombeiro_id em `confirmarEscala`, RLS de `funcoes_bombeiro` coerente com o padrão já estabelecido de "RLS é a segunda camada, autorização real é em JS", FK como backstop de banco, proteção contra formula injection reaproveitada, `requireStaff()` presente nas duas novas actions). Único ponto anotado pra acompanhar: nenhuma Server Action do projeto tem teste de integração ainda (lacuna pré-existente, não introduzida agora) — vale como item de dívida técnica se algum dia a cobertura de teste virar prioridade.

## 2026-08-31 — Achado real testando: Painel não atualizava depois de mudanças em Eventos/Financeiro

**118. Cliente reportou: marcou um evento como Concluído e o valor não refletiu no Painel (Faturamento, Lucro, Eventos Confirmados).** Causa raiz: cada Server Action só revalidava a própria tela de origem — `transicionarStatus` (aprovar orçamento / concluir evento) só chamava `revalidatePath("/eventos")`, nunca `/painel`, `/financeiro` nem `/financeiro/dre`, apesar dessas três telas dependerem exatamente dos mesmos dados (`eventos`, `escalas`, `eventos_financeiro`). O mesmo buraco existia em `adicionarEscala`/`removerEscala` (não revalidavam nem `/eventos`, a própria lista, nem as telas financeiras) e em `atualizarStatusPagamentoBombeiros`/`atualizarStatusRecebimentoCliente`/`marcarEscalaPaga` (não revalidavam `/painel`, de onde vem o alerta de "atrasado").

**119. Corrigido com um helper único (`src/lib/revalidar-financeiro.ts`) chamado em toda escrita que altera status/valor/escala de evento** — em vez de replicar a mesma lista de `revalidatePath` em cada arquivo, centraliza pra não repetir esse mesmo esquecimento numa próxima Server Action nova. Aplicado em: `criarEvento`, `transicionarStatus`, `atualizarCustoEvento` (eventos/actions.ts); `adicionarEscala`, `removerEscala`, `editarEvento`, `excluirEvento` (eventos/[id]/actions.ts); `atualizarStatusPagamentoBombeiros`, `atualizarStatusRecebimentoCliente` (financeiro/actions.ts); `marcarEscalaPaga` (financeiro/[id]/actions.ts).

**120. Nota pra não confundir com "ainda não corrigiu" ao testar de novo: o evento de teste usado (valor R$ 4.999,95) está datado 01/09/2026, e "Faturamento do Mês"/"Lucro do Mês" somam pela data do evento dentro do mês corrente — hoje (31/08/2026), esse evento ainda pertence a setembro, não agosto.** Isso é intencional (mês de faturamento = mês em que o evento acontece, não em que foi cadastrado ou concluído) — o valor vai aparecer certinho no Painel a partir de 1º de setembro, sem precisar de nenhuma ação nova. O que estava genuinamente quebrado (e agora corrigido) era a contagem de "Eventos Confirmados", que não tem filtro de data nenhum e devia ter atualizado na hora.

## Como usar este arquivo

Toda vez que uma decisão de arquitetura, segurança, escopo ou trade-off técnico for tomada durante a construção — inclusive as pequenas, tipo "por que essa tabela e não aquela" — ela entra aqui, com data, antes de seguir para a próxima fase. Na entrega, este arquivo vira a pauta da conversa de repasse técnico com o cliente.
