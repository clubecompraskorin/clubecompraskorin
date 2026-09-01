/**
 * dedicantes.js — Gestão de "dedicantes de unidade": login restrito, criado pela
 * própria representante (role de acesso total), só pras unidades escolhidas.
 * Criar/remover exige a Admin API do Supabase (senha definida na hora, sem
 * confirmação por e-mail) — por isso passa pelo endpoint api/dedicante.js
 * (service_role), nunca direto pelo client. Listar é RLS normal.
 */
import { supabase } from './supabase'
import { getSession } from './auth'

/** Dedicantes de unidade já cadastrados nesta organização, com as unidades de cada um. */
export async function listarDedicantesUnidade(orgId) {
  if (!supabase || !orgId) return []
  const { data, error } = await supabase
    .from('org_members')
    .select('id, nome, email, created_at, org_member_unidades ( org_unidades ( id, nome ) )')
    .eq('org_id', orgId)
    .eq('role', 'dedicante_unidade')
    .order('created_at', { ascending: true })
  if (error) { console.error(error); return [] }
  return (data || []).map(m => ({
    id: m.id,
    nome: m.nome || '',
    email: m.email || '',
    unidades: (m.org_member_unidades || []).map(u => u.org_unidades).filter(Boolean),
  }))
}

async function chamarEndpoint(metodo, corpo) {
  const session = await getSession()
  if (!session) return { ok: false, error: 'Sessão expirada — recarregue a página e entre novamente.' }
  try {
    const res = await fetch('/api/dedicante', {
      method: metodo,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(corpo),
    })
    const json = await res.json()
    if (!res.ok || !json.ok) return { ok: false, error: json.error || 'Não foi possível completar a ação' }
    return json
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

/** Cria o login do dedicante. Devolve a senha gerada — só aparece esta vez. */
export async function criarDedicanteUnidade(orgId, { nome, email, unidadeIds }) {
  return chamarEndpoint('POST', { orgId, nome, email, unidadeIds })
}

export async function removerDedicanteUnidade(orgId, memberId) {
  return chamarEndpoint('DELETE', { orgId, memberId })
}
