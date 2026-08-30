// api/asaas-webhook.js — Vercel Serverless Function
// Recebe os eventos de pagamento que o Asaas dispara (configurado no painel
// deles, apontando pra essa URL). Idempotente por asaas_charge_id — reprocessar
// o mesmo evento (Asaas reenvia se não receber 200) só regrava o mesmo estado,
// nunca duplica nem soma pago_ate duas vezes.
//
// Autenticação: Asaas manda o token configurado no header 'asaas-access-token'.
// Sem token configurado ou sem bater, recusa — nunca processa webhook não autenticado.

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const STATUS_POR_EVENTO = {
  PAYMENT_CREATED: 'pendente',
  PAYMENT_UPDATED: 'pendente',
  PAYMENT_CONFIRMED: 'pago',
  PAYMENT_RECEIVED: 'pago',
  PAYMENT_OVERDUE: 'vencido',
  PAYMENT_DELETED: 'cancelado',
  PAYMENT_REFUNDED: 'cancelado',
}

// Soma 1 mês a partir da maior data entre "hoje" e o pago_ate atual — assim
// quem paga em dia estende a partir do vencimento anterior, e quem paga
// atrasado (já bloqueado) estende a partir de hoje, não de uma data passada.
function proximoPagoAte(pagoAteAtual) {
  const hoje = new Date().toISOString().slice(0, 10)
  const base = pagoAteAtual && pagoAteAtual > hoje ? pagoAteAtual : hoje
  const d = new Date(base + 'T12:00:00')
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().slice(0, 10)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const tokenEsperado = process.env.ASAAS_WEBHOOK_TOKEN
  const tokenRecebido = req.headers['asaas-access-token']
  if (!tokenEsperado || tokenRecebido !== tokenEsperado) {
    return res.status(401).json({ ok: false, error: 'Não autorizado' })
  }

  const { event, payment } = req.body || {}
  const novoStatus = STATUS_POR_EVENTO[event]
  if (!novoStatus || !payment?.id) {
    // Evento que não tratamos (ex: notas fiscais, boletos de terceiros) — só confirma o recebimento.
    return res.status(200).json({ ok: true, ignorado: true })
  }

  try {
    const eMensalidade = Boolean(payment.subscription)
    const { data: org } = eMensalidade
      ? await supabaseAdmin.from('organizacoes').select('id, pago_ate').eq('asaas_subscription_id', payment.subscription).maybeSingle()
      : await supabaseAdmin.from('organizacoes').select('id, pago_ate').eq('asaas_customer_id', payment.customer).maybeSingle()

    if (!org) return res.status(200).json({ ok: true, ignorado: true })

    await supabaseAdmin.from('cobrancas').upsert({
      org_id: org.id,
      asaas_charge_id: payment.id,
      tipo: eMensalidade ? 'mensalidade' : 'configuracao_guiada',
      valor: payment.value,
      status: novoStatus,
      vencimento: payment.dueDate || null,
      pago_em: novoStatus === 'pago' ? new Date().toISOString() : null,
      link_pagamento: payment.invoiceUrl || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'asaas_charge_id' })

    if (novoStatus === 'pago' && eMensalidade) {
      await supabaseAdmin.from('organizacoes').update({
        pago_ate: proximoPagoAte(org.pago_ate),
        assinatura_status: 'ativa',
      }).eq('id', org.id)
    }

    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('asaas-webhook falhou:', e.message)
    // 500 (não 200) de propósito — erro nosso é transitório (ex: banco fora do
    // ar um instante), e o Asaas reenvia o mesmo evento em caso de falha. Um
    // 200 aqui faria perder o evento pra sempre.
    return res.status(500).json({ ok: false, error: e.message })
  }
}
