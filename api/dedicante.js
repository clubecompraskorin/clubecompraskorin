// api/dedicante.js — Vercel Serverless Function
// Único jeito de criar/remover o login de um "dedicante de unidade" (acesso restrito
// só às unidades que ele representa). Criar o login com senha já definida (sem
// confirmação por e-mail) exige a Admin API do Supabase, que só funciona com a
// service_role key -- por isso roda aqui, nunca no cliente.
//
// POST   { orgId, nome, email, unidadeIds } -> cria o login + vínculo, devolve a senha gerada (uma vez só)
// DELETE { orgId, memberId }                -> remove o login e o vínculo

import { createClient } from '@supabase/supabase-js'

// service_role -- bypassa RLS, usado pra tudo que grava/lê sem restrição.
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Client separado, com a chave pública (anon) -- só pra validar o token de
// quem chamou (auth.getUser(jwt)). O client de service_role, mesmo sem
// localStorage/sessão nenhuma, ainda dá "Auth session missing!" nessa
// chamada (o supabase-js espera uma sessão de usuário de verdade por trás,
// não uma chave de admin) -- com a chave anon ele valida o jwt direto contra
// o servidor de auth, sem depender de sessão local nenhuma.
const supabaseAuth = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Sem caracteres ambíguos (0/O, 1/l/I) -- vai ser digitada num celular, repassada
// por WhatsApp pela representante.
const ALFABETO_SENHA = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
function gerarSenha(tamanho = 10) {
  let s = ''
  for (let i = 0; i < tamanho; i++) s += ALFABETO_SENHA[Math.floor(Math.random() * ALFABETO_SENHA.length)]
  return s
}

// Confere o token da própria sessão de quem chamou (a representante) e se ela é
// admin (role != 'dedicante_unidade') daquela organização -- nunca confia em nada
// que o cliente mande sem checar contra o banco.
async function autenticarOrgAdmin(req, orgId) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return { erro: 'Não autenticado' }
  const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token)
  if (userError || !userData?.user) return { erro: 'Sessão inválida' + (userError?.message ? ` (${userError.message})` : '') }

  const { data: membro, error: membroError } = await supabaseAdmin
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userData.user.id)
    .maybeSingle()
  if (membroError || !membro || membro.role === 'dedicante_unidade') {
    return { erro: 'Sem permissão para esta organização' }
  }
  return { userId: userData.user.id }
}

async function criar(req, res) {
  const { orgId, nome, email, unidadeIds } = req.body || {}
  if (!orgId || !nome?.trim() || !email?.trim() || !Array.isArray(unidadeIds) || !unidadeIds.length) {
    return res.status(400).json({ ok: false, error: 'orgId, nome, email e ao menos 1 unidade são obrigatórios' })
  }

  const auth = await autenticarOrgAdmin(req, orgId)
  if (auth.erro) return res.status(403).json({ ok: false, error: auth.erro })

  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizacoes').select('permite_dedicante_unidade').eq('id', orgId).maybeSingle()
  if (orgError) throw orgError
  if (!org?.permite_dedicante_unidade) {
    return res.status(403).json({ ok: false, error: 'Este recurso não está liberado para esta organização' })
  }

  // Confere que as unidades informadas são mesmo dessa organização.
  const { data: unidadesValidas, error: unidadesError } = await supabaseAdmin
    .from('org_unidades').select('id').eq('org_id', orgId).in('id', unidadeIds)
  if (unidadesError) throw unidadesError
  if ((unidadesValidas || []).length !== unidadeIds.length) {
    return res.status(400).json({ ok: false, error: 'Uma ou mais unidades inválidas' })
  }

  const senha = gerarSenha()
  const emailNormalizado = email.trim().toLowerCase()
  const { data: novoUsuario, error: criarUsuarioError } = await supabaseAdmin.auth.admin.createUser({
    email: emailNormalizado,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: nome.trim() },
  })
  if (criarUsuarioError) {
    const msg = criarUsuarioError.message?.includes('already been registered')
      ? 'Esse e-mail já tem uma conta no sistema.'
      : criarUsuarioError.message
    return res.status(400).json({ ok: false, error: msg })
  }

  const { data: membro, error: membroError } = await supabaseAdmin
    .from('org_members')
    .insert({ org_id: orgId, user_id: novoUsuario.user.id, role: 'dedicante_unidade', nome: nome.trim(), email: emailNormalizado })
    .select('id').single()
  if (membroError) {
    await supabaseAdmin.auth.admin.deleteUser(novoUsuario.user.id)
    throw membroError
  }

  const { error: vinculoError } = await supabaseAdmin
    .from('org_member_unidades')
    .insert(unidadeIds.map(unidade_id => ({ org_member_id: membro.id, unidade_id })))
  if (vinculoError) {
    await supabaseAdmin.from('org_members').delete().eq('id', membro.id)
    await supabaseAdmin.auth.admin.deleteUser(novoUsuario.user.id)
    throw vinculoError
  }

  return res.status(200).json({ ok: true, senha, memberId: membro.id, email: emailNormalizado, nome: nome.trim() })
}

async function remover(req, res) {
  const { orgId, memberId } = req.body || {}
  if (!orgId || !memberId) return res.status(400).json({ ok: false, error: 'orgId e memberId são obrigatórios' })

  const auth = await autenticarOrgAdmin(req, orgId)
  if (auth.erro) return res.status(403).json({ ok: false, error: auth.erro })

  const { data: membro, error: membroError } = await supabaseAdmin
    .from('org_members').select('user_id, role').eq('id', memberId).eq('org_id', orgId).maybeSingle()
  if (membroError) throw membroError
  if (!membro || membro.role !== 'dedicante_unidade') {
    return res.status(400).json({ ok: false, error: 'Dedicante não encontrado' })
  }

  await supabaseAdmin.from('org_members').delete().eq('id', memberId)
  await supabaseAdmin.auth.admin.deleteUser(membro.user_id)

  return res.status(200).json({ ok: true })
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') return await criar(req, res)
    if (req.method === 'DELETE') return await remover(req, res)
    return res.status(405).end()
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
