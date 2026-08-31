-- Fase 1 do roadmap (núcleo operacional) pede cadastro completo de
-- Clientes com CNPJ, contato e endereço — o schema inicial só tinha
-- nome/cnpj/contato/email, sem endereço.
alter table clientes
  add column if not exists endereco text;
