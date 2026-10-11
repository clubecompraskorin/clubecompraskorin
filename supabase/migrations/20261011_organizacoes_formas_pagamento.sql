-- Formas de pagamento aceitas nos pedidos (catálogo, entrega, PDV, pedido manual) por organização.
-- Padrão: todas. Dá pra ligar/desligar por grupo sem trocar código (RPC abaixo, usada pelo /gestor).
-- (Já aplicada em produção via Supabase MCP em 11/10/2026 — migração `organizacoes_formas_pagamento`.)
alter table public.organizacoes
  add column if not exists formas_pagamento text[] not null
  default array['PIX','Dinheiro','Cartão Crédito','Cartão Débito'];

alter table public.organizacoes
  add constraint organizacoes_formas_pagamento_valida
  check (cardinality(formas_pagamento) >= 1
         and formas_pagamento <@ array['PIX','Dinheiro','Cartão Crédito','Cartão Débito']);

create or replace view public.organizacoes_publicas as
  select id, slug, nome, ativo,
         (current_date > trial_fim and (pago_ate is null or current_date > pago_ate)) as bloqueado,
         formas_pagamento
  from public.organizacoes;

create or replace function public.platform_admin_set_formas_pagamento(p_org_id uuid, p_formas text[])
returns void language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
begin
  if not is_platform_admin() then raise exception 'sem permissao'; end if;
  update organizacoes set formas_pagamento = p_formas where id = p_org_id;
end;
$$;

-- Camile (Grupo Campo Grande e Grupo Costa Verde): por enquanto só PIX e dinheiro.
update public.organizacoes set formas_pagamento = array['PIX','Dinheiro']
 where slug in ('grupo-campo-grande','grupo-costa-verde');
