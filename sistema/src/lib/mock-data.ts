import type { Bombeiro, Cliente, Evento, PrecoConfig } from "./types";

/**
 * Dados 100% fictícios usados apenas quando o Supabase não está
 * configurado (ver getServerSupabaseClient) — permite apresentar as
 * telas antes de existir um banco de dados real.
 */

export const MOCK_BOMBEIROS: Bombeiro[] = [
  { id: "m1", nome: "Marina Costa Andrade", cpf: "305.918.472-60", telefone: "(31) 98123-4455", funcao: "Bombeiro Civil", aso_data: "2026-09-15", esocial_matricula: "812", esocial_status: "Ativo", credenciamento_data: "2026-12-10", chave_pix: null, foto_rosto_path: null, aso_documento_path: null, credenciamento_documento_path: null, created_at: "2026-01-01" },
  { id: "m2", nome: "Eduardo Lima Souza", cpf: "274.836.109-92", telefone: "(31) 99234-5566", funcao: "Bombeiro Civil", aso_data: "2026-08-20", esocial_matricula: "813", esocial_status: "Ativo", credenciamento_data: "2027-01-02", chave_pix: null, foto_rosto_path: null, aso_documento_path: null, credenciamento_documento_path: null, created_at: "2026-01-01" },
  { id: "m3", nome: "Vinícius Almeida Rocha", cpf: "618.204.957-31", telefone: "(31) 98345-6677", funcao: "Bombeiro Civil Líder", aso_data: "2026-06-30", esocial_matricula: "814", esocial_status: "Ativo", credenciamento_data: "2025-11-15", chave_pix: null, foto_rosto_path: null, aso_documento_path: null, credenciamento_documento_path: null, created_at: "2026-01-01" },
  { id: "m4", nome: "Beatriz Fernandes Melo", cpf: "452.170.836-08", telefone: "(31) 99456-7788", funcao: "Bombeiro Civil", aso_data: "2026-10-10", esocial_matricula: "815", esocial_status: "Ativo", credenciamento_data: "2026-08-18", chave_pix: null, foto_rosto_path: null, aso_documento_path: null, credenciamento_documento_path: null, created_at: "2026-01-01" },
  { id: "m5", nome: "Rodrigo Santos Pereira", cpf: "793.615.240-77", telefone: "(31) 98567-8899", funcao: "Bombeiro Civil", aso_data: "2026-08-09", esocial_matricula: "816", esocial_status: "Ativo", credenciamento_data: "2026-10-01", chave_pix: null, foto_rosto_path: null, aso_documento_path: null, credenciamento_documento_path: null, created_at: "2026-01-01" },
  { id: "m6", nome: "Isabela Martins Duarte", cpf: "936.482.017-53", telefone: "(31) 99678-9900", funcao: "Supervisora de Brigada", aso_data: "2027-01-20", esocial_matricula: "817", esocial_status: "Ativo", credenciamento_data: "2026-09-05", chave_pix: null, foto_rosto_path: null, aso_documento_path: null, credenciamento_documento_path: null, created_at: "2026-01-01" },
  { id: "m7", nome: "Gustavo Ribeiro Nunes", cpf: "205.749.638-14", telefone: "(31) 98789-0011", funcao: "Bombeiro Civil", aso_data: "2026-07-28", esocial_matricula: "818", esocial_status: "Inativo", credenciamento_data: "2026-12-01", chave_pix: null, foto_rosto_path: null, aso_documento_path: null, credenciamento_documento_path: null, created_at: "2026-01-01" },
  { id: "m8", nome: "Carolina Vieira Barros", cpf: "861.023.594-29", telefone: "(31) 99890-1122", funcao: "Bombeiro Civil", aso_data: "2026-11-11", esocial_matricula: "819", esocial_status: "Ativo", credenciamento_data: "2027-02-14", chave_pix: null, foto_rosto_path: null, aso_documento_path: null, credenciamento_documento_path: null, created_at: "2026-01-01" },
  { id: "m9", nome: "Felipe Moraes Cardozo", cpf: "347.596.281-65", telefone: "(31) 98901-2233", funcao: "Bombeiro Civil", aso_data: "2026-08-25", esocial_matricula: "820", esocial_status: "Ativo", credenciamento_data: "2026-08-15", chave_pix: null, foto_rosto_path: null, aso_documento_path: null, credenciamento_documento_path: null, created_at: "2026-01-01" },
  { id: "m10", nome: "Renata Oliveira Castro", cpf: "570.842.163-90", telefone: "(31) 99012-3344", funcao: "Bombeiro Civil", aso_data: "2026-09-30", esocial_matricula: "821", esocial_status: "Ativo", credenciamento_data: "2026-06-20", chave_pix: null, foto_rosto_path: null, aso_documento_path: null, credenciamento_documento_path: null, created_at: "2026-01-01" },
];

export const MOCK_CLIENTES: Cliente[] = [
  { id: "c1", nome: "Vale do Aço Eventos Ltda", cnpj: "12.345.678/0001-90", contato: "(31) 3222-1100", email: "contato@valedoaco.com.br", endereco: "Av. Central, 500 — Ipatinga/MG", created_at: "2026-01-01" },
  { id: "c2", nome: "Contagem Produções Culturais", cnpj: "23.456.789/0001-01", contato: "(31) 3355-2200", email: "producao@contagemcultural.com.br", endereco: "Rua das Artes, 88 — Contagem/MG", created_at: "2026-01-01" },
  { id: "c3", nome: "Betim Sports Arena", cnpj: "34.567.890/0001-12", contato: "(31) 3466-3300", email: "arena@betimsports.com.br", endereco: "Av. dos Esportes, 1200 — Betim/MG", created_at: "2026-01-01" },
];

export const MOCK_PRECOS: PrecoConfig[] = [
  { chave: "turno_diurno", valor: 150, descricao: "Diária — Turno Diurno (08:00–18:00)", updated_at: "2026-01-01" },
  { chave: "turno_noturno", valor: 135, descricao: "Diária — Turno Noturno (18:00–00:00)", updated_at: "2026-01-01" },
  { chave: "turno_especial", valor: 280, descricao: "Diária — Turno Especial (08:00–20:00)", updated_at: "2026-01-01" },
  { chave: "alimentacao_dia", valor: 20, descricao: "Alimentação por dia", updated_at: "2026-01-01" },
];

export const MOCK_EVENTOS: Evento[] = [
  { id: "e1", nome: "Feira de Negócios Vale do Aço", cliente_id: null, local: "Centro de Convenções — Belo Horizonte", data_inicio: "2026-08-01", data_fim: "2026-08-03", quantitativo_bombeiros: 8, materiais: "10 extintores, 1 DEA, kit de primeiros socorros", valor_fechamento: 8200, custo_estimado: null, status: "Concluído", created_at: "2026-07-01" },
  { id: "e2", nome: "Festival Horizonte Sonoro", cliente_id: null, local: "Parque Municipal — Contagem", data_inicio: "2026-08-15", data_fim: "2026-08-15", quantitativo_bombeiros: 14, materiais: "18 extintores, 2 cadeiras de rodas, sinalização de rota de fuga", valor_fechamento: 12600, custo_estimado: null, status: "Confirmado", created_at: "2026-07-10" },
  { id: "e3", nome: "Copa Regional de Futebol — Final", cliente_id: null, local: "Estádio Municipal — Betim", data_inicio: "2026-08-22", data_fim: "2026-08-22", quantitativo_bombeiros: 30, materiais: "30 extintores, 2 DEA, brigada volante", valor_fechamento: 27800, custo_estimado: null, status: "Confirmado", created_at: "2026-07-15" },
  { id: "e4", nome: "Feira de Saúde e Bem-Estar", cliente_id: null, local: "Shopping — Nova Lima", data_inicio: "2026-08-29", data_fim: "2026-08-29", quantitativo_bombeiros: 6, materiais: "8 extintores, kit de primeiros socorros", valor_fechamento: 4300, custo_estimado: null, status: "Confirmado", created_at: "2026-07-20" },
  { id: "e5", nome: "Corrida Solidária de Verão", cliente_id: null, local: "Praça da Liberdade — Belo Horizonte", data_inicio: "2026-09-05", data_fim: "2026-09-05", quantitativo_bombeiros: 10, materiais: "10 extintores, ambulância de apoio (terceirizada)", valor_fechamento: 6900, custo_estimado: null, status: "Planejamento", created_at: "2026-08-01" },
];
