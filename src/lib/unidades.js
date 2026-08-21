import { supabase } from './supabase'

// Leitura é pública (RLS: public_read_unidades) — usado tanto pelo admin
// quanto pelo catálogo do cliente final (sem login).
export async function getUnidades(orgId) {
  if (!supabase || !orgId) return []
  const { data, error } = await supabase
    .from('org_unidades')
    .select('id, nome, endereco, ordem, aberto')
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
    .select('id, nome, endereco, ordem, aberto')
    .single()
  if (error) throw error
  return data
}

// unidade em pedido/cliente é texto solto (nunca foi migrado pra FK) — renomear
// sem propagar deixaria pedido antigo "grudado" no nome velho, sumindo de
// filtro/export silenciosamente. Propaga só pro que ainda é editável: pedido
// de período arquivado é bloqueado pela própria RLS (periodo_editavel) e
// mantém o nome de quando foi arquivado — comportamento correto, é histórico
// fechado, não deveria mudar depois.
export async function updateUnidade(id, { nome, endereco }, { orgId, nomeAntigo } = {}) {
  const nomeNovo = nome.trim()
  const { error } = await supabase
    .from('org_unidades')
    .update({ nome: nomeNovo, endereco: endereco?.trim() || null })
    .eq('id', id)
  if (error) throw error

  if (orgId && nomeAntigo && nomeAntigo !== nomeNovo) {
    await supabase.from('korin_pedidos').update({ unidade: nomeNovo }).eq('org_id', orgId).eq('unidade', nomeAntigo)
    await supabase.from('clientes').update({ unidade: nomeNovo }).eq('org_id', orgId).eq('unidade', nomeAntigo)
  }
}

// Só bloqueia excluir se a unidade tiver pedido no histórico (qualquer status
// — cancelado também é histórico) — sem isso, excluir apagaria o vínculo de
// pedido antigo, que passaria a sumir de filtro/export silenciosamente (mesmo
// problema do rename sem propagação, só que sem como corrigir depois, já que
// o registro em si deixa de existir). Unidade sem nenhum pedido nunca teve
// esse vínculo, então excluir continua liberado — não trava unidade criada
// por engano ou nunca usada.
export async function unidadeTemHistorico(orgId, nome) {
  if (!supabase || !orgId || !nome) return false
  const { count, error } = await supabase
    .from('korin_pedidos').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('unidade', nome)
  if (error) { console.error(error); return true } // erro de leitura: por segurança, trata como se tivesse histórico
  return (count || 0) > 0
}

// Interruptor manual — tipicamente virado depois que o pedido consolidado da
// unidade já foi enviado pra Korin. Bloqueia pedido NOVO (ver api/pedido.js e
// os modais de pedido manual/WhatsApp); nunca trava pedido já existente.
export async function setUnidadeAberto(id, aberto) {
  const { error } = await supabase.from('org_unidades').update({ aberto }).eq('id', id)
  if (error) throw error
}

export async function deleteUnidade(id, orgId, nome) {
  if (await unidadeTemHistorico(orgId, nome)) {
    throw new Error('Essa unidade tem pedido no histórico e não pode ser excluída. Renomeie ou encerre os pedidos dela em vez de excluir.')
  }
  const { error } = await supabase.from('org_unidades').delete().eq('id', id)
  if (error) throw error
}
