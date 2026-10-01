-- Desconto mensal em reais por organização, abatido da mensalidade calculada
-- (R$ 49,90 + R$ 9,90 por unidade extra). Padrão 0 = sem desconto.
-- Só o servidor/gestor escreve (não há política de UPDATE pra clientes).
-- (Já aplicada em produção via Supabase MCP em 01/10/2026 — migração `organizacoes_desconto_mensal`.)
alter table public.organizacoes
  add column if not exists desconto_mensal numeric(10,2) not null default 0
  check (desconto_mensal >= 0);

-- Camile: dois grupos cobrados como um cliente só (uma base de R$ 49,90):
-- Campo Grande R$ 119,20 + Costa Verde (R$ 109,30 - R$ 40,00 = R$ 69,30) = R$ 188,50.
update public.organizacoes set desconto_mensal = 40.00 where slug = 'grupo-costa-verde';
