// api/asaas-cobranca.js — Vercel Serverless Function
// Cria (ou reaproveita) o cliente da organização no Asaas e gera uma cobrança
// avulsa (Configuração Guiada) ou uma assinatura recorrente (Mensalidade).
// Chamado autenticado do painel — o Dedicante já está logado no Supabase, o
// client manda o access_token da própria sessão no header Authorization.
//
// Nunca expõe ASAAS_API_KEY ao cliente — fica só aqui, do lado do servidor,
// igual já é feito com SUPABASE_SERVICE_ROLE_KEY em api/pedido.js.

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

export default async function handler(req, res) {
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

    if (tipo === 'mensalidade' && org.assinatura_status === 'ativa') {
      return res.status(400).json({ ok: false, error: 'Você já tem uma assinatura ativa' })
    }

    // Cria (ou reaproveita) o cliente no Asaas
    let customerId = org.asaas_customer_id
    if (!customerId) {
      const cliente = await asaasFetch('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: org.responsavel_nome || org.nome,
          cpfCnpj: soDigitos(org.documento),
          externalReference: org.id,
        }),
      })
      customerId = cliente.id
      await supabaseAdmin.from('organizacoes').update({ asaas_customer_id: customerId }).eq('id', org.id)
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
      vencimento = daquiA3DiasISO()

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

    return res.status(200).json({ ok: true, link: linkPagamento })
  } catch (e) {
    console.error('asaas-cobranca falhou:', e.message)
    return res.status(502).json({ ok: false, error: e.message })
  }
}
