/**
 * clientes.js — Cadastro leve de clientes por organização, alimentado
 * sozinho: toda vez que um pedido é salvo (manual, colado do WhatsApp, ou
 * catálogo público), o cliente é upsertado por telefone normalizado. Não
 * existe tela de cadastro manual — hoje serve só de base pra autocomplete
 * de nome/telefone/unidade em pedido novo (menos digitação pra coordenadora,
 * sem adicionar nenhum campo ou passo novo em nenhum fluxo).
 */
import { supabase } from './supabase'

export const normalizarTelefone = (tel) => (tel || '').replace(/\D/g, '')

/** Nunca derruba o fluxo de pedido se falhar — é um efeito colateral, não o dado principal. */
export async function upsertCliente(orgId, { nome, telefone, unidade }) {
  if (!supabase || !orgId) return
  const telefone_normalizado = normalizarTelefone(telefone)
  if (!telefone_normalizado || !nome?.trim()) return
  try {
    await supabase.from('clientes').upsert({
      org_id: orgId,
      nome: nome.trim(),
      telefone: telefone.trim(),
      telefone_normalizado,
      unidade: unidade || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'org_id,telefone_normalizado' })
  } catch {}
}

export async function listarClientes(orgId) {
  if (!supabase || !orgId) return []
  const { data, error } = await supabase
    .from('clientes').select('nome, telefone, unidade').eq('org_id', orgId).order('nome', { ascending: true })
  if (error) { console.error(error); return [] }
  return data || []
}
