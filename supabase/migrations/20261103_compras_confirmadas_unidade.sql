-- Unidade a que cada compra confirmada se refere (nome em org_unidades).
-- NULL = compra do grupo todo / ajuste manual sem unidade. Coluna opcional:
-- linhas antigas continuam valendo, só entram no total do grupo.
alter table public.compras_confirmadas add column if not exists unidade text;
comment on column public.compras_confirmadas.unidade is 'Nome da unidade (org_unidades.nome) a que a compra se refere. NULL = compra do grupo todo / ajuste sem unidade.';
