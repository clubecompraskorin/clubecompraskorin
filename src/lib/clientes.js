/**
 * clientes.js — Cadastro leve de clientes por organização, alimentado
 * sozinho: toda vez que um pedido é salvo (manual, colado do WhatsApp, ou
 * catálogo público), o cliente é upsertado por telefone normalizado. Serve
 * de base pra autocomplete de nome/telefone/unidade em pedido novo, e
 * também pra tela de gestão (ClientesManager.jsx) — buscar, editar,
 * cadastrar/excluir manualmente e exportar a lista.
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
    .from('clientes').select('id, nome, telefone, unidade, created_at').eq('org_id', orgId).order('nome', { ascending: true })
  if (error) { console.error(error); return [] }
  return data || []
}

// Cadastro manual (tela de gestão) — ao contrário do upsertCliente (efeito
// colateral silencioso do fluxo de pedido), aqui o erro precisa aparecer pra
// coordenadora: ela está cadastrando de propósito, não pode falhar calado.
export async function criarClienteManual(orgId, { nome, telefone, unidade }) {
  if (!nome?.trim()) throw new Error('Informe o nome do cliente')
  const telefone_normalizado = normalizarTelefone(telefone)
  if (!telefone_normalizado) throw new Error('Informe o telefone do cliente')
  const { data, error } = await supabase
    .from('clientes')
    .insert({
      org_id: orgId,
      nome: nome.trim(),
      telefone: telefone.trim(),
      telefone_normalizado,
      unidade: unidade || null,
    })
    .select('id, nome, telefone, unidade, created_at')
    .single()
  if (error) {
    if (error.code === '23505') throw new Error('Já existe um cliente cadastrado com esse telefone')
    throw error
  }
  return data
}

export async function atualizarCliente(id, { nome, telefone, unidade }) {
  if (!nome?.trim()) throw new Error('Informe o nome do cliente')
  const telefone_normalizado = normalizarTelefone(telefone)
  if (!telefone_normalizado) throw new Error('Informe o telefone do cliente')
  const { error } = await supabase
    .from('clientes')
    .update({
      nome: nome.trim(),
      telefone: telefone.trim(),
      telefone_normalizado,
      unidade: unidade || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) {
    if (error.code === '23505') throw new Error('Já existe um cliente cadastrado com esse telefone')
    throw error
  }
}

export async function excluirCliente(id) {
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) throw error
}
