// api/entrega.js — Vercel Serverless Function
// Consolida entrega-lista.js + entrega-confirmar.js num único endpoint (limite de
// 12 functions no plano Hobby da Vercel). URLs antigas continuam funcionando via
// rewrite em vercel.json (/api/entrega-lista e /api/entrega-confirmar ->
// /api/entrega?acao=...), sem precisar mudar quem chama (src/EntregaApp.jsx).
//
// Fluxo do representante da unidade (sem login completo, validado por PIN em
// org_unidades.pin_entrega). Usa service_role porque org_unidades e
// korin_pedidos não têm policy pública pra esse caso (RLS exige is_org_member).

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Confere organização ativa + PIN da unidade + período corrente — comum aos
// dois fluxos. Devolve { erro } (já formatado pra resposta) ou { org, unidade, periodo }.
async function validarAcesso({ slug, unidadeId, pin }) {
  if (!slug || !unidadeId || !pin) return { erro: { status: 400, body: { ok: false, error: 'slug, unidadeId e pin são obrigatórios' } } }

  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizacoes').select('id, ativo, nome').eq('slug', slug).maybeSingle()
  if (orgError) throw orgError
  if (!org || !org.ativo) return { erro: { status: 404, body: { ok: false, error: 'Organização não encontrada ou inativa' } } }

  const { data: unidade, error: uniError } = await supabaseAdmin
    .from('org_unidades').select('id, nome, pin_entrega').eq('id', unidadeId).eq('org_id', org.id).maybeSingle()
  if (uniError) throw uniError
  if (!unidade || !unidade.pin_entrega || unidade.pin_entrega !== String(pin)) {
    return { erro: { status: 401, body: { ok: false, error: 'PIN inválido' } } }
  }

  const { data: periodo, error: perError } = await supabaseAdmin
    .from('periodos').select('id, nome').eq('org_id', org.id).eq('is_corrente', true).maybeSingle()
  if (perError) throw perError
  if (!periodo) return { erro: { status: 404, body: { ok: false, error: 'Nenhum período configurado para este grupo' } } }

  return { org, unidade, periodo }
}

async function listar(req, res) {
  const { slug, unidadeId, pin } = req.body
  const acesso = await validarAcesso({ slug, unidadeId, pin })
  if (acesso.erro) return res.status(acesso.erro.status).json(acesso.erro.body)
  const { org, unidade, periodo } = acesso

  const { data: produtos, error: prodError } = await supabaseAdmin
    .from('periodo_produtos').select('id, cod, nome, preco').eq('periodo_id', periodo.id).order('cod', { ascending: true })
  if (prodError) throw prodError

  const { data: pedidos, error: pedError } = await supabaseAdmin
    .from('korin_pedidos')
    .select('id, cliente_nome, cliente_tel, unidade, pagamento, itens, status, data_pedido, data_entrega, entregue_por, troco, obs, total')
    .eq('org_id', org.id).eq('periodo_id', periodo.id).eq('unidade', unidade.nome)
    .neq('status', 'cancelado')
    .order('data_pedido', { ascending: false })
  if (pedError) throw pedError

  return res.status(200).json({
    ok: true,
    org: { nome: org.nome },
    unidade: { id: unidade.id, nome: unidade.nome },
    periodo: { nome: periodo.nome },
    produtos: produtos || [],
    pedidos: (pedidos || []).map(p => ({
      id: p.id,
      clienteNome: p.cliente_nome,
      clienteTel: p.cliente_tel || '',
      unidade: p.unidade || '',
      pagamento: p.pagamento || 'A Definir',
      itens: p.itens || [],
      status: p.status || 'pendente',
      dataPedido: p.data_pedido,
      dataEntrega: p.data_entrega || null,
      entreguePor: p.entregue_por || null,
      troco: p.troco != null ? Number(p.troco) : null,
      obs: p.obs || null,
      total: p.total != null ? Number(p.total) : null,
    })),
  })
}

async function confirmar(req, res) {
  const { slug, unidadeId, pin, pedidoId, entreguePor, itens, pagamento, troco, obs } = req.body
  if (!pedidoId || !entreguePor?.trim()) {
    return res.status(400).json({ ok: false, error: 'Dados obrigatórios faltando' })
  }
  const acesso = await validarAcesso({ slug, unidadeId, pin })
  if (acesso.erro) return res.status(acesso.erro.status).json(acesso.erro.body)
  const { org, unidade, periodo } = acesso

  // Confere que o pedido é mesmo dessa unidade/período/organização antes de
  // alterar — o representante só pode confirmar entrega da própria unidade.
  const { data: pedido, error: pedError } = await supabaseAdmin
    .from('korin_pedidos').select('id, status, unidade')
    .eq('id', pedidoId).eq('org_id', org.id).eq('periodo_id', periodo.id).maybeSingle()
  if (pedError) throw pedError
  if (!pedido || pedido.unidade !== unidade.nome) {
    return res.status(404).json({ ok: false, error: 'Pedido não encontrado para essa unidade' })
  }
  if (pedido.status === 'cancelado') {
    return res.status(403).json({ ok: false, error: 'Pedido cancelado' })
  }

  const payload = {
    status: 'entregue',
    data_entrega: new Date().toISOString(),
    entregue_por: entreguePor.trim(),
    updated_at: new Date().toISOString(),
  }
  if (Array.isArray(itens)) payload.itens = itens
  if (pagamento) payload.pagamento = pagamento
  if (troco !== undefined) payload.troco = (troco === '' || troco == null) ? null : troco
  if (obs !== undefined) payload.obs = obs || null

  const { data, error } = await supabaseAdmin
    .from('korin_pedidos').update(payload).eq('id', pedidoId).select().maybeSingle()
  if (error) throw error

  return res.status(200).json({ ok: true, data })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    if (req.query.acao === 'confirmar') return await confirmar(req, res)
    if (req.query.acao === 'listar') return await listar(req, res)
    return res.status(400).json({ ok: false, error: 'acao inválida' })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
