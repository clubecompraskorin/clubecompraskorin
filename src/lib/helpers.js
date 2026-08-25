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
// saber "quanto ainda dá pra vender": aba Estoque e PDV, pro mesmo produto
// valer o mesmo saldo em qualquer canal. Prioriza a soma das compras
// confirmadas (histórico real, uma ou mais — ver getComprasConfirmadas em
// lib/periodos.js) sobre a estimativa de caixas abertas — a partir da
// primeira confirmação, é esse número que manda, não mais a estimativa.
// `totalPedido` já deve somar pedido de qualquer origem/unidade (catálogo,
// WhatsApp, manual, PDV). `compraConfirmada` é a soma das linhas do
// histórico pra esse produto, ou null se nenhuma ainda.
export const calcEstoque = (produto, totalPedido, sobra = 0, compraConfirmada = null) => {
  const base = compraConfirmada != null
    ? compraConfirmada
    : (produto.qtdCaixa ? (produto.caixasAbertas || 0) * produto.qtdCaixa : null)
  if (base == null) return { disponivel: null, restante: null }
  const disponivel = base + sobra
  return { disponivel, restante: disponivel - totalPedido }
}
