# STATUS — Clube de Compras Korin (Sistema 2)

> Status vivo do projeto. Atualizar a cada mudança relevante (merge feito, feature nova, decisão
> tomada, teste realizado) e sempre commitar na `main` — é o mecanismo pra qualquer sessão nova
> retomar o contexto sem o Junior precisar reexplicar tudo de novo.
>
> Última atualização: 21/08/2026 (gap de integridade produto↔pedido registrado e corrigido).

---

## Os dois sistemas

| | Sistema 1 | Sistema 2 (este repo) |
|---|---|---|
| Nome | Ação Social Korin (Valéria/Lattuga) | Clube de Compras Korin |
| Repo | `jucimarlopes/korin-acao-social` | `clubecompraskorin/clubecompraskorin` |
| Supabase | `bfvafuvqftmnarielfby` | `nbfvkmdcbfvgpqpvvspv` |
| Vercel | (não conectado nesta sessão) | projeto `clubecompraskorin`, domínio `clubecompraskorin.vercel.app` |
| Natureza | Single-tenant, **produção real** | Multi-tenant SaaS, em validação com outras coordenadoras |
| Regra crítica | Nenhuma alteração sem autorização explícita do Junior, dada na conversa atual — já gravado em `CLAUDE.md` na raiz do repo do S1. | Pode evoluir, mas confirmar antes de merge na `main` / deploy de produção |

---

## O que já está feito e publicado

1. **Inventário técnico completo dos dois sistemas** — arquitetura, modelo de dados, segurança,
   cada tela/modal/botão dos dois apps, comparativo de paridade/superação entre S1×S2, linha do
   tempo de commits, governança.
   - Artefato publicado: `https://claude.ai/code/artifact/3cae4755-c3cf-4998-8c37-5e4fb05f2325`
   - Espelhado em markdown no repo do S1: `docs/HISTORICO-E-ARQUITETURA.md` (na `main`)

2. **Levantamento de campo do Junior** (evento na Korin Alimentos, conversando com outros
   coordenadores de clube de compras Korin de várias regiões) e **análise de uma planilha real da
   Korin** — documentado em `docs/PLANEJAMENTO-IMPORTACAO-PLANILHA-KORIN.md` (na `main`,
   commit `ccb9bc7`, mesclado em `d9e3d62`). Principais achados:
   - A Valéria é exceção: ela cura a tabela da Korin e gera imagem própria. A maioria dos outros
     coordenadores repassa a tabela cheia da Korin como está (ou usa e-mail/Forms).
   - A fonte oficial que a Korin distribui é sempre **planilha Excel/Google Sheets** (confirmado,
     não varia por região).
   - Restrição de produto importante: grande parte desses coordenadores tem pouca familiaridade
     com tecnologia — tudo precisa ser o mais simples possível.
   - Códigos reais da Korin são SKUs estáveis (sem o risco de deslocamento que os códigos 1-29 da
     Valéria têm). Existe categoria "Peixes" na planilha real que não existia na taxonomia fixa.

3. **3 decisões de escopo fechadas com o Junior** (antes de implementar):
   - Botão único de importar, detecta sozinho se o arquivo é foto ou planilha (sem escolha extra
     pro coordenador).
   - Categoria de cada produto é classificada por IA e fica **editável na pré-visualização** (pra
     corrigir se a IA errar).
   - Taxonomia de categorias continua **fixa** (só acrescenta "Peixes", não vira dinâmica por
     organização).

4. **Feature implementada, testada e mesclada** — importação de catálogo direto da planilha
   `.xlsx` da Korin, alternativa ao fluxo de foto+IA que já existia:
   - `src/lib/importarPlanilha.js` — parser client-side (lib `xlsx`, já dependência do projeto).
     Lê por **endereço de célula absoluto** (ex: `B12`), não por índice de array — o range da
     planilha começa na coluna B, o que quebraria leitura por índice.
   - `api/classificar-categorias.js` — function nova (Claude Haiku, só texto) que classifica cada
     produto numa das 6 categorias.
   - `src/WebScreen.jsx` (`ModalImportarCatalogo`) — botão único com autodetecção, categoria vira
     `<select>` editável na prévia.
   - `src/lib/catalog.js` — `CATS_ORDEM`/`CAT_COR` ganham "Peixes".
   - Validado linha a linha contra uma planilha real da Korin: 44/44 produtos extraídos
     corretamente.
   - **Limitação conhecida e aceita**: produtos líquidos (ex: mel, própolis em ml) ficam com
     unidade expressa em gramas em vez de ml — cosmético, não afeta preço/quantidade.
   - `npx vite build` passa sem erro.
   - **Status no GitHub: mesclada na `main`.** Commit da feature: `fea3552`
     (branch `feature/importar-planilha-korin`). Merge commit na `main`: `a4236c7`
     (`d9e3d62..a4236c7`).

---

## Gap de integridade produto↔pedido — identificado e corrigido

**Achado**: `korin_pedidos.itens` (jsonb, `{produtoId, qty}`) **não tem FK** com `periodo_produtos`
no banco (confirmado direto no schema via Supabase MCP). O casamento entre importação/edição de
catálogo e produtos existentes é feito só pelo `cod`, via `upsert(..., { onConflict:
'periodo_id,cod' })`. Isso abria 3 cenários de quebra silenciosa, sem erro nem aviso:

1. **Reimportar o catálogo no mesmo período** (planilha ou foto) **sem incluir um código** que já
   tinha pedido em aberto: `substituirProdutosDoPeriodo` deletava a linha de `periodo_produtos`
   porque ela some não é mais associada a um pedido. Como não há FK, a deleção não é bloqueada —
   e o pedido pendente que referenciava aquele `produtoId` fica órfão.
2. **Coordenadora deleta manualmente um produto** com pedido em aberto vinculado (`ModalProduto` /
   `removerProdutoDoPeriodo`) — mesmo efeito do item 1.
3. Em ambos os casos, o sintoma é **silencioso**: `itensComProduto` (`WebScreen.jsx`) faz
   `.filter(Boolean)` e o item some da tela do pedido; `calcTotal` (`helpers.js`) trata produto
   não encontrado como preço `0` — o total do pedido **cai sozinho**, sem log nem aviso. Depois,
   mesmo reimportando o código de volta, o pedido não se recupera: o `upsert` cria uma linha nova
   (id novo), a antiga já foi apagada.
   - Cenário adjacente, **ainda não corrigido**: se um código é reaproveitado por um produto
     *diferente* (ex: numeração sequencial deslocando, como já documentado pro fluxo manual da
     Valéria), o `upsert` **atualiza a linha existente** em vez de criar uma nova — um pedido
     pendente pode passar a exibir/cobrar como se fosse o produto errado. A planilha oficial da
     Korin (SKU estável) não sofre isso; a numeração sequencial manual, sim. Fica registrado como
     risco conhecido, não como algo corrigido nesta rodada.

**Correção aplicada** (`src/lib/periodos.js`): nova função interna `produtosVinculadosAPedidos`
consulta `korin_pedidos` do período com `status <> 'cancelado'` e monta o conjunto de `produtoId`
ainda em uso.
- `removerProdutoDoPeriodo(produtoId, periodoId)` agora recebe o período e bloqueia a remoção
  (retorna erro) se o produto está vinculado a pedido ativo.
- `substituirProdutosDoPeriodo` exclui da lista de remoção qualquer produto vinculado a pedido
  ativo — ele é **mantido no período mesmo fora da tabela nova** em vez de apagado, e o retorno
  ganhou `mantidosPorPedido` (contagem) pra UI avisar a coordenadora.
- Chamadores atualizados: `App.jsx` (`deleteProduto` passa `periodoCorrente.id`) e
  `WebScreen.jsx` (`confirmarSalvar` mostra toast com a contagem de produtos mantidos, quando > 0).
- `npx vite build` validado sem erro.
- **Status no GitHub: mesclada na `main`.** Commit do fix: `dd3d8b0`
  (branch `fix/protege-produtos-com-pedido-vinculado`). Merge commit na `main`: `44564fe`
  (`8b25aaa..44564fe`).

---

## Pendente / próximos passos

1. **Testar de verdade no app**: upload de uma planilha real, conferir se a IA classifica bem as
   categorias, se o preview mostra tudo certo, se salva corretamente. Testar também o novo bloqueio
   de remoção de produto com pedido vinculado.
2. **Atualizar o artefato publicado** com a feature de importação por planilha e com o gap de
   integridade produto↔pedido (documentado em markdown no repo, artefato visual ainda não reflete).
3. **Risco de reaproveitamento de código por produto diferente** (ver acima) — ainda sem correção;
   avaliar se vale detectar mudança de nome no mesmo `cod` e alertar em vez de sobrescrever direto.
4. **Gap de offline-first do Sistema 2** (identificado no comparativo): existe uma proposta
   técnica desenhada (fila de escrita por "intenção", documentada no artefato) mas **nada foi
   implementado**. Ainda não há decisão de seguir com isso.
5. **Próximas partes do fluxo de campo ainda não levantadas**: como os outros coordenadores
   captam pedido dos membros, como enviam o consolidado pra Korin (só cobrimos até
   "divulgação/importação de catálogo").

---

## Nota operacional sobre sessões múltiplas

O acesso de escrita ao GitHub do Sistema 1 e do Sistema 2 fica em sessões Claude Code separadas
(cada uma criada com um repositório diferente como fonte). Usar duas sessões ao mesmo tempo pra
coordenar merges de produção (relay de patch entre sessões, confirmações duplicadas) se mostrou
improdutivo. Recomendação: trabalhar cada sistema direto na sessão que já tem acesso de escrita
ao repo correspondente, trazendo este arquivo como contexto inicial quando for preciso retomar em
outra sessão.
