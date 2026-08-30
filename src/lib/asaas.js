import { getSession } from './auth'
import { supabase } from './supabase'

// Cobranças da própria organização (RLS: is_org_member já libera a leitura).
export const listarCobrancas = async (orgId) => {
  if (!supabase) return []
  const { data } = await supabase.from('cobrancas').select('*').eq('org_id', orgId).order('created_at', { ascending: false })
  return data || []
}

// tipo: 'configuracao_guiada' | 'mensalidade'
// Retorna { ok, link } — link é a URL do Asaas (PIX/boleto/cartão) pra abrir.
export const criarCobranca = async (tipo) => {
  const session = await getSession()
  if (!session) return { ok: false, error: 'Sessão expirada — entre novamente' }

  try {
    const res = await fetch('/api/asaas-cobranca', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ tipo }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data?.error || 'Falha ao gerar cobrança' }
    return { ok: true, link: data.link }
  } catch {
    return { ok: false, error: 'Falha de conexão — tente novamente' }
  }
}
