import { supabase } from './supabase'

export const getOrganizacoesGestor = async () => {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('organizacoes')
    .select('id, slug, nome, ativo, plano, created_at, responsavel_nome, razao_social, documento, documento_tipo, trial_fim, pago_ate, permite_dedicante_unidade, assinatura_status, cancelamento_solicitado_em')
    .order('created_at', { ascending: false })
  if (error) { console.error(error); return [] }
  return data || []
}

// Todas as cobranças (Configuração Guiada + mensalidade) de todas as
// organizações — RLS de platform_admin já libera a leitura, igual korin_pedidos.
export const getCobrancasGestor = async () => {
  if (!supabase) return {}
  const { data } = await supabase.from('cobrancas').select('*').order('created_at', { ascending: false })
  const porOrg = {}
  ;(data || []).forEach(c => { (porOrg[c.org_id] ||= []).push(c) })
  return porOrg
}

export const processarCancelamento = async (orgId) => {
  if (!supabase) return { ok: false, error: 'Sem conexão' }
  const { error } = await supabase.rpc('platform_admin_processar_cancelamento', { p_org_id: orgId })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export const descartarCancelamento = async (orgId) => {
  if (!supabase) return { ok: false, error: 'Sem conexão' }
  const { error } = await supabase.rpc('platform_admin_descartar_cancelamento', { p_org_id: orgId })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// Conta pedidos por organização — RLS de platform_admin já libera a leitura.
export const getPedidosCountPorOrg = async () => {
  if (!supabase) return {}
  const { data } = await supabase.from('korin_pedidos').select('org_id')
  const contagem = {}
  ;(data || []).forEach(p => { contagem[p.org_id] = (contagem[p.org_id] || 0) + 1 })
  return contagem
}

export const setOrgAtivo = async (orgId, ativo) => {
  if (!supabase) return { ok: false, error: 'Sem conexão' }
  const { error } = await supabase.rpc('platform_admin_set_org_ativo', { p_org_id: orgId, p_ativo: ativo })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// pagoAte = 'YYYY-MM-DD' ou null (limpar/remover pagamento registrado).
export const setPagoAte = async (orgId, pagoAte) => {
  if (!supabase) return { ok: false, error: 'Sem conexão' }
  const { error } = await supabase.rpc('platform_admin_set_pago_ate', { p_org_id: orgId, p_pago_ate: pagoAte })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// Liga/desliga o recurso "dedicante de unidade" (acesso restrito por unidade)
// pra uma organização específica — feature vendida à parte, começa desligada
// pra todo mundo, o Junior liga uma a uma conforme fecha com cada cliente.
export const setPermiteDedicanteUnidade = async (orgId, permite) => {
  if (!supabase) return { ok: false, error: 'Sem conexão' }
  const { error } = await supabase.rpc('platform_admin_set_permite_dedicante_unidade', { p_org_id: orgId, p_permite: permite })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
