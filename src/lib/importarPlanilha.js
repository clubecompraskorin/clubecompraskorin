/**
 * importarPlanilha.js — leitura da planilha oficial de preços da Korin
 * (a mesma que a Korin manda pra todo coordenador, formato "TABELA CLUBE DE
 * COMPRAS ... CIF"). Alternativa à importação por foto+IA: mais confiável
 * porque lê dados estruturados em vez de interpretar uma imagem, mas exige
 * que a planilha siga o layout oficial (colunas fixas por letra, não por
 * cabeçalho — o cabeçalho de coluna não se repete em todas as seções da
 * própria planilha da Korin).
 *
 * Lê por endereço de célula (B12, C12...) em vez de índice posicional de
 * array — o intervalo usado da planilha (`!ref`) começa na coluna B, então
 * um índice 0-based mudaria de coluna dependendo de como cada lib normaliza
 * isso. Endereço por letra não tem essa ambiguidade.
 */
import * as XLSX from 'xlsx'

// "PESO (KG)" (H) é fórmula que depende da QTDE pedida (0 numa planilha em
// branco) — quem carrega o peso real e fixo da caixa é "PESO CX" (I).
// "QTDE (CX)" (D) é a coluna que a Korin deixa em branco pra coordenadora
// preencher e devolver — é o que lemos quando a planilha é a que ELA enviou
// (com quantidade), não a tabela em branco (ver parseQtdeEnviada abaixo).
const COLS = { cod: 'B', nome: 'C', qtdeCaixa: 'D', custoCaixa: 'E', vendaUnidade: 'F', pesoCaixa: 'I', qtdPorCaixa: 'J' }

export const ehPlanilha = (file) =>
  /\.(xlsx|xls)$/i.test(file.name || '') ||
  file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
  file.type === 'application/vnd.ms-excel'

export async function parseTabelaKorin(file) {
  const buf = await file.arrayBuffer()
  const wb  = XLSX.read(buf, { type: 'array' })
  const ws  = wb.Sheets[wb.SheetNames[0]]
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1')

  let periodo = null
  const produtos = []

  for (let r = range.s.r; r <= range.e.r; r++) {
    const linha = r + 1 // número da linha na planilha (1-based)

    // "Vigência da Tabela" fica numa linha à parte, sem coluna fixa —
    // procura o rótulo na linha inteira e lê o valor logo ao lado.
    for (let c = range.s.c; c <= range.e.c; c++) {
      const v = ws[XLSX.utils.encode_cell({ r, c })]?.v
      if (typeof v === 'string' && v.toUpperCase().includes('VIGÊNCIA')) {
        const proximo = ws[XLSX.utils.encode_cell({ r, c: c + 1 })]?.v
        if (proximo) periodo = String(proximo).trim()
      }
    }

    // Linha de produto = tem código numérico. Título de seção, cabeçalho de
    // coluna, linha de subtotal (fórmula) e texto de instrução não têm —
    // é o único filtro que se mantém igual nas 3 seções da planilha.
    const cod = ws[`${COLS.cod}${linha}`]?.v
    if (typeof cod !== 'number' || !Number.isInteger(cod)) continue

    const nome = String(ws[`${COLS.nome}${linha}`]?.v || '').trim()
    const vendaUnidade = Number(ws[`${COLS.vendaUnidade}${linha}`]?.v)
    if (!nome || !vendaUnidade) continue

    const custoCaixa  = Number(ws[`${COLS.custoCaixa}${linha}`]?.v) || 0
    const pesoCaixa   = Number(ws[`${COLS.pesoCaixa}${linha}`]?.v) || 0
    const qtdPorCaixa = Number(ws[`${COLS.qtdPorCaixa}${linha}`]?.v) || 0
    const qtdeCaixa   = Number(ws[`${COLS.qtdeCaixa}${linha}`]?.v) || 0

    produtos.push({
      cod,
      nome: sugerirNomeAmigavel(nome, derivarUnidade(pesoCaixa, qtdPorCaixa, nome)),
      nomeOriginalKorin: nome,
      preco:      vendaUnidade,
      precoCusto: qtdPorCaixa > 0 ? Number((custoCaixa / qtdPorCaixa).toFixed(4)) : null,
      qtdCaixa:   qtdPorCaixa || 0,
      unidade:    derivarUnidade(pesoCaixa, qtdPorCaixa, nome),
      // Só tem valor quando a planilha lida é a que a coordenadora preencheu
      // e enviou pra Korin (QTDE (CX)) — 0 na tabela em branco, ignorado
      // pela importação normal de catálogo.
      qtdeEnviada: qtdeCaixa,
    })
  }

  return { periodo, produtos }
}

// Remove jargão de logística que só interessa pra Korin/Dedicante, não pro
// membro (CONG=congelado, PCT=pacote, CX=caixa, "C/17KG C/17 PCT"=descrição
// de embalagem) e troca pelo peso real da unidade, que o sistema já calcula
// à parte (derivarUnidade). Ex.: "COXA NGMO CONG PCT CX C/17KG C/17 PCT" ->
// "COXA NGMO 1KG". É uma SUGESTÃO — mostrada editável na tela de revisão do
// import, nunca aplicada sem a Dedicante ver antes de confirmar. Produto com
// nome fora do padrão (ex: contagem em unidades, não peso) pode sair
// estranho — ela ajusta manualmente nesse caso.
const PADRAO_EMBALAGEM = /C\/\s*\d+(?:[.,]\d+)?\s*KG(?:\s*C\/\s*\d+\s*PCT)?/gi
const JARGAO_LOGISTICA = /\b(CONG|PCT|CX)\b/gi

export function sugerirNomeAmigavel(nomeCru, unidade) {
  let limpo = nomeCru
    .replace(PADRAO_EMBALAGEM, '')
    .replace(JARGAO_LOGISTICA, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  if (unidade && !limpo.toUpperCase().includes(unidade.toUpperCase())) {
    limpo = `${limpo} ${unidade.toUpperCase()}`
  }
  return limpo || nomeCru
}

// Prioriza peso-real da caixa ÷ qtd-por-caixa sobre extrair da descrição — o
// texto às vezes cita o peso da caixa inteira ("CX C/17KG"), não da unidade,
// e daria leitura errada. Limitação conhecida: produto líquido (ex: mel,
// própolis em ml) fica expresso em gramas porque a coluna de peso da Korin é
// sempre kg — cosmético, não afeta preço/quantidade.
function derivarUnidade(pesoCaixa, qtdPorCaixa, nome) {
  if (pesoCaixa > 0 && qtdPorCaixa > 0) {
    const porUnidade = pesoCaixa / qtdPorCaixa
    return porUnidade >= 1
      ? `${Number(porUnidade.toFixed(2))}kg`
      : `${Math.round(porUnidade * 1000)}g`
  }
  const m = nome.match(/(\d+[.,]?\d*)\s?(KG|G|ML|L)\b(?!.*\d+[.,]?\d*\s?(?:KG|G|ML|L)\b)/i)
  return m ? `${m[1].replace(',', '.')}${m[2].toLowerCase()}` : ''
}
