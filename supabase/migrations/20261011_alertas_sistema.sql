-- Alertas operacionais do sistema (ex: fila de webhooks do Asaas pausada, cobrança paga que o
-- webhook não registrou). Quem escreve é o servidor (service role); o gestor da plataforma lê e
-- marca como resolvido. Clientes não enxergam nada daqui.
-- (Já aplicada em produção via Supabase MCP em 11/10/2026 — migração `alertas_sistema`.)
create table if not exists public.alertas_sistema (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  mensagem text not null,
  detalhe jsonb,
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz
);
alter table public.alertas_sistema enable row level security;
create policy alertas_sistema_select on public.alertas_sistema for select using (is_platform_admin());
create policy alertas_sistema_update on public.alertas_sistema for update using (is_platform_admin()) with check (is_platform_admin());
create index if not exists alertas_sistema_abertos_idx on public.alertas_sistema (tipo) where resolvido_em is null;
