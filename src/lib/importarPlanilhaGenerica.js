/**
 * importarPlanilhaGenerica.js — leitura de planilha de layout desconhecido
 * (coordenadora que faz o próprio modelo, em vez de usar a tabela oficial da
 * Korin como ela vem — comum porque a tabela oficial trava a célula de preço
 * de venda, e a coordenadora precisa cobrar diferente do membro).
 *
 * Fallback do `importarPlanilha.js`: só entra em cena quando `parseTabelaKorin`
 * não reconhece nenhum produto (layout não é o oficial). Em vez de colunas
 * fixas por letra, pede pra IA (mesmo endpoint que já classifica categoria)
 * olhar uma amostra da planilha e dizer qual coluna é qual campo — a extração
 * em si continua determinística, só o mapeamento de coluna é assistido.
 *
 * Nunca traz custo (`precoCusto` sempre null) — planilha caseira não tem
 * coluna de custo separada da venda. Quem chama decide como preencher isso
 * (ver `buscarCustoPeriodoAnterior` em lib/periodos.js).
 */
import * as XLSX from 'xlsx'
import { sugerirNomeAmigavel } from './importarPlanilha'

const CAMPOS_OBRIGATORIOS = ['cod', 'nome', 'preco']
const MAX_LINHAS_AMOSTRA = 25

async function mapearColunasComIA(ws, range) {
  const linhas = []
  for (let r = range.s.r; r <= Math.min(range.e.r, range.s.r + MAX_LINHAS_AMOSTRA - 1); r++) {
    const linha = []
    for (let c = range.s.c; c <= range.e.c; c++) {
      const v = ws[XLSX.utils.encode_cell({ r, c })]?.v
      linha.push(v == null ? '' : String(v))
    }
    linhas.push(linha)
  }

  const res = await fetch('/api/classificar-categorias', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acao: 'mapear-colunas', linhas }),
  })
  const data = await res.json()
  const colunas = data.colunas || {}
  const faltando = CAMPOS_OBRIGATORIOS.filter(c => !colunas[c])
  if (faltando.length) return null
  return colunas
}

// Mesmo rótulo usado no parser oficial ("VIGÊNCIA") mais "MÊS", que é o rótulo
// visto em planilhas caseiras de coordenadora (ex: "MÊS: SETEMBRO / 2026").
function detectarPeriodo(ws, range) {
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const v = ws[XLSX.utils.encode_cell({ r, c })]?.v
      if (typeof v === 'string' && /VIGÊNCIA|^MÊS$/i.test(v.trim().toUpperCase())) {
        const proximo = ws[XLSX.utils.encode_cell({ r, c: c + 1 })]?.v
        if (proximo) return String(proximo).trim()
      }
    }
  }
  return null
}

export async function parsePlanilhaGenerica(file) {
  const buf = await file.arrayBuffer()
  const wb  = XLSX.read(buf, { type: 'array' })
  const ws  = wb.Sheets[wb.SheetNames[0]]
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1')

  const colunas = await mapearColunasComIA(ws, range)
  if (!colunas) return { periodo: null, produtos: [], erro: 'Não consegui identificar as colunas desta planilha automaticamente. Confira se ela tem código, nome, unidade e preço em colunas separadas.' }

  const periodo = detectarPeriodo(ws, range)
  const produtos = []

  for (let r = range.s.r; r <= range.e.r; r++) {
    const linha = r + 1
    const cod = ws[`${colunas.cod}${linha}`]?.v
    if (typeof cod !== 'number' || !Number.isInteger(cod)) continue

    const nomeCru = String(ws[`${colunas.nome}${linha}`]?.v || '').trim()
    const preco = Number(ws[`${colunas.preco}${linha}`]?.v)
    if (!nomeCru || !preco) continue

    const unidade = colunas.unidade ? String(ws[`${colunas.unidade}${linha}`]?.v || '').trim() : ''
    const qtdCaixa = colunas.qtdCaixa ? Number(ws[`${colunas.qtdCaixa}${linha}`]?.v) || 0 : 0

    produtos.push({
      cod,
      nome: sugerirNomeAmigavel(nomeCru, unidade),
      nomeOriginalKorin: nomeCru,
      preco,
      precoCusto: null,
      qtdCaixa,
      unidade,
      qtdeEnviada: 0,
    })
  }

  return { periodo, produtos, erro: produtos.length ? null : 'Nenhum produto reconhecido nesta planilha.' }
}
