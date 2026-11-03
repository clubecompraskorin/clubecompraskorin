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

// ── Leitura da planilha JÁ PREENCHIDA e enviada à Korin (QTDE (CX)) ──────────
// Usada só pelo "Confirmar o que foi realmente comprado". Separada de
// parseTabelaKorin de propósito: aquela serve ao import de catálogo (que
// exige preço de venda e código numérico puro) e não pode mudar. Aqui o que
// importa é só código + quantidade, então é bem mais tolerante com planilha
// que passou por Excel/Google Sheets/WhatsApp e voltou "mexida":
//  - código como texto ("1423"), quantidade como texto ("5", "5 cx", "2,5");
//  - linha sem preço de venda (produto que não saiu na venda) não é descartada;
//  - procura o cabeçalho "QTDE (CX)" e usa a coluna dele; sem cabeçalho, cai na D;
//  - varre todas as abas, não só a primeira.
// Também devolve um diagnóstico, pra mensagem de erro dizer o que de fato foi
// lido em vez de um genérico "nenhuma quantidade".
const semAcento = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()

function celulaTexto(ws, addr) {
  const c = ws[addr]
  if (!c) return undefined
  return c.v !== undefined && c.v !== null ? c.v : c.w
}

function numeroTolerante(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (typeof v !== 'string') return 0
  const m = v.trim().replace(/\s+/g, '').match(/^-?\d+(?:[.,]\d+)?/)
  return m ? Number(m[0].replace(',', '.')) : 0
}

function codigoTolerante(v) {
  if (typeof v === 'number') return Number.isInteger(v) && v > 0 ? v : null
  if (typeof v === 'string' && /^\s*\d+\s*$/.test(v)) return Number(v)
  return null
}

export async function parseQtdeEnviada(file) {
  const buf = await file.arrayBuffer()
  const wb  = XLSX.read(buf, { type: 'array' })
  const produtos = []
  const diag = { abas: wb.SheetNames.length, linhasComCodigo: 0, colunaQtde: null, cabecalhoAchado: false, amostraQtde: [] }

  for (const nomeAba of wb.SheetNames) {
    const ws = wb.Sheets[nomeAba]
    if (!ws || !ws['!ref']) continue
    const range = XLSX.utils.decode_range(ws['!ref'])

    // Coluna da quantidade: a do cabeçalho "QTDE (CX)", senão a D.
    let colQtde = COLS.qtdeCaixa
    let achouCab = false
    busca: for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const v = ws[XLSX.utils.encode_cell({ r, c })]?.v
        if (typeof v === 'string' && /^QTDE\b/.test(semAcento(v).trim()) && /CX/.test(semAcento(v))) {
          colQtde = XLSX.utils.encode_col(c)
          achouCab = true
          break busca
        }
      }
    }
    if (diag.colunaQtde === null || achouCab) { diag.colunaQtde = colQtde; diag.cabecalhoAchado = achouCab }

    for (let r = range.s.r; r <= range.e.r; r++) {
      const linha = r + 1
      const cod = codigoTolerante(celulaTexto(ws, `${COLS.cod}${linha}`))
      if (cod === null) continue
      const nome = String(celulaTexto(ws, `${COLS.nome}${linha}`) || '').trim()
      if (!nome) continue
      diag.linhasComCodigo++

      const bruto = celulaTexto(ws, `${colQtde}${linha}`)
      if (bruto !== undefined && bruto !== '' && diag.amostraQtde.length < 3) diag.amostraQtde.push(`${cod}: ${JSON.stringify(bruto)}`)
      const qtdeEnviada = numeroTolerante(bruto)

      produtos.push({
        cod,
        nome,
        qtdCaixa: Number(celulaTexto(ws, `${COLS.qtdPorCaixa}${linha}`)) || 0,
        qtdeEnviada,
      })
    }
  }

  return { produtos, diag }
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
