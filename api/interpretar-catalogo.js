export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { imagemBase64, mimeType = 'image/jpeg' } = req.body
  if (!imagemBase64) return res.status(400).json({ erro: 'Imagem não enviada' })

  try {
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
          content: [
            {
              type:   'image',
              source: { type: 'base64', media_type: mimeType, data: imagemBase64 }
            },
            {
              type: 'text',
              text: `Analise esta tabela de produtos do Clube de Compras Korin.

Retorne APENAS um JSON no formato abaixo, sem texto adicional, sem markdown:
{
  "periodo": "MAIO/2026",
  "produtos": [
    {"cod": 1, "nome": "COXA S/TRANSG CONG", "unidade": "Pacote 1kg", "preco": 12.00, "categoria": "Frangos 1kg"}
  ]
}

Regras:
- "periodo": mês e ano encontrado no cabeçalho da tabela (ex: "MAIO/2026"). Se não encontrar, use null.
- Categorias: "Frangos 1kg", "Frangos 600g", "Diferenciados", "Mercearia", "Ovos"
- "Frangos 1kg": frangos em pacote 1kg
- "Frangos 600g": frangos em bandeja 600gr
- "Diferenciados": carne moída, espetinho, linguiça e similares
- "Mercearia": arroz, feijão, mel, própolis e similares
- "Ovos": ovos

Retorne APENAS o JSON, sem texto adicional.`
            }
          ]
        }]
      })
    })

    const data = await response.json()
    const text = data.content?.[0]?.text?.trim() || '{}'
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(clean)

    res.json({
      periodo:  result.periodo  || null,
      produtos: result.produtos || [],
      total:    (result.produtos || []).length
    })
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao interpretar a imagem', detalhe: e.message })
  }
}
