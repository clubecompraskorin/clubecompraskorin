// api/asaas.js — Vercel Serverless Function
// Junta criação de cobrança/assinatura e recebimento do webhook num arquivo
// só (o Hobby do Vercel só libera 12 functions por deploy). vercel.json
// reescreve /api/asaas-cobranca -> aqui com ?mode=cobranca e
// /api/asaas-webhook -> aqui com ?mode=webhook, então as URLs continuam
// exatamente as mesmas pra quem já chama (o painel, e o webhook já
// configurado no Asaas).

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3'
const VALOR_CONFIGURACAO_GUIADA = 150
const VALOR_MENSALIDADE_BASE = 49.90
const VALOR_POR_UNIDADE_EXTRA = 9.90

const soDigitos = (s) => (s || '').replace(/\D/g, '')

// Hoje no fuso de Brasília (YYYY-MM-DD) — o acesso vale até o fim do dia de pago_ate.
const hojeBR = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })

const daquiA3DiasISO = () => {
  const d = new Date()
  d.setDate(d.getDate() + 3)
  return d.toISOString().slice(0, 10)
}

async function asaasFetch(caminho, options = {}) {
  const res = await fetch(`${ASAAS_BASE_URL}${caminho}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      access_token: process.env.ASAAS_API_KEY,
      ...options.headers,
    },
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = data?.errors?.[0]?.description || `Asaas respondeu ${res.status}`
    throw new Error(msg)
  }
  return data
}

// ── Cria (ou reaproveita) o cliente no Asaas e gera a cobrança avulsa
// (Configuração Guiada) ou a assinatura recorrente (Mensalidade). Chamado
// autenticado do painel — o client manda o access_token da própria sessão
// no header Authorization. Nunca expõe ASAAS_API_KEY ao cliente.
async function criarCobranca(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Pagamento online ainda não configurado — nunca derruba o endpoint, só
  // avisa com clareza (mesmo padrão do VAPID em api/pedido.js).
  if (!process.env.ASAAS_API_KEY) {
    return res.status(501).json({ ok: false, error: 'Pagamento online ainda não configurado. Fale com o suporte.' })
  }

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ ok: false, error: 'Não autenticado' })

  const { tipo } = req.body || {}
  if (!['configuracao_guiada', 'mensalidade'].includes(tipo)) {
    return res.status(400).json({ ok: false, error: 'Tipo de cobrança inválido' })
  }

  try {
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userData?.user) return res.status(401).json({ ok: false, error: 'Sessão inválida' })

    const { data: membro } = await supabaseAdmin
      .from('org_members').select('org_id').eq('user_id', userData.user.id).limit(1).maybeSingle()
    if (!membro) return res.status(404).json({ ok: false, error: 'Organização não encontrada' })

    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizacoes')
      .select('id, nome, ativo, responsavel_nome, documento, documento_tipo, asaas_customer_id, asaas_subscription_id, assinatura_status, pago_ate')
      .eq('id', membro.org_id).maybeSingle()
    if (orgError || !org) return res.status(404).json({ ok: false, error: 'Organização não encontrada' })
    if (!org.ativo) return res.status(403).json({ ok: false, error: 'Organização inativa' })

    // Cadastro incompleto trava aqui também — a UI já impede o clique, mas o
    // servidor nunca confia só na validação do cliente.
    if (!org.responsavel_nome?.trim() || !org.documento?.trim()) {
      return res.status(400).json({ ok: false, error: 'Complete seu cadastro (nome do responsável e CPF/CNPJ) antes de continuar' })
    }

    if (tipo === 'mensalidade') {
      // Já existe mensalidade em aberto (pendente ou vencida)? Devolve o mesmo
      // link em vez de criar outra assinatura — clique duplo ou tela reaberta
      // nunca gera cobrança em dobro.
      const { data: emAberto } = await supabaseAdmin
        .from('cobrancas').select('link_pagamento, asaas_charge_id')
        .eq('org_id', org.id).eq('tipo', 'mensalidade').in('status', ['pendente', 'vencido'])
        .not('link_pagamento', 'is', null)
        .order('vencimento', { ascending: false }).limit(1).maybeSingle()
      if (emAberto?.link_pagamento) return res.status(200).json({ ok: true, link: emAberto.link_pagamento, cobrancaId: emAberto.asaas_charge_id })

      if (org.assinatura_status === 'ativa') {
        return res.status(400).json({ ok: false, error: 'Você já tem uma assinatura ativa' })
      }
    }

    // Cria (ou reaproveita) o cliente no Asaas
    let customerId = org.asaas_customer_id
    if (!customerId) {
      const cliente = await asaasFetch('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: org.responsavel_nome || org.nome,
          cpfCnpj: soDigitos(org.documento),
          email: userData.user.email || undefined,
          externalReference: org.id,
        }),
      })
      customerId = cliente.id
      await supabaseAdmin.from('organizacoes').update({ asaas_customer_id: customerId }).eq('id', org.id)
    } else if (userData.user.email) {
      // Cliente criado antes de guardarmos o e-mail: completa o contato pro Asaas
      // conseguir avisar dos vencimentos. Melhor esforço — nunca trava a cobrança.
      try {
        await asaasFetch(`/customers/${customerId}`, { method: 'PUT', body: JSON.stringify({ email: userData.user.email }) })
      } catch (e) { console.error('asaas: não atualizou e-mail do cliente:', e.message) }
    }

    let asaasChargeId, valor, vencimento, linkPagamento

    if (tipo === 'configuracao_guiada') {
      valor = VALOR_CONFIGURACAO_GUIADA
      vencimento = daquiA3DiasISO()
      const cobranca = await asaasFetch('/payments', {
        method: 'POST',
        body: JSON.stringify({
          customer: customerId,
          billingType: 'UNDEFINED',
          value: valor,
          dueDate: vencimento,
          description: 'Configuração Guiada — Clube Unido',
          externalReference: org.id,
        }),
      })
      asaasChargeId = cobranca.id
      linkPagamento = cobranca.invoiceUrl
    } else {
      const { count } = await supabaseAdmin
        .from('org_unidades').select('id', { count: 'exact', head: true }).eq('org_id', org.id)
      const extras = Math.max(0, (count || 1) - 1)
      valor = Number((VALOR_MENSALIDADE_BASE + extras * VALOR_POR_UNIDADE_EXTRA).toFixed(2))
      // Vence no dia em que o acesso atual termina (pago_ate); se já terminou
      // (ou nunca pagou), vence hoje.
      const hoje = hojeBR()
      vencimento = org.pago_ate && org.pago_ate > hoje ? org.pago_ate : hoje

      const assinatura = await asaasFetch('/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          customer: customerId,
          billingType: 'UNDEFINED',
          value: valor,
          nextDueDate: vencimento,
          cycle: 'MONTHLY',
          description: 'Mensalidade — Clube Unido',
          externalReference: org.id,
        }),
      })
      await supabaseAdmin.from('organizacoes').update({ asaas_subscription_id: assinatura.id }).eq('id', org.id)

      // A criação da assinatura já gera a 1ª cobrança — busca ela pra pegar o link de pagamento.
      const primeiraCobranca = await asaasFetch(`/payments?subscription=${assinatura.id}&limit=1`)
      const pagamento = primeiraCobranca?.data?.[0]
      asaasChargeId = pagamento?.id
      linkPagamento = pagamento?.invoiceUrl
    }

    if (asaasChargeId) {
      await supabaseAdmin.from('cobrancas').upsert({
        org_id: org.id,
        asaas_charge_id: asaasChargeId,
        tipo,
        valor,
        status: 'pendente',
        vencimento,
        link_pagamento: linkPagamento,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'asaas_charge_id' })
    }

    return res.status(200).json({ ok: true, link: linkPagamento, cobrancaId: asaasChargeId || null })
  } catch (e) {
    console.error('asaas-cobranca falhou:', e.message)
    return res.status(502).json({ ok: false, error: e.message })
  }
}

// Eventos que disparam o processamento. O estado real da cobrança NÃO vem do
// corpo do evento: é consultado direto no Asaas (statusDaCobranca), então um
// evento forjado ou antigo nunca consegue marcar uma cobrança como paga.
const EVENTOS_DE_COBRANCA = new Set([
  'PAYMENT_CREATED', 'PAYMENT_UPDATED', 'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED',
  'PAYMENT_OVERDUE', 'PAYMENT_DELETED', 'PAYMENT_REFUNDED',
])

// Status da cobrança no Asaas -> status nosso. Status que não conhecemos
// (ou que não mudam nada pra gente) devolvem null e o evento é ignorado.
function statusDaCobranca(c) {
  if (c.deleted) return 'cancelado'
  switch (c.status) {
    case 'RECEIVED': case 'CONFIRMED': case 'RECEIVED_IN_CASH': return 'pago'
    case 'PENDING': case 'AWAITING_RISK_ANALYSIS': return 'pendente'
    case 'OVERDUE': return 'vencido'
    case 'REFUNDED': case 'CHARGEBACK_REQUESTED': case 'CHARGEBACK_DISPUTE': return 'cancelado'
    default: return null
  }
}

// Soma 1 mês a partir da maior data entre "hoje" e o pago_ate atual — assim
// quem paga em dia estende a partir do vencimento anterior, e quem paga
// atrasado (já bloqueado) estende a partir de hoje, não de uma data passada.
function proximoPagoAte(pagoAteAtual) {
  const hoje = hojeBR()
  const base = pagoAteAtual && pagoAteAtual > hoje ? pagoAteAtual : hoje
  const d = new Date(base + 'T12:00:00')
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().slice(0, 10)
}

// ── Recebe os eventos de pagamento que o Asaas dispara. Idempotente por
// asaas_charge_id — reprocessar o mesmo evento (Asaas reenvia se não
// receber 200) só regrava o mesmo estado, nunca duplica nem soma pago_ate
// duas vezes. Autenticação: Asaas manda o token configurado no header
// 'asaas-access-token'. Sem token configurado ou sem bater, recusa.
async function receberWebhook(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // O Asaas desta conta chega SEM o cabeçalho asaas-access-token (confirmado nos
  // logs: motivo=header_ausente). Então o segredo pode vir de 2 jeitos: no
  // cabeçalho (se um dia o Asaas passar a mandar) ou na própria URL do webhook
  // (…/api/asaas-webhook?token=SEGREDO). Mesmo valor de ASAAS_WEBHOOK_TOKEN.
  // trim: espaço ou quebra de linha sobrando ao colar não derruba a validação.
  const tokenEsperado = (process.env.ASAAS_WEBHOOK_TOKEN || '').trim()
  let tokenUrl = req.query?.token
  if (!tokenUrl) { try { tokenUrl = new URL(req.url, 'http://x').searchParams.get('token') } catch {} }
  const tokenHeader = String(req.headers['asaas-access-token'] || '').trim()
  const tokenRecebido = tokenHeader || String(tokenUrl || '').trim()
  if (!tokenEsperado || tokenRecebido !== tokenEsperado) {
    // Só o motivo e os tamanhos vão pro log — nunca o valor dos tokens.
    const motivo = !tokenEsperado ? 'token_nao_configurado_no_servidor' : !tokenRecebido ? 'token_ausente_no_header_e_na_url' : 'token_diferente'
    console.error(`asaas-webhook 401: motivo=${motivo} tamanho_esperado=${tokenEsperado.length} tamanho_recebido=${tokenRecebido.length}`)
    return res.status(401).json({ ok: false, error: 'Não autorizado' })
  }

  // O corpo pode chegar já como objeto, como texto ou como Buffer, dependendo do
  // Content-Type que o Asaas manda — normaliza antes de ler.
  let corpo = req.body
  if (Buffer.isBuffer(corpo)) corpo = corpo.toString('utf8')
  if (typeof corpo === 'string') { try { corpo = JSON.parse(corpo) } catch { corpo = null } }
  // Corpo form-urlencoded com o JSON inteiro na única chave, ou JSON embrulhado
  // em "data"/"payload": tenta recuperar o evento antes de desistir.
  if (corpo && typeof corpo === 'object' && !corpo.event) {
    const chaves = Object.keys(corpo)
    if (chaves.length === 1) { try { corpo = JSON.parse(chaves[0]) } catch {} }
    for (const campo of ['data', 'payload', 'body']) {
      let interno = corpo?.[campo]
      if (typeof interno === 'string') { try { interno = JSON.parse(interno) } catch {} }
      if (interno && typeof interno === 'object' && interno.event) { corpo = interno; break }
    }
  }
  const { event, payment: pagamentoDoEvento } = corpo || {}
  const ignorar = (motivo, extra = '') => {
    // Só nomes de campos e o Content-Type (nunca valores) — pra descobrir o formato real do corpo.
    const chaves = corpo && typeof corpo === 'object' ? Object.keys(corpo).slice(0, 8).map(k => k.slice(0, 40)).join('|') : '-'
    console.log(`asaas-webhook ignorado: motivo=${motivo} evento=${event} cobranca=${pagamentoDoEvento?.id} content_type=${req.headers['content-type']} chaves=${chaves} ${extra}`.trim())
    return res.status(200).json({ ok: true, ignorado: true })
  }
  if (!EVENTOS_DE_COBRANCA.has(event) || !pagamentoDoEvento?.id) {
    // Evento que não tratamos (ex: notas fiscais, boletos de terceiros) — só confirma o recebimento.
    return ignorar(!corpo ? 'corpo_ilegivel' : 'evento_nao_tratado', `tipo_corpo=${typeof req.body}`)
  }

  try {
    // Fonte da verdade: a cobrança no próprio Asaas (também traz as datas em
    // AAAA-MM-DD; o corpo do webhook manda DD/MM/AAAA).
    const payment = await asaasFetch(`/payments/${encodeURIComponent(pagamentoDoEvento.id)}`)
    const novoStatus = statusDaCobranca(payment)
    if (!novoStatus) return ignorar('status_desconhecido', `status_asaas=${payment.status}`)

    const eMensalidade = Boolean(payment.subscription)
    const consulta = eMensalidade
      ? supabaseAdmin.from('organizacoes').select('id, pago_ate').eq('asaas_subscription_id', payment.subscription)
      : supabaseAdmin.from('organizacoes').select('id, pago_ate').eq('asaas_customer_id', payment.customer)
    let { data: org, error: orgBuscaErr } = await consulta.maybeSingle()
    // Erro de banco não pode virar "ignorado": devolve 500 pro Asaas reenviar.
    if (orgBuscaErr) throw new Error('busca da organização: ' + orgBuscaErr.message)
    // Cobranças criadas por nós levam o id da organização em externalReference.
    if (!org && payment.externalReference) {
      const r = await supabaseAdmin.from('organizacoes').select('id, pago_ate').eq('id', payment.externalReference).maybeSingle()
      if (r.error) throw new Error('busca da organização: ' + r.error.message)
      org = r.data
    }
    if (!org) return ignorar('organizacao_nao_encontrada', `cliente=${payment.customer} assinatura=${payment.subscription || '-'}`)

    // Estado anterior desta cobrança — o Asaas reenvia eventos e, em cartão,
    // manda CONFIRMED e depois RECEIVED. Só a 1ª passagem pra "pago" estende o
    // acesso; repetição regrava o mesmo estado sem somar outro mês.
    const { data: anterior } = await supabaseAdmin
      .from('cobrancas').select('status, pago_em').eq('asaas_charge_id', payment.id).maybeSingle()
    const jaEstavaPaga = anterior?.status === 'pago'

    // Cobrança já paga nunca volta pra pendente/vencida por um evento atrasado
    // (ex: PAYMENT_UPDATED). Reembolso/exclusão (cancelado) continua valendo.
    const statusFinal = jaEstavaPaga && (novoStatus === 'pendente' || novoStatus === 'vencido') ? 'pago' : novoStatus

    // Estende o acesso ANTES de gravar a cobrança: se algo falhar no meio, o
    // Asaas reenvia e o pior caso é um mês a mais — nunca um cliente que pagou
    // e ficou sem acesso.
    if (statusFinal === 'pago' && eMensalidade && !jaEstavaPaga) {
      const { error: orgErr } = await supabaseAdmin.from('organizacoes').update({
        pago_ate: proximoPagoAte(org.pago_ate),
        assinatura_status: 'ativa',
      }).eq('id', org.id)
      if (orgErr) throw new Error(orgErr.message)
    }

    const { error: cobErr } = await supabaseAdmin.from('cobrancas').upsert({
      org_id: org.id,
      asaas_charge_id: payment.id,
      tipo: eMensalidade ? 'mensalidade' : 'configuracao_guiada',
      valor: payment.value,
      status: statusFinal,
      vencimento: payment.dueDate || null,
      pago_em: statusFinal === 'pago' ? (anterior?.pago_em || new Date().toISOString()) : null,
      link_pagamento: payment.invoiceUrl || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'asaas_charge_id' })
    if (cobErr) throw new Error(cobErr.message)

    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('asaas-webhook falhou:', e.message)
    // 500 (não 200) de propósito — erro nosso é transitório (ex: banco fora do
    // ar um instante), e o Asaas reenvia o mesmo evento em caso de falha. Um
    // 200 aqui faria perder o evento pra sempre.
    return res.status(500).json({ ok: false, error: e.message })
  }
}

// ── Pagamento dentro da tela: devolve o QR Code Pix (imagem + copia e cola) ou a
// linha digitável do boleto de uma cobrança em aberto, pra pessoa pagar sem sair
// do sistema. Autenticado como criarCobranca; só mexe em cobrança da própria
// organização e só quem tem acesso total (não dedicante de unidade). A chave do
// Asaas nunca vai pro navegador.
async function pagamentoNaTela(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!process.env.ASAAS_API_KEY) {
    return res.status(501).json({ ok: false, error: 'Pagamento online ainda não configurado. Fale com o suporte.' })
  }

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ ok: false, error: 'Não autenticado' })

  const { cobrancaId, forma } = req.body || {}
  if (!cobrancaId || !['PIX', 'BOLETO'].includes(forma)) {
    return res.status(400).json({ ok: false, error: 'Pedido inválido' })
  }

  try {
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userData?.user) return res.status(401).json({ ok: false, error: 'Sessão inválida' })

    const { data: membro } = await supabaseAdmin
      .from('org_members').select('org_id, role').eq('user_id', userData.user.id).limit(1).maybeSingle()
    if (!membro) return res.status(404).json({ ok: false, error: 'Organização não encontrada' })
    if (membro.role === 'dedicante_unidade') return res.status(403).json({ ok: false, error: 'Sem permissão' })

    const { data: cobranca } = await supabaseAdmin
      .from('cobrancas').select('asaas_charge_id, status, valor, vencimento, link_pagamento')
      .eq('asaas_charge_id', cobrancaId).eq('org_id', membro.org_id).maybeSingle()
    if (!cobranca) return res.status(404).json({ ok: false, error: 'Cobrança não encontrada' })
    if (!['pendente', 'vencido'].includes(cobranca.status)) {
      return res.status(400).json({ ok: false, error: 'Esta cobrança não está em aberto' })
    }

    const id = encodeURIComponent(cobranca.asaas_charge_id)
    const pay = await asaasFetch(`/payments/${id}`)
    if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(pay.status)) {
      return res.status(200).json({ ok: true, pago: true })
    }

    // Se o Asaas recusar a consulta nessa forma, fixa a forma na cobrança (só
    // essa cobrança, que continua em aberto) e tenta de novo.
    const comReparo = async (consulta) => {
      try { return await consulta() } catch (e1) {
        await asaasFetch(`/payments/${id}`, { method: 'PUT', body: JSON.stringify({ billingType: forma }) })
        return consulta()
      }
    }

    if (forma === 'PIX') {
      const qr = await comReparo(() => asaasFetch(`/payments/${id}/pixQrCode`))
      return res.status(200).json({
        ok: true, forma, encodedImage: qr.encodedImage, payload: qr.payload, expirationDate: qr.expirationDate || null,
        valor: pay.value, vencimento: pay.dueDate, link: cobranca.link_pagamento,
      })
    }

    const campo = await comReparo(() => asaasFetch(`/payments/${id}/identificationField`))
    const atual = await asaasFetch(`/payments/${id}`)
    return res.status(200).json({
      ok: true, forma, linhaDigitavel: campo.identificationField, codigoBarras: campo.barCode || null,
      boletoUrl: atual.bankSlipUrl || cobranca.link_pagamento,
      valor: pay.value, vencimento: pay.dueDate, link: cobranca.link_pagamento,
    })
  } catch (e) {
    console.error('asaas-pagamento falhou:', e.message)
    return res.status(502).json({ ok: false, error: e.message })
  }
}

export default async function handler(req, res) {
  if (req.query.mode === 'webhook') return receberWebhook(req, res)
  if (req.query.mode === 'pagamento') return pagamentoNaTela(req, res)
  return criarCobranca(req, res)
}
