-- Fase 2 do roadmap (Portal do Bombeiro), item pendente: autocadastro
-- precisa coletar chave PIX, não só dados pessoais e compliance —
-- já previsto desde o comentário em 0001_auth.sql, nunca implementado.
alter table solicitacoes_cadastro
  add column if not exists chave_pix text;

alter table bombeiros
  add column if not exists chave_pix text;

comment on column bombeiros.chave_pix is 'Chave PIX pra pagamento da diária — preenchida pelo bombeiro no autocadastro ou pela coordenação no cadastro manual.';
