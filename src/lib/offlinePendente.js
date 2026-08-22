// Guarda, no localStorage do aparelho, a última ação que falhou por falta de
// rede (nunca por erro de validação/servidor) — pra reenviar sozinho quando a
// conexão voltar. Não é fila: só 1 pendência por chave — pensado pros dois
// momentos "de rua" do sistema (checkout do catálogo, confirmação de entrega
// pelo representante), onde perder a tela por falta de sinal custa caro.

export const salvarPendente = (chave, payload) => {
  try { localStorage.setItem(chave, JSON.stringify({ payload, salvoEm: Date.now() })) } catch {}
}

export const lerPendente = (chave) => {
  try {
    const raw = localStorage.getItem(chave)
    return raw ? JSON.parse(raw).payload : null
  } catch { return null }
}

export const limparPendente = (chave) => {
  try { localStorage.removeItem(chave) } catch {}
}

// UUID pra idempotência de reenvio (evita duplicar registro se a 1ª tentativa
// chegou no servidor mas a resposta se perdeu por queda de conexão).
export const gerarId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
