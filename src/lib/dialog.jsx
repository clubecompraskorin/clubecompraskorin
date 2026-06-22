import { useState, useEffect } from 'react'

// ── Toast (substitui alert()) ──────────────────────────────────────────────
let _setToast = null

export function ToastHost() {
  const [toast, setToast] = useState(null)
  useEffect(() => { _setToast = setToast; return () => { _setToast = null } }, [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(t)
  }, [toast])
  if (!toast) return null
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-bold max-w-[88vw] text-center text-white bg-green-800 animate-[toastin_0.2s_ease-out]">
      {toast.msg}
    </div>
  )
}

export function toast(msg) {
  if (_setToast) _setToast({ msg })
  else window.alert(msg) // fallback de segurança
}

// ── Confirm (substitui window.confirm()) ───────────────────────────────────
let _setConfirm = null

export function ConfirmHost() {
  const [state, setState] = useState(null)
  useEffect(() => { _setConfirm = setState; return () => { _setConfirm = null } }, [])
  if (!state) return null
  const close = (result) => { state.resolve(result); setState(null) }
  return (
    <div className="fixed inset-0 bg-black/55 z-[200] flex items-center justify-center px-6" onClick={() => close(false)}>
      <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <p className="text-stone-800 font-semibold whitespace-pre-line mb-5 leading-snug">{state.msg}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => close(false)} className="px-4 py-2.5 rounded-xl font-bold text-stone-500 active:bg-stone-100">Cancelar</button>
          <button onClick={() => close(true)} className="px-5 py-2.5 rounded-xl font-bold bg-green-700 text-white active:bg-green-800">Confirmar</button>
        </div>
      </div>
    </div>
  )
}

export function confirmar(msg) {
  return new Promise(resolve => {
    if (_setConfirm) _setConfirm({ msg, resolve })
    else resolve(window.confirm(msg)) // fallback de segurança
  })
}
