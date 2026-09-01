import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { toast } from './lib/dialog'

// Card de export "Planilha pra Korin" (soma as unidades marcadas numa aba só,
// ou uma aba por unidade) — compartilhado entre Config → Relatórios (Dedicante
// com acesso total, produtos já vêm com precoCusto) e Fechamento do Dedicante
// de unidade (produtos chegam com precoCusto sempre null, por RLS em
// periodo_produtos_custo — então a planilha dele já sai sem custo sozinha,
// e pedidos já chegam filtrados só da(s) unidade(s) dele por
// pode_ver_pedido_unidade).
export default function PlanilhaKorinCard({ produtos, pedidos, periodo, unidades }) {
  const [unidadesExport, setUnidadesExport] = useState(new Set(unidades))
  useEffect(() => { setUnidadesExport(new Set(unidades)) }, [unidades.join('|')])

  const toggleUnidadeExport = (u) => {
    setUnidadesExport(prev => {
      const next = new Set(prev)
      if (next.has(u)) next.delete(u); else next.add(u)
      return next
    })
  }

  const montarLinhasExport = (pedidosDoGrupo) => {
    const mp = {}
    pedidosDoGrupo.forEach(p => {
      p.itens.forEach(it => {
        const prod = produtos.find(x => x.id === it.produtoId)
        if (!prod) return
        if (!mp[prod.cod]) mp[prod.cod] = { cod: prod.cod, nome: prod.nome, qty: 0, precoCusto: prod.precoCusto ?? null, preco: prod.preco ?? null, qtdCaixa: prod.qtdCaixa > 0 ? prod.qtdCaixa : null }
        mp[prod.cod].qty += Number(it.qty)
      })
    })
    return Object.values(mp).sort((a, b) => a.cod - b.cod).map(item => {
      const qtdCaixa  = item.qtdCaixa
      const caixas    = qtdCaixa ? Math.ceil(item.qty / qtdCaixa) : null
      const qtdCompra = qtdCaixa ? caixas * qtdCaixa : item.qty
      const temCusto  = item.precoCusto != null
      const temVenda  = item.preco != null
      return {
        'Cód':                  item.cod,
        'Descrição':            item.nome,
        'Qtd. Pedida':          item.qty,
        'Qtd./Embalagem':       qtdCaixa ?? '',
        'Embalagens p/ Korin':  caixas ?? '',
        'Preço Unit. Custo':    temCusto ? item.precoCusto : '',
        'Preço Total Custo':    temCusto ? Number((qtdCompra * item.precoCusto).toFixed(2)) : '',
        'Preço Unit. Venda':    temVenda ? item.preco : '',
        'Preço Total Venda':    temVenda ? Number((item.qty * item.preco).toFixed(2)) : '',
      }
    })
  }
  const colsExport = [{wch:6},{wch:35},{wch:11},{wch:14},{wch:16},{wch:14},{wch:15},{wch:14},{wch:15}]

  const exportarSeparado = () => {
    if (unidadesExport.size === 0) { toast('Selecione ao menos uma unidade'); return }
    const wb = XLSX.utils.book_new()
    let abasGeradas = 0
    unidades.filter(u => unidadesExport.has(u)).forEach(u => {
      const pedidosUnidade = pedidos.filter(p => (p.unidade || 'Não informada') === u)
      const rows = montarLinhasExport(pedidosUnidade)
      if (rows.length === 0) return
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = colsExport
      XLSX.utils.book_append_sheet(wb, ws, u.slice(0, 31))
      abasGeradas++
    })
    if (abasGeradas === 0) { toast('Nenhum pedido encontrado para as unidades selecionadas'); return }
    XLSX.writeFile(wb, `pedido-korin-${periodo.replace('/','-')}.xlsx`)
  }

  const exportarConsolidado = () => {
    if (unidadesExport.size === 0) { toast('Selecione ao menos uma unidade'); return }
    const pedidosDoGrupo = pedidos.filter(p => unidadesExport.has(p.unidade || 'Não informada'))
    const rows = montarLinhasExport(pedidosDoGrupo)
    if (rows.length === 0) { toast('Nenhum pedido encontrado para as unidades selecionadas'); return }
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = colsExport
    XLSX.utils.book_append_sheet(wb, ws, 'Consolidado')
    XLSX.writeFile(wb, `pedido-korin-consolidado-${periodo.replace('/','-')}.xlsx`)
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm space-y-3">
      <div className="text-sm font-black text-stone-700">📊 Planilha pra Korin</div>
      <div className="flex items-center justify-between">
        <div className="text-xs font-black text-stone-500 uppercase tracking-widest">Unidades na exportação</div>
        <button onClick={() => setUnidadesExport(unidadesExport.size === unidades.length ? new Set() : new Set(unidades))}
          className="text-xs font-bold text-green-700">
          {unidadesExport.size === unidades.length ? 'Limpar' : 'Selecionar todas'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {unidades.map(u => (
          <button key={u} onClick={() => toggleUnidadeExport(u)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-colors ${unidadesExport.has(u) ? 'bg-green-700 text-white border-green-700' : 'bg-white text-stone-500 border-stone-200'}`}>
            {u}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2">
        <button onClick={exportarConsolidado}
          className="w-full py-3.5 bg-green-700 text-white rounded-xl font-black text-sm active:bg-green-800">
          📦 Pedido único (soma as unidades marcadas)
        </button>
        <button onClick={exportarSeparado}
          className="w-full py-3.5 bg-white text-green-700 border-2 border-green-700 rounded-xl font-black text-sm active:bg-green-50">
          📄 Separado por unidade (uma aba cada)
        </button>
      </div>
    </div>
  )
}
