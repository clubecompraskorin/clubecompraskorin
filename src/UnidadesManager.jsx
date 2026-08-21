import { useState, useEffect } from 'react'
import { getUnidades, addUnidade, updateUnidade, deleteUnidade, setUnidadeAberto, setUnidadePin, gerarPin } from './lib/unidades'
import { toast, confirmar, ToastHost, ConfirmHost } from './lib/dialog'

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-black text-stone-500 uppercase tracking-widest mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-base font-semibold text-stone-800 placeholder-stone-400 focus:outline-none focus:border-green-600"

function FormUnidade({ orgId, editando, ordemProxima, onSalvou, onCancelar }) {
  const [nome, setNome] = useState(editando?.nome || '')
  const [endereco, setEndereco] = useState(editando?.endereco || '')
  const [salvando, setSalvando] = useState(false)

  const salvar = async () => {
    if (!nome.trim())     { toast('Informe o nome da unidade'); return }
    if (!endereco.trim()) { toast('Informe o endereço da unidade'); return }
    setSalvando(true)
    try {
      if (editando) {
        await updateUnidade(editando.id, { nome, endereco }, { orgId, nomeAntigo: editando.nome })
      } else {
        await addUnidade(orgId, { nome, endereco }, ordemProxima)
      }
      onSalvou()
    } catch (e) {
      toast('Erro ao salvar unidade')
      console.error(e)
    }
    setSalvando(false)
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3 border-2 border-green-600">
      <Field label="Nome da unidade">
        <input className={inputCls} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Loja Centro" autoFocus />
      </Field>
      <Field label="Endereço">
        <input className={inputCls} value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Ex: Rua das Flores, 123 — Centro" />
      </Field>
      <div className="flex gap-2 pt-1">
        {onCancelar && (
          <button onClick={onCancelar} className="flex-1 py-3 rounded-xl font-bold text-stone-500 active:bg-stone-100">Cancelar</button>
        )}
        <button onClick={salvar} disabled={salvando} className="flex-1 py-3 bg-green-700 text-white rounded-xl font-black active:bg-green-800 disabled:opacity-50">
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

function LinkEntrega({ orgId, orgSlug, unidade, onAtualizou }) {
  const [gerando, setGerando] = useState(false)

  const link = orgSlug ? `${window.location.origin}/${orgSlug}/entrega?u=${unidade.id}` : ''

  const gerarOuTrocar = async () => {
    setGerando(true)
    try {
      await setUnidadePin(unidade.id, gerarPin())
      onAtualizou()
    } catch { toast('Erro ao gerar PIN') }
    setGerando(false)
  }

  const copiarLink = async () => {
    try { await navigator.clipboard.writeText(link); toast('Link copiado!') }
    catch { toast(link) }
  }

  if (!orgSlug) return null

  if (!unidade.pin_entrega) {
    return (
      <button onClick={gerarOuTrocar} disabled={gerando}
        className="w-full py-2.5 rounded-xl font-bold text-sm bg-stone-100 text-stone-600 active:bg-stone-200 disabled:opacity-50">
        {gerando ? 'Gerando…' : '🔗 Gerar link de entrega pro representante'}
      </button>
    )
  }

  return (
    <div className="bg-stone-50 rounded-xl p-3 space-y-2 border border-stone-200">
      <div className="text-xs font-black text-stone-500 uppercase tracking-widest">Link de entrega (representante)</div>
      <div className="text-sm font-semibold text-stone-700 break-all">{link}</div>
      <div className="text-sm text-stone-600">PIN de acesso: <span className="font-black text-stone-800 text-base tracking-widest">{unidade.pin_entrega}</span></div>
      <div className="flex gap-2 pt-1">
        <button onClick={copiarLink} className="flex-1 py-2 rounded-lg font-bold text-xs bg-green-50 text-green-700 active:bg-green-100">📋 Copiar link</button>
        <button onClick={gerarOuTrocar} disabled={gerando} className="flex-1 py-2 rounded-lg font-bold text-xs bg-stone-100 text-stone-600 active:bg-stone-200 disabled:opacity-50">
          {gerando ? '…' : '🔄 Trocar PIN'}
        </button>
      </div>
    </div>
  )
}

// modo: 'onboarding' (obrigatório, sem skip, mostra CTA Continuar) | 'settings' (gerenciamento livre dentro do app)
export default function UnidadesManager({ orgId, orgSlug, modo = 'settings', onConcluir, onChange, montarHosts = false }) {
  const [unidades, setUnidades] = useState(null) // null = carregando
  const [editandoId, setEditandoId] = useState(null) // 'novo' | id | null
  const recarregar = () => getUnidades(orgId).then(lista => { setUnidades(lista); onChange?.(lista) })

  useEffect(() => { recarregar() }, [orgId])

  const remover = async (u) => {
    if (!await confirmar('Remover esta unidade de retirada?')) return
    try { await deleteUnidade(u.id, orgId, u.nome); recarregar() }
    catch (e) { toast(e.message || 'Erro ao remover unidade') }
  }

  // Encerrar bloqueia pedido novo pra essa unidade (catálogo, manual, WhatsApp) —
  // por isso pede confirmação. Reabrir é reversível e não precisa.
  const alternarAberto = async (u) => {
    if (u.aberto && !await confirmar(`Encerrar pedidos da unidade "${u.nome}"? Ninguém vai conseguir fazer pedido novo pra ela até você reabrir.`)) return
    try { await setUnidadeAberto(u.id, !u.aberto); recarregar() }
    catch { toast('Erro ao atualizar unidade') }
  }

  if (unidades === null) {
    return <div className="flex items-center justify-center py-10 text-green-800 font-bold">Carregando…</div>
  }

  return (
    <div className={modo === 'onboarding' ? 'min-h-screen bg-stone-100 flex flex-col px-4 py-8' : ''}>
      {montarHosts && <><ToastHost /><ConfirmHost /></>}

      {modo === 'onboarding' && (
        <div className="mb-6 text-center">
          <div className="text-4xl mb-2">📍</div>
          <h1 className="text-xl font-black text-stone-800 mb-1">Cadastre suas unidades de retirada</h1>
          <p className="text-sm text-stone-500">Onde seus membros vão retirar os pedidos? Pode cadastrar mais de uma — você poderá editar depois.</p>
        </div>
      )}

      <div className="space-y-3 flex-1">
        {unidades.map(u => editandoId === u.id ? (
          <FormUnidade key={u.id} orgId={orgId} editando={u}
            onSalvou={() => { setEditandoId(null); recarregar() }}
            onCancelar={() => setEditandoId(null)} />
        ) : (
          <div key={u.id} className={`bg-white rounded-2xl p-4 shadow-sm space-y-2.5 border ${u.aberto === false ? 'border-amber-300' : 'border-transparent'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-black text-stone-800 truncate">{u.nome}</div>
                {u.endereco && <div className="text-sm text-stone-500 truncate">{u.endereco}</div>}
                {u.aberto === false && <div className="text-xs text-amber-700 font-bold mt-0.5">🔒 Pedidos encerrados</div>}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => setEditandoId(u.id)} className="w-9 h-9 rounded-xl bg-stone-100 text-stone-600 active:bg-stone-200 flex items-center justify-center">✏️</button>
                <button onClick={() => remover(u)} className="w-9 h-9 rounded-xl bg-red-50 text-red-500 active:bg-red-100 flex items-center justify-center">🗑️</button>
              </div>
            </div>
            {modo !== 'onboarding' && (
              <button onClick={() => alternarAberto(u)}
                className={`w-full py-2.5 rounded-xl font-bold text-sm active:opacity-80 ${u.aberto === false ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {u.aberto === false ? '🔓 Reabrir pedidos desta unidade' : '🔒 Encerrar pedidos desta unidade'}
              </button>
            )}
            {modo !== 'onboarding' && (
              <LinkEntrega orgId={orgId} orgSlug={orgSlug} unidade={u} onAtualizou={recarregar} />
            )}
          </div>
        ))}

        {editandoId === 'novo' ? (
          <FormUnidade orgId={orgId} ordemProxima={unidades.length}
            onSalvou={() => { setEditandoId(null); recarregar() }}
            onCancelar={() => setEditandoId(null)} />
        ) : (
          <button onClick={() => setEditandoId('novo')} className="w-full py-3.5 border-2 border-dashed border-green-300 text-green-700 rounded-2xl font-bold active:bg-green-50">
            ＋ Adicionar unidade
          </button>
        )}
      </div>

      {modo === 'onboarding' && (
        <button
          onClick={onConcluir}
          disabled={unidades.length === 0}
          className="w-full py-4 bg-green-700 text-white rounded-2xl font-black text-lg active:bg-green-800 disabled:opacity-40 mt-6">
          Continuar →
        </button>
      )}
    </div>
  )
}
