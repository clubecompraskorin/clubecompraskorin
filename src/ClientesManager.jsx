import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { listarClientes, criarClienteManual, atualizarCliente, excluirCliente } from './lib/clientes'
import { toast, confirmar } from './lib/dialog'

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-black text-stone-500 uppercase tracking-widest mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-base font-semibold text-stone-800 placeholder-stone-400 focus:outline-none focus:border-green-600"

function FormCliente({ editando, unidadesNomes, onSalvou, onCancelar }) {
  const [nome, setNome] = useState(editando?.nome || '')
  const [telefone, setTelefone] = useState(editando?.telefone || '')
  const [unidade, setUnidade] = useState(editando?.unidade || '')
  const [salvando, setSalvando] = useState(false)

  const salvar = async () => {
    setSalvando(true)
    try {
      if (editando?.id) {
        await atualizarCliente(editando.id, { nome, telefone, unidade })
      } else {
        await criarClienteManual(editando?.orgId, { nome, telefone, unidade })
      }
      onSalvou()
    } catch (e) {
      toast(e.message || 'Erro ao salvar cliente')
    }
    setSalvando(false)
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3 border-2 border-green-600">
      <Field label="Nome do cliente">
        <input className={inputCls} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Maria Aparecida" autoFocus />
      </Field>
      <Field label="Telefone">
        <input className={inputCls} value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="Ex: (11) 98888-7777" />
      </Field>
      <Field label="Unidade (opcional)">
        <select className={inputCls} value={unidade} onChange={e => setUnidade(e.target.value)}>
          <option value="">Sem unidade definida</option>
          {unidadesNomes.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </Field>
      <div className="flex gap-2 pt-1">
        <button onClick={onCancelar} className="flex-1 py-3 rounded-xl font-bold text-stone-500 active:bg-stone-100">Cancelar</button>
        <button onClick={salvar} disabled={salvando} className="flex-1 py-3 bg-green-700 text-white rounded-xl font-black active:bg-green-800 disabled:opacity-50">
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

export default function ClientesManager({ orgId, unidadesNomes = [] }) {
  const [clientes, setClientes] = useState(null) // null = carregando
  const [busca, setBusca] = useState('')
  const [editandoId, setEditandoId] = useState(null) // 'novo' | id | null

  const recarregar = () => listarClientes(orgId).then(setClientes)
  useEffect(() => { recarregar() }, [orgId])

  const remover = async (c) => {
    if (!await confirmar(`Excluir o cadastro de "${c.nome}"? Isso não afeta nenhum pedido já feito por ele, só some da lista de clientes.`)) return
    try { await excluirCliente(c.id); recarregar() }
    catch (e) { toast(e.message || 'Erro ao excluir cliente') }
  }

  const exportar = () => {
    const rows = (clientes || []).map(c => ({
      Nome: c.nome,
      Telefone: c.telefone,
      Unidade: c.unidade || '',
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
    XLSX.writeFile(wb, 'clientes.xlsx')
  }

  if (clientes === null) {
    return <div className="flex items-center justify-center py-10 text-green-800 font-bold">Carregando…</div>
  }

  const buscaNorm = busca.trim().toLowerCase()
  const lista = buscaNorm
    ? clientes.filter(c => c.nome.toLowerCase().includes(buscaNorm) || (c.telefone || '').includes(buscaNorm))
    : clientes

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="🔍 Buscar por nome ou telefone…"
          className="flex-1 px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm font-semibold text-stone-800 placeholder-stone-400 focus:outline-none focus:border-green-600"
        />
        <button onClick={exportar} disabled={!clientes.length}
          className="px-4 py-3 bg-white border border-stone-200 rounded-xl font-bold text-sm text-stone-600 active:bg-stone-50 disabled:opacity-40 whitespace-nowrap">
          📤 Exportar
        </button>
      </div>

      {clientes.length === 0 && editandoId !== 'novo' && (
        <div className="text-center py-10 text-stone-400">
          <div className="text-4xl mb-2">👥</div>
          <div className="font-bold">Nenhum cliente cadastrado ainda</div>
          <div className="text-sm mt-1">Clientes entram aqui sozinhos quando fazem pedido — ou cadastre um manualmente abaixo.</div>
        </div>
      )}

      {clientes.length > 0 && lista.length === 0 && (
        <div className="text-center py-8 text-stone-400 text-sm font-semibold">Nenhum cliente encontrado pra "{busca}"</div>
      )}

      <div className="space-y-3">
        {lista.map(c => editandoId === c.id ? (
          <FormCliente key={c.id} editando={c} unidadesNomes={unidadesNomes}
            onSalvou={() => { setEditandoId(null); recarregar() }}
            onCancelar={() => setEditandoId(null)} />
        ) : (
          <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-black text-stone-800 truncate">{c.nome}</div>
              <div className="text-sm text-stone-500 truncate">{c.telefone}{c.unidade ? ` · ${c.unidade}` : ''}</div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => setEditandoId(c.id)} className="w-9 h-9 rounded-xl bg-stone-100 text-stone-600 active:bg-stone-200 flex items-center justify-center">✏️</button>
              <button onClick={() => remover(c)} className="w-9 h-9 rounded-xl bg-red-50 text-red-500 active:bg-red-100 flex items-center justify-center">🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {editandoId === 'novo' ? (
        <FormCliente editando={{ orgId }} unidadesNomes={unidadesNomes}
          onSalvou={() => { setEditandoId(null); recarregar() }}
          onCancelar={() => setEditandoId(null)} />
      ) : (
        <button onClick={() => setEditandoId('novo')} className="w-full py-3.5 border-2 border-dashed border-green-300 text-green-700 rounded-2xl font-bold active:bg-green-50">
          ＋ Cadastrar cliente
        </button>
      )}
    </div>
  )
}
