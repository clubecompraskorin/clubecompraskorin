export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { produtos } = req.body
  if (!Array.isArray(produtos) || produtos.length === 0) {
    return res.status(400).json({ erro: 'Lista de produtos vazia' })
  }

  try {
    const lista = produtos.map(p => `${p.cod}: ${p.nome}`).join('\n')
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Classifique cada produto do Clube de Compras Korin abaixo em UMA destas categorias: "Frangos 1kg", "Frangos 600g", "Diferenciados", "Mercearia", "Ovos", "Peixes".

Regras:
- "Frangos 1kg": cortes de frango vendidos em pacote/embalagem de ~1kg
- "Frangos 600g": cortes de frango vendidos em bandeja de ~600g
- "Diferenciados": carne bovina, carne moída, espetinho, linguiça, hambúrguer e similares
- "Mercearia": arroz, feijão, café, mel, própolis, farinha, milho e similares (não é carne nem peixe)
- "Ovos": ovos
- "Peixes": peixes e frutos do mar (truta, tilápia e similares)

Produtos (código: nome):
${lista}

Retorne APENAS um JSON no formato {"<cod>": "<categoria>"}, uma entrada por produto, sem texto adicional, sem markdown.`
        }]
      })
    })

    const data = await response.json()
    const text = data.content?.[0]?.text?.trim() || '{}'
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const categorias = JSON.parse(clean)

    res.json({ categorias })
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao classificar categorias', detalhe: e.message })
  }
}
