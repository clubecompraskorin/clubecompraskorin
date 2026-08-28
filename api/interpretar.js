// api/interpretar.js — Vercel Serverless Function
// A chave fica só no servidor, nunca exposta no frontend

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { texto, catalogo } = req.body
  if (!texto) return res.status(400).json({ error: 'texto obrigatório' })

  // catalogo (opcional): [{ cod, nome, unidade }] do período atual — sem
  // isso, a IA só reconhece código explícito (comportamento antigo). Com
  // isso, ela também casa item descrito por nome com o produto do catálogo.
  const listaCatalogo = Array.isArray(catalogo) && catalogo.length
    ? catalogo.map(p => `${p.cod}: ${p.nome}${p.unidade ? ` (${p.unidade})` : ''}`).join('\n')
    : ''

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: `Você interpreta mensagens de pedidos do WhatsApp do Clube Korin.
Extraia: nome do cliente (se houver) e itens (código + quantidade).
Responda SOMENTE JSON válido, sem texto, sem markdown:
{"nome":"Nome ou null","itens":[{"cod":9,"qty":2}]}

Como identificar o código de cada item, nessa ordem:
1. Número explícito na linha, com ou sem a palavra "cod"/"código" na frente
   — "cod 1423 20 unidades" e "1423 20 unidades" significam a MESMA coisa:
   o número isolado no início da linha É o código, não é quantidade.
2. Sem nenhum número, o membro descreveu o produto por nome (ex: "01 pacote
   de carne moída", "quero 2 bandejas de ovos") — combine com a lista de
   produtos do catálogo abaixo (nome, sinônimo comum, singular/plural) e use
   o código do produto que mais bate. Só casa quando tiver confiança
   razoável; sem certeza, ignore a linha em vez de inventar um código.
${listaCatalogo ? `\nCatálogo disponível (código: nome):\n${listaCatalogo}\n` : ''}
Ignore textos irrelevantes. Quantidade mínima é 1.`,
        messages: [{ role: 'user', content: texto }]
      })
    })

    const data = await response.json()
    res.status(200).json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
