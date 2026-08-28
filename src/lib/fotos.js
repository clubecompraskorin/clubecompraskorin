import { supabase } from './supabase'

// Mesma normalização usada em WebScreen.jsx pra detectar código
// reaproveitado no import (só A-Z0-9, maiúsculo) -- precisa ser idêntica à
// usada em api/gestor-fotos.js pra bater a chave dos dois lados.
export const normalizarNomeKorin = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

// Banco de fotos é pequeno (1 linha por produto distinto da Korin, não por
// organização) -- traz tudo de uma vez, mais simples que filtrar por lista
// de nomes.
export async function getMapaFotos() {
  if (!supabase) return {}
  const { data, error } = await supabase.from('fotos_produtos_korin').select('nome_korin_normalizado, url_foto')
  if (error) { console.error(error); return {} }
  const mapa = {}
  ;(data || []).forEach(f => { mapa[f.nome_korin_normalizado] = f.url_foto })
  return mapa
}

// Resolve a foto de um produto: casa pelo nome cru da Korin (mais estável
// entre organizações que o nome amigável, que cada uma pode editar).
export const fotoDoProduto = (produto, mapaFotos) =>
  mapaFotos?.[normalizarNomeKorin(produto?.nomeOriginalKorin || produto?.nome)] || null
