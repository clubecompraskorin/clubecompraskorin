export const fmt = (v) =>
  'R$ ' + Number(v).toFixed(2).replace('.', ',')

export const calcTotal = (pedido, produtos) =>
  pedido.itens.reduce((s, it) => {
    const p = produtos.find(x => x.id === it.produtoId)
    return s + (p ? p.preco * it.qty : 0)
  }, 0)

export const sortByCod = (itens, produtos) =>
  [...itens].sort((a, b) => {
    const pa = produtos.find(x => x.id === a.produtoId)
    const pb = produtos.find(x => x.id === b.produtoId)
    return (pa?.cod || 0) - (pb?.cod || 0)
  })

// Estoque real de um produto no período — usado em qualquer tela que precise
// saber "quanto ainda dá pra vender": aba Estoque, cadastro de Produtos e
// PDV, pro mesmo produto valer o mesmo saldo em qualquer canal.
//
// Só retorna "nada" quando não existe NENHUMA informação física real (nem
// compra confirmada este mês, nem sobra do mês anterior) — sobra sozinha já
// é estoque físico na mão dela, então já deve aparecer, mesmo antes de
// confirmar a compra do mês corrente (ver alertaCaixa pra fase anterior a
// isso). `totalPedido` soma pedido de qualquer origem/status não cancelado
// (catálogo, WhatsApp, manual, PDV); `totalEntregue` é o mesmo filtrado só
// pra status='entregue' (PDV já nasce como 'entregue', venda na hora).
// `compraConfirmada` é a soma do histórico de compras desse produto (ver
// getComprasConfirmadas em lib/periodos.js), incluindo ajustes negativos.
export const calcEstoque = (produto, totalPedido, sobra = 0, compraConfirmada = null, totalEntregue = 0) => {
  if (compraConfirmada == null && !sobra) return { disponivel: null, restante: null, entregue: 0, reservado: 0 }
  const disponivel = (compraConfirmada ?? 0) + sobra
  return {
    disponivel,
    restante: disponivel - totalPedido,
    entregue: totalEntregue,
    reservado: Math.max(0, totalPedido - totalEntregue),
  }
}

// Alerta pré-compra: enquanto a compra ainda não foi confirmada, ajuda a
// Dedicante a decidir se compra caixa fechada extra ou atende só o que a
// caixa já cobre — a Korin só vende caixa fechada, então sobra ou falta é
// inevitável quando a demanda não é múltiplo exato da caixa. Não trava
// nada, é só leitura; ela decide fora do sistema.
export const alertaCaixa = (produto, totalPedido) => {
  const qtdCaixa = produto.qtdCaixa || 0
  if (!qtdCaixa || !totalPedido) return null
  const caixasCheias = Math.floor(totalPedido / qtdCaixa)
  const foraDaCaixa = totalPedido - caixasCheias * qtdCaixa
  if (foraDaCaixa === 0) return null // demanda já é múltiplo exato da caixa — nada a decidir
  return {
    caixasCheias,
    atendidos: caixasCheias * qtdCaixa,
    foraDaCaixa,
    faltamPraFecharMais: qtdCaixa - foraDaCaixa,
  }
}
