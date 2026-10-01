-- Organizações novas passam a ter 7 dias de teste a partir da criação (data de Brasília).
-- Antes o padrão era uma data fixa (2026-09-08), então toda organização criada depois dela
-- já nascia bloqueada. Só muda o padrão de organizações NOVAS; as existentes não são alteradas.
-- (Já aplicada em produção via Supabase MCP em 01/10/2026 — migração `trial_fim_7_dias_apos_criacao`.)
alter table public.organizacoes
  alter column trial_fim set default (((now() at time zone 'America/Sao_Paulo')::date) + 7);
