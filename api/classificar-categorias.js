// api/classificar-categorias.js — Vercel Serverless Function (Claude Haiku, só texto).
// Dois usos, dispatch por `acao` no body (sem `acao` = categorias, comportamento
// original preservado) — consolidado no mesmo arquivo pelo limite de 12 funções
// do plano Hobby do Vercel (ver vercel.json e histórico de consolidação):
//   'categorias'      (padrão) -> classifica produto em categoria fixa do catálogo
//   'mapear-colunas'  -> identifica qual coluna é qual campo numa planilha de
//                        layout desconhecido (coordenadora que não usa a tabela
//                        oficial da Korin, tem o próprio modelo)

async function chamarHaiku(prompt, maxTokens) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  })
  const data = await response.json()
  const text = data.content?.[0]?.text?.trim() || ''
  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
}

async function classificarCategorias(req, res) {
  const { produtos } = req.body
  if (!Array.isArray(produtos) || produtos.length === 0) {
    return res.status(400).json({ erro: 'Lista de produtos vazia' })
  }
  try {
    const lista = produtos.map(p => `${p.cod}: ${p.nome}`).join('\n')
    const clean = await chamarHaiku(`Classifique cada produto do Clube de Compras Korin abaixo em UMA destas categorias: "Frangos 1kg", "Frangos 600g", "Diferenciados", "Mercearia", "Ovos", "Peixes".

Regras:
- "Frangos 1kg": cortes de frango vendidos em pacote/embalagem de ~1kg
- "Frangos 600g": cortes de frango vendidos em bandeja de ~600g
- "Diferenciados": carne bovina, carne moída, espetinho, linguiça, hambúrguer e similares
- "Mercearia": arroz, feijão, café, mel, própolis, farinha, milho e similares (não é carne nem peixe)
- "Ovos": ovos
- "Peixes": peixes e frutos do mar (truta, tilápia e similares)

Produtos (código: nome):
${lista}

Retorne APENAS um JSON no formato {"<cod>": "<categoria>"}, uma entrada por produto, sem texto adicional, sem markdown.`, 2000)
    res.json({ categorias: JSON.parse(clean || '{}') })
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao classificar categorias', detalhe: e.message })
  }
}

// `linhas`: matriz (array de arrays de string) com uma amostra das primeiras
// linhas da planilha, exatamente como está na célula — inclui título, linha em
// branco, cabeçalho de verdade, e algumas linhas de produto, tudo junto. É a
// IA quem acha o cabeçalho e decide a coluna de cada campo, não o código.
async function mapearColunas(req, res) {
  const { linhas } = req.body
  if (!Array.isArray(linhas) || linhas.length === 0) {
    return res.status(400).json({ erro: 'Amostra da planilha vazia' })
  }
  try {
    const grade = linhas.map((l, i) => `Linha ${i + 1}: ${JSON.stringify(l)}`).join('\n')
    const clean = await chamarHaiku(`Esta é uma amostra de uma planilha de pedido de um Clube de Compras (coordenadora fez o próprio modelo, não é a tabela oficial do fornecedor). Cada célula da linha está na ordem das colunas, começando pela coluna A.

Amostra (uma linha de cada vez):
${grade}

Identifique em qual COLUNA (letra, A/B/C/...) está cada um destes campos, olhando o cabeçalho e o formato dos dados nas linhas seguintes:
- cod: código numérico do produto (inteiro, geralmente 3 a 6 dígitos)
- nome: nome/descrição do produto
- unidade: unidade de venda (texto, ex: "kilo", "600 g", "Cartela", "un")
- qtdCaixa: quantidade por caixa/embalagem (número)
- preco: preço unitário de venda (número, geralmente o maior valor monetário coerente por linha)

Se não conseguir identificar uma coluna com confiança, não inclua essa chave no resultado. Retorne APENAS um JSON no formato {"cod":"B","nome":"C","unidade":"D","qtdCaixa":"E","preco":"F"}, sem texto adicional, sem markdown.`, 500)
    res.json({ colunas: JSON.parse(clean || '{}') })
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao mapear colunas', detalhe: e.message })
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    if (req.body?.acao === 'mapear-colunas') return await mapearColunas(req, res)
    return await classificarCategorias(req, res)
  } catch (e) {
    res.status(500).json({ erro: 'Erro no processamento', detalhe: e.message })
  }
}
