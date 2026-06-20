/**
 * store.js — Camada de dados offline-first
 *
 * Estratégia:
 *  1. ESCREVE no localStorage imediatamente (zero latência, disponível offline)
 *  2. TENTA escrever no Supabase. Se falhar → enfileira na fila de sync.
 *  3. No startup (online) → puxa do Supabase (fonte verdade na nuvem).
 *  4. Quando volta online → processa a fila de sync.
 */

import { supabase } from './supabase'
import { PRODUTOS_INICIAIS } from './catalog'

// ── CHAVES LOCAL ──────────────────────────────────────────────────────────────
const K = {
  produtos:  'korin-produtos',
  pedidos:   'korin-pedidos',
  periodo:   'korin-periodo',
  queue:     'korin-sync-queue',
  lastSync:  'korin-last-sync',
}

// ── HELPERS LOCAL ─────────────────────────────────────────────────────────────
const local = {
  get: (k)    => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} },
}

// ── FILA DE SYNC (operações que falharam por falta de internet) ───────────────
const enqueue = (orgId, key, value) => {
  const q = local.get(K.queue) || []
  const sem = q.filter(x => x.key !== key)          // remove entrada anterior da mesma chave
  sem.push({ orgId, key, value, ts: Date.now() })
  local.set(K.queue, sem)
}

/** Processa toda a fila pendente. Chame quando detectar retorno de internet. */
export const flushQueue = async () => {
  if (!supabase) return { ok: false, reason: 'no_supabase' }
  const q = local.get(K.queue) || []
  if (!q.length) return { ok: true, flushed: 0 }

  const remaining = []
  let flushed = 0

  for (const item of q) {
    if (!item.orgId) { remaining.push(item); continue } // item antigo sem org, descarta do retry automático
    try {
      const { error } = await supabase
        .from('korin_data')
        .upsert(
          { org_id: item.orgId, key: item.key, value: item.value, updated_at: new Date().toISOString() },
          { onConflict: 'org_id,key' }
        )
      if (error) throw error
      flushed++
    } catch {
      remaining.push(item)
    }
  }

  local.set(K.queue, remaining)
  if (!remaining.length) local.set(K.lastSync, new Date().toISOString())
  return { ok: true, flushed, pending: remaining.length }
}

// ── PUSH INDIVIDUAL (escrita + fallback para fila) ────────────────────────────
const push = async (orgId, key, value) => {
  if (!supabase || !orgId) { enqueue(orgId, key, value); return false }
  try {
    const { error } = await supabase
      .from('korin_data')
      .upsert(
        { org_id: orgId, key, value, updated_at: new Date().toISOString() },
        { onConflict: 'org_id,key' }
      )
    if (error) throw error
    local.set(K.lastSync, new Date().toISOString())
    return true
  } catch {
    enqueue(orgId, key, value)
    return false
  }
}

// ── PULL (busca nuvem → atualiza local) ───────────────────────────────────────
export const pullFromCloud = async (orgId) => {
  if (!supabase || !orgId) return { ok: false, reason: 'no_supabase_or_org' }
  try {
    const { data, error } = await supabase.from('korin_data').select('*').eq('org_id', orgId)
    if (error) throw error
    data?.forEach(row => local.set(row.key, row.value))
    local.set(K.lastSync, new Date().toISOString())
    return { ok: true, rows: data?.length || 0 }
  } catch (e) {
    return { ok: false, reason: e.message }
  }
}

// ── OPERAÇÕES DE NEGÓCIO ──────────────────────────────────────────────────────
export const loadAll = () => ({
  produtos:  local.get(K.produtos) || PRODUTOS_INICIAIS,
  pedidos:   local.get(K.pedidos)  || [],
  periodo:   local.get(K.periodo)  || 'Abril/2026',
  lastSync:  local.get(K.lastSync),
  queueSize: (local.get(K.queue) || []).length,
})

export const saveProdutos = (orgId, data) => { local.set(K.produtos, data); push(orgId, K.produtos, data) }
export const savePedidos  = (orgId, data) => { local.set(K.pedidos,  data); push(orgId, K.pedidos,  data) }
export const savePeriodo  = (orgId, data) => { local.set(K.periodo,  data); push(orgId, K.periodo,  data) }

// ── HISTÓRICO ─────────────────────────────────────────────────────────────────
export const archivePeriodo = async (orgId, periodo, pedidos, produtos) => {
  if (!supabase || !orgId) return false
  try {
    const { error } = await supabase.from('korin_historico')
      .upsert(
        { org_id: orgId, periodo, pedidos, produtos, arquivado_em: new Date().toISOString() },
        { onConflict: 'org_id,periodo' }
      )
    if (error) throw error
    return true
  } catch { return false }
}

export const listPeriodos = async (orgId) => {
  if (!supabase || !orgId) return []
  try {
    const { data, error } = await supabase
      .from('korin_historico').select('periodo').eq('org_id', orgId).order('arquivado_em', { ascending: false })
    if (error) throw error
    return (data || []).map(d => d.periodo)
  } catch { return [] }
}

export const getPedidosByPeriodo = async (orgId, periodo) => {
  if (!supabase || !orgId) return null
  try {
    const { data, error } = await supabase
      .from('korin_historico').select('pedidos, produtos')
      .eq('org_id', orgId).eq('periodo', periodo).maybeSingle()
    if (error) throw error
    return data
  } catch { return null }
}
