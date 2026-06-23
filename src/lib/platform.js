import { supabase } from './supabase'

export const getOrganizacoesGestor = async () => {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('organizacoes')
    .select('id, slug, nome, ativo, plano, created_at, responsavel_nome, razao_social, documento, documento_tipo')
    .order('created_at', { ascending: false })
  if (error) { console.error(error); return [] }
  return data || []
}

// Conta pedidos (web + manuais) por organização — RLS de platform_admin já libera a leitura.
export const getPedidosCountPorOrg = async () => {
  if (!supabase) return {}
  const [web, manual] = await Promise.all([
    supabase.from('korin_pedidos_web').select('org_id'),
    supabase.from('korin_pedidos_manual').select('org_id'),
  ])
  const contagem = {}
  ;[...(web.data || []), ...(manual.data || [])].forEach(p => { contagem[p.org_id] = (contagem[p.org_id] || 0) + 1 })
  return contagem
}

export const setOrgAtivo = async (orgId, ativo) => {
  if (!supabase) return { ok: false, error: 'Sem conexão' }
  const { error } = await supabase.rpc('platform_admin_set_org_ativo', { p_org_id: orgId, p_ativo: ativo })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
