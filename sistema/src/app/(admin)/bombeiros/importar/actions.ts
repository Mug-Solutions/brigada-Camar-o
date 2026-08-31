"use server";

import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { cpfTemFormatoValido } from "@/lib/validation/documento";
import { dataBrParaIso } from "@/lib/validation/data";
import { comecaComCaractereFormula } from "@/lib/validation/csv-seguro";

const TAMANHO_MAXIMO_ARQUIVO = 2 * 1024 * 1024; // 2 MB — folga grande pra um CSV de algumas centenas de linhas.
const TAMANHO_LOTE = 200;

export type ImportarBombeirosState = {
  error: string | null;
  resultado: { importados: number; pulados: number; erros: { linha: number; motivo: string }[] } | null;
};

interface LinhaCsv {
  Nome?: string;
  CPF?: string;
  Função?: string;
  "Data ASO"?: string;
  "Matrícula E-Social"?: string;
  "Status E-Social"?: string;
  "Data Credenciamento"?: string;
}

interface LinhaValida {
  linha: number;
  nome: string;
  cpf: string;
  funcao: string;
  aso_data: string | null;
  esocial_matricula: string;
  esocial_status: "Ativo" | "Inativo";
  credenciamento_data: string | null;
}

/**
 * Migração de planilhas (Fase 5): admin sobe um CSV no formato de
 * public/modelo-importacao-bombeiros.csv. Cada linha é validada
 * individualmente — uma linha com erro não derruba as outras. CPF já
 * cadastrado é pulado (não é erro), pra permitir reenviar o mesmo
 * arquivo depois de corrigir só as linhas problemáticas sem duplicar
 * quem já entrou.
 */
export async function importarBombeiros(
  _prevState: ImportarBombeirosState,
  formData: FormData
): Promise<ImportarBombeirosState> {
  const acesso = await requireStaff();
  if (!acesso.ok) return { error: acesso.error, resultado: null };

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { error: "Selecione um arquivo CSV.", resultado: null };
  }
  if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) {
    return { error: "Arquivo grande demais (máximo 2 MB).", resultado: null };
  }

  const texto = await arquivo.text();
  const parsed = Papa.parse<LinhaCsv>(texto, { header: true, skipEmptyLines: true });
  if (parsed.data.length === 0) {
    return { error: "Arquivo vazio ou sem linhas reconhecidas.", resultado: null };
  }

  const supabase = createServerSupabaseClient();
  const { data: existentes } = await supabase.from("bombeiros").select("cpf");
  const cpfsExistentes = new Set((existentes ?? []).map((b) => b.cpf));

  // Contra a lista configurável (funcoes_bombeiro, migração 0021), não
  // mais o array fixo — dado legado de planilha real pode citar uma
  // função que ainda não existe cadastrada; a mensagem de erro já
  // orienta a cadastrar em /bombeiros/funcoes antes de reenviar.
  const { data: funcoesData } = await supabase.from("funcoes_bombeiro").select("nome").eq("ativo", true);
  const funcoesValidas = new Set((funcoesData ?? []).map((f) => f.nome as string));

  const paraInserir: LinhaValida[] = [];
  const erros: { linha: number; motivo: string }[] = [];
  let pulados = 0;
  const cpfsNesteArquivo = new Set<string>();

  parsed.data.forEach((linha, indice) => {
    const numeroLinha = indice + 2; // +1 (base 0 -> 1) +1 (linha de cabeçalho)
    const nome = (linha.Nome ?? "").trim();
    const cpf = (linha.CPF ?? "").trim();
    const funcao = (linha["Função"] ?? "").trim();
    const asoDataBr = (linha["Data ASO"] ?? "").trim();
    const esocialMatricula = (linha["Matrícula E-Social"] ?? "").trim();
    const esocialStatus = (linha["Status E-Social"] ?? "").trim();
    const credenciamentoDataBr = (linha["Data Credenciamento"] ?? "").trim();

    if (!nome || !cpf) {
      erros.push({ linha: numeroLinha, motivo: "Nome e CPF são obrigatórios." });
      return;
    }
    if (comecaComCaractereFormula(nome)) {
      erros.push({ linha: numeroLinha, motivo: "Nome começa com caractere não permitido (=, +, -, @)." });
      return;
    }
    if (!cpfTemFormatoValido(cpf)) {
      erros.push({ linha: numeroLinha, motivo: "CPF inválido." });
      return;
    }
    if (cpfsExistentes.has(cpf) || cpfsNesteArquivo.has(cpf)) {
      pulados += 1;
      return;
    }
    if (!funcoesValidas.has(funcao)) {
      erros.push({
        linha: numeroLinha,
        motivo: `Função inválida: "${funcao}". Cadastre essa função em /bombeiros/funcoes antes de reenviar, ou use uma já existente (${Array.from(funcoesValidas).join(", ")}).`,
      });
      return;
    }
    if (esocialStatus !== "Ativo" && esocialStatus !== "Inativo") {
      erros.push({ linha: numeroLinha, motivo: 'Status E-Social precisa ser "Ativo" ou "Inativo".' });
      return;
    }
    const asoData = asoDataBr ? dataBrParaIso(asoDataBr) : null;
    if (asoDataBr && !asoData) {
      erros.push({ linha: numeroLinha, motivo: `Data ASO inválida: "${asoDataBr}" (use DD/MM/AAAA).` });
      return;
    }
    const credenciamentoData = credenciamentoDataBr ? dataBrParaIso(credenciamentoDataBr) : null;
    if (credenciamentoDataBr && !credenciamentoData) {
      erros.push({
        linha: numeroLinha,
        motivo: `Data Credenciamento inválida: "${credenciamentoDataBr}" (use DD/MM/AAAA).`,
      });
      return;
    }

    cpfsNesteArquivo.add(cpf);
    paraInserir.push({
      linha: numeroLinha,
      nome,
      cpf,
      funcao,
      aso_data: asoData,
      esocial_matricula: esocialMatricula,
      esocial_status: esocialStatus,
      credenciamento_data: credenciamentoData,
    });
  });

  let importados = 0;

  // Em lotes (não tudo numa query só): se um lote falhar por conflito
  // de CPF — corrida rara entre duas importações simultâneas, já que
  // cpfsExistentes foi lido uma vez no início — cai pra inserir linha
  // a linha só DESSE lote, isolando exatamente qual CPF colidiu em vez
  // de perder o lote inteiro (achado de revisão de segurança: o
  // propósito declarado da tela é permitir reenviar só o que falhou).
  function paraLinhaDeInsercao(item: LinhaValida) {
    return {
      nome: item.nome,
      cpf: item.cpf,
      funcao: item.funcao,
      aso_data: item.aso_data,
      esocial_matricula: item.esocial_matricula,
      esocial_status: item.esocial_status,
      credenciamento_data: item.credenciamento_data,
    };
  }

  for (let i = 0; i < paraInserir.length; i += TAMANHO_LOTE) {
    const lote = paraInserir.slice(i, i + TAMANHO_LOTE);
    const { error: erroLote } = await supabase.from("bombeiros").insert(lote.map(paraLinhaDeInsercao));
    if (!erroLote) {
      importados += lote.length;
      continue;
    }

    // Fallback linha a linha só quando o lote falha — mantém o
    // caminho comum (sem conflito) rápido, sem 1 query por bombeiro.
    for (const item of lote) {
      const { error: erroLinha } = await supabase.from("bombeiros").insert(paraLinhaDeInsercao(item));
      if (erroLinha) {
        erros.push({
          linha: item.linha,
          motivo: erroLinha.code === "23505" ? "CPF já cadastrado (inserido em paralelo)." : "Erro ao gravar.",
        });
      } else {
        importados += 1;
      }
    }
  }

  revalidatePath("/bombeiros");

  return {
    error: null,
    resultado: { importados, pulados, erros },
  };
}
