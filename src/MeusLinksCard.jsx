import { useState, useEffect } from 'react'
import { getMinhasUnidadesComPin } from './lib/auth'
import { toast } from './lib/dialog'

// Card só pro dedicante_unidade — ele não vê Config → Unidades, então é o
// único lugar onde consegue pegar o link do catálogo (pra repassar aos
// membros da própria unidade) e o link de entrega por PIN (pra separar ele
// mesmo, ou repassar pra outra pessoa que ajude na entrega). Pendência
// registrada pelo Junior quando o papel foi lançado (ver STATUS.md).
export default function MeusLinksCard({ org }) {
  const [unidades, setUnidades] = useState(null) // null = carregando

  useEffect(() => { getMinhasUnidadesComPin().then(setUnidades) }, [])

  if (!org?.slug) return null

  const linkCatalogo = `${window.location.origin}/${org.slug}/pedido`
  const copiar = async (texto) => {
    try { await navigator.clipboard.writeText(texto); toast('Link copiado!') }
    catch { toast(texto) }
  }

  return (
    <div className="mx-4 mt-3 mb-1 bg-white rounded-2xl border border-stone-100 shadow-sm p-4 space-y-3">
      <div className="text-xs font-black text-stone-400 uppercase tracking-widest">🔗 Meus links</div>

      <div className="bg-stone-50 rounded-xl p-3 space-y-2 border border-stone-200">
        <div className="text-xs font-black text-stone-500 uppercase tracking-widest">Catálogo (pros membros comprarem)</div>
        <div className="text-sm font-semibold text-stone-700 break-all">{linkCatalogo}</div>
        <button onClick={() => copiar(linkCatalogo)}
          className="w-full py-2 rounded-lg font-bold text-xs bg-green-50 text-green-700 active:bg-green-100">
          📋 Copiar link
        </button>
      </div>

      {unidades === null ? (
        <div className="text-xs text-stone-400 text-center py-2">Carregando…</div>
      ) : unidades.length === 0 ? null : (
        unidades.map(u => {
          const linkEntrega = `${window.location.origin}/${org.slug}/entrega?u=${u.id}`
          return (
            <div key={u.id} className="bg-stone-50 rounded-xl p-3 space-y-2 border border-stone-200">
              <div className="text-xs font-black text-stone-500 uppercase tracking-widest">Entrega — {u.nome}</div>
              {u.pin_entrega ? (
                <>
                  <div className="text-sm font-semibold text-stone-700 break-all">{linkEntrega}</div>
                  <div className="text-sm text-stone-600">PIN: <span className="font-black text-stone-800 text-base tracking-widest">{u.pin_entrega}</span></div>
                  <button onClick={() => copiar(linkEntrega)}
                    className="w-full py-2 rounded-lg font-bold text-xs bg-green-50 text-green-700 active:bg-green-100">
                    📋 Copiar link
                  </button>
                </>
              ) : (
                <div className="text-xs text-stone-400">Ainda não gerado — peça pra coordenadora habilitar em Config → Unidades.</div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
