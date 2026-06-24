/**
 * store.js — Pedidos (manual + catálogo), escopados por período.
 *
 * Tabela única korin_pedidos, com `origem` ('whatsapp' | 'catalogo')
 * distinguindo a procedência. Antes eram duas tabelas quase iguais — a
 * duplicação só gerava tradução de formato e política de segurança em dobro,
 * sem ganho real de segurança (a escrita do cliente final já passa sempre
 * pela função do servidor, nunca direto na tabela).
 *
 * RLS exige is_org_member + periodo_editavel — por isso toda escrita é uma
 * chamada direta ao Supabase (sem fila offline: não dá pra enfileirar com
 * segurança uma escrita que depende de constraint/RLS do servidor).
 *
 * Mantém um cache local só de LEITURA (por período) pra render instantâneo
 * antes do primeiro fetch resolver.
 */
import { supabase } from './supabase'

const cacheKey = (periodoId) => `korin-pedidos-cache:${periodoId}`

const cache = {
  get: (periodoId) => {
    try { const v = localStorage.getItem(cacheKey(periodoId)); return v ? JSON.parse(v) : [] } catch { return [] }
  },
  set: (periodoId, lista) => {
    try { localStorage.setItem(cacheKey(periodoId), JSON.stringify(lista)) } catch {}
  },
}

// ── MAPEAMENTO DB ↔ APP ───────────────────────────────────────────────────────
const fromDb = (row) => ({
  id: row.id,
  clienteNome: row.cliente_nome,
  clienteTel: row.cliente_tel || '',
  unidade: row.unidade || '',
  pagamento: row.pagamento || 'A Definir',
  itens: row.itens || [],
  origem: row.origem || 'whatsapp',
  status: row.status || 'pendente',
  dataPedido: row.data_pedido,
  dataEntrega: row.data_entrega || null,
  troco: row.troco != null ? Number(row.troco) : null,
  obs: row.obs || null,
  total: row.total != null ? Number(row.total) : null,
  _isWeb: row.origem === 'catalogo',
})

const toDb = (orgId, periodoId, p) => ({
  ...(p.id ? { id: p.id } : {}),
  org_id: orgId,
  periodo_id: periodoId,
  cliente_nome: p.clienteNome,
  cliente_tel: p.clienteTel || null,
  unidade: p.unidade || null,
  pagamento: p.pagamento || 'A Definir',
  itens: p.itens || [],
  origem: p.origem || 'whatsapp',
  status: p.status || 'pendente',
  data_pedido: p.dataPedido || new Date().toISOString(),
  data_entrega: p.dataEntrega || null,
  troco: (p.troco === '' || p.troco == null) ? null : p.troco,
  obs: p.obs || null,
  total: p.total ?? null,
  updated_at: new Date().toISOString(),
})

// ── LEITURA ────────────────────────────────────────────────────────────────────
export const loadCachedPedidos = (periodoId) => cache.get(periodoId)

export const getPedidos = async (periodoId) => {
  if (!supabase || !periodoId) return []
  try {
    const { data, error } = await supabase
      .from('korin_pedidos').select('*').eq('periodo_id', periodoId)
      .order('data_pedido', { ascending: false })
    if (error) throw error
    const lista = (data || []).map(fromDb)
    cache.set(periodoId, lista)
    return lista
  } catch {
    return cache.get(periodoId)
  }
}

// ── ESCRITA ────────────────────────────────────────────────────────────────────
/** Cria ou atualiza um pedido (manual ou catálogo). Falha se o período estiver arquivado. */
export const salvarPedido = async (orgId, periodoId, pedidoApp) => {
  if (!supabase) return { ok: false, error: 'Sem conexão com internet' }
  try {
    const payload = toDb(orgId, periodoId, pedidoApp)
    const { data, error } = await supabase
      .from('korin_pedidos').upsert(payload, { onConflict: 'id' })
      .select().maybeSingle()
    if (error) throw error
    return { ok: true, pedido: fromDb(data) }
  } catch (e) { return { ok: false, error: e.message } }
}

/** Exclusão definitiva — usada pra pedido manual ("Excluir"). */
export const removerPedido = async (id) => {
  if (!supabase) return { ok: false, error: 'Sem conexão com internet' }
  try {
    const { error } = await supabase.from('korin_pedidos').delete().eq('id', id)
    if (error) throw error
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
}

/** Cancelamento reversível — usada pra pedido do catálogo ("Cancelar"), mantém o histórico. */
export const cancelarPedido = async (id) => {
  if (!supabase) return { ok: false, error: 'Sem conexão com internet' }
  try {
    const { error } = await supabase.from('korin_pedidos')
      .update({ status: 'cancelado', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
}

// ── TOTAIS (uso interno do painel — por produtoId) ──────────────────────────
export const getTotaisPorProduto = (pedidos) => {
  const t = {}
  pedidos
    .filter(p => p.status !== 'cancelado')
    .forEach(p => p.itens.forEach(it => { t[it.produtoId] = (t[it.produtoId] || 0) + it.qty }))
  return t
}
