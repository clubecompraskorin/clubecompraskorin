import { supabase } from './supabase'

// Leitura é pública (RLS: public_read_unidades) — usado tanto pelo admin
// quanto pelo catálogo do cliente final (sem login).
export async function getUnidades(orgId) {
  if (!supabase || !orgId) return []
  const { data, error } = await supabase
    .from('org_unidades')
    .select('id, nome, endereco, ordem')
    .eq('org_id', orgId)
    .order('ordem', { ascending: true })
  if (error) { console.error(error); return [] }
  return data || []
}

// Escrita exige is_org_member(org_id) via RLS — só funciona logado.
export async function addUnidade(orgId, { nome, endereco }, ordem = 0) {
  const { data, error } = await supabase
    .from('org_unidades')
    .insert({ org_id: orgId, nome: nome.trim(), endereco: endereco?.trim() || null, ordem })
    .select('id, nome, endereco, ordem')
    .single()
  if (error) throw error
  return data
}

export async function updateUnidade(id, { nome, endereco }) {
  const { error } = await supabase
    .from('org_unidades')
    .update({ nome: nome.trim(), endereco: endereco?.trim() || null })
    .eq('id', id)
  if (error) throw error
}

export async function deleteUnidade(id) {
  const { error } = await supabase.from('org_unidades').delete().eq('id', id)
  if (error) throw error
}
