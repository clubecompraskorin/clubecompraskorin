import { supabase } from './supabase'

// Mesma normalização usada em WebScreen.jsx pra detectar código
// reaproveitado no import (só A-Z0-9, maiúsculo) -- precisa ser idêntica à
// usada em api/gestor-fotos.js pra bater a chave dos dois lados.
export const normalizarNomeKorin = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

// Banco de fotos é pequeno (1 linha por produto distinto da Korin, não por
// organização) -- traz tudo de uma vez, mais simples que filtrar por lista
// de nomes. Devolve as duas chaves de busca (porCod e porNome) -- quem
// chama só passa o mapa adiante pra fotoDoProduto, não precisa saber do
// formato interno.
export async function getMapaFotos() {
  if (!supabase) return { porCod: {}, porNome: {} }
  const { data, error } = await supabase.from('fotos_produtos_korin').select('cod, nome_korin_normalizado, url_foto')
  if (error) { console.error(error); return { porCod: {}, porNome: {} } }
  const porCod = {}
  const porNome = {}
  ;(data || []).forEach(f => {
    if (f.cod != null) porCod[f.cod] = f.url_foto
    porNome[f.nome_korin_normalizado] = f.url_foto
  })
  return { porCod, porNome }
}

// Resolve a foto de um produto: casa pelo CÓDIGO primeiro (mais confiável --
// é o mesmo número em qualquer planilha, oficial ou caseira, diferente do
// texto do nome, que cada coordenadora escreve do seu jeito). Só cai pro
// nome cru da Korin se não achar por código (produto sem código cadastrado
// na foto ainda, ou -- caso futuro -- Valéria, que usa numeração própria
// em vez do código real da Korin).
export const fotoDoProduto = (produto, mapaFotos) => {
  if (!mapaFotos) return null
  const porCod = produto?.cod != null ? mapaFotos.porCod?.[produto.cod] : null
  if (porCod) return porCod
  return mapaFotos.porNome?.[normalizarNomeKorin(produto?.nomeOriginalKorin || produto?.nome)] || null
}
