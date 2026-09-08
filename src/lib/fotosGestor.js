/**
 * fotosGestor.js — gestão do banco compartilhado de fotos (fotos_produtos_korin),
 * usado só na aba Fotos do /gestor. Ver api/gestor-fotos.js pro lado servidor
 * (upload em si precisa de service_role, por isso passa por lá).
 */
import { supabase } from './supabase'
import { getSession } from './auth'

/**
 * Todo produto (código + nome) já visto em qualquer organização, cruzado
 * com se já tem foto -- monta a lista de "o que falta" da aba Fotos. Lê
 * direto (RLS de `periodo_produtos`/`fotos_produtos_korin` já é pública,
 * mesma leitura que o catálogo anônimo do membro usa).
 */
export async function listarProdutosParaFotos() {
  if (!supabase) return []
  const [{ data: produtos, error: e1 }, { data: fotos, error: e2 }] = await Promise.all([
    supabase.from('periodo_produtos').select('cod, nome_original_korin, nome, created_at')
      .not('nome_original_korin', 'is', null).order('created_at', { ascending: false }),
    supabase.from('fotos_produtos_korin').select('cod, url_foto').not('cod', 'is', null),
  ])
  if (e1 || e2) { console.error(e1 || e2); return [] }

  const fotoPorCod = {}
  ;(fotos || []).forEach(f => { fotoPorCod[f.cod] = f.url_foto })

  // Mais recente primeiro na query -- o primeiro nome visto por código já é
  // o mais atual, ignora repetições do mesmo produto em outras organizações.
  const vistos = new Set()
  const lista = []
  ;(produtos || []).forEach(p => {
    if (vistos.has(p.cod)) return
    vistos.add(p.cod)
    lista.push({ cod: p.cod, nome: p.nome_original_korin || p.nome, foto: fotoPorCod[p.cod] || null })
  })
  // Sem foto primeiro (é o que precisa de atenção), depois por código.
  return lista.sort((a, b) => (a.foto ? 1 : 0) - (b.foto ? 1 : 0) || a.cod - b.cod)
}

async function lerComoBase64(arquivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = () => reject(new Error('Não consegui ler o arquivo'))
    reader.readAsDataURL(arquivo)
  })
}

/** Sobe a foto (arquivo escolhido no /gestor) casada com esse produto. */
export async function cadastrarFotoProduto({ nomeKorin, cod, arquivo }) {
  const session = await getSession()
  if (!session) return { ok: false, error: 'Sessão expirada — recarregue a página e entre novamente.' }
  try {
    const imagemBase64 = await lerComoBase64(arquivo)
    const res = await fetch('/api/gestor-fotos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ nomeKorin, cod: cod ?? null, imagemBase64, mimeType: arquivo.type }),
    })
    const json = await res.json()
    if (!res.ok || !json.ok) return { ok: false, error: json.error || 'Não foi possível salvar a foto' }
    return json
  } catch (e) {
    return { ok: false, error: e.message }
  }
}
