# STATUS — Clube de Compras Korin (Sistema 2)

> Status vivo do projeto. Atualizar a cada mudança relevante (merge feito, feature nova, decisão
> tomada, teste realizado) e sempre commitar na `main` — é o mecanismo pra qualquer sessão nova
> retomar o contexto sem o Junior precisar reexplicar tudo de novo.
>
> Última atualização: 21/08/2026 (gaps de integridade produto↔pedido registrados e corrigidos:
> deleção de produto com pedido vinculado, código reaproveitado por produto diferente, produto
> "fora da tabela" sinalizado na UI da coordenadora; cadastro leve de clientes criado; unidade de
> retirada agora obrigatória nos 3 fluxos de pedido; código morto de entrega removido; nome/
> telefone/unidade visíveis nas 3 etapas do fluxo de entrega; e encerramento de pedidos por
> unidade implementado — levantamento de fechamento por unidade/grupo de unidades registrado).

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
   - Cenário adjacente, **corrigido numa segunda rodada** (ver seção abaixo): se um código é
     reaproveitado por um produto *diferente* (ex: numeração sequencial deslocando, como já
     documentado pro fluxo manual da Valéria), o `upsert` **atualiza a linha existente** em vez de
     criar uma nova — um pedido pendente podia passar a exibir/cobrar como se fosse o produto
     errado. A planilha oficial da Korin (SKU estável) não sofre isso; a numeração sequencial
     manual, sim.

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

## Aviso de código reaproveitado por produto diferente — corrigido

Segunda parte do gap acima (item 3 do "Pendente" da rodada anterior). Como o casamento na
importação é só por `cod`, se o mesmo código já pertencia a um produto de **nome diferente**, o
sistema sobrescrevia a linha existente sem aviso — um pedido pendente que referenciava esse
produto por trás dos panos passava a exibir/cobrar o produto novo, silenciosamente.

**Correção aplicada** (`src/WebScreen.jsx`, `ModalImportarCatalogo`):
- `mesclarComExistentes` agora compara o nome normalizado do produto existente (mesmo `cod`) com
  o nome vindo da importação; marca `conflitoCod` + `nomeAnterior` quando diverge.
- Pré-visualização ganhou um banner de aviso (mesmo padrão visual do aviso de mês diferente)
  listando cada conflito — `código: era "X", agora é "Y"` — e destaca em âmbar o item conflitante
  na lista.
- Salvar exige um checkbox de confirmação explícita ("Revisei e confirmo...") quando há
  conflito — **não bloqueia** a importação (pode ser uma mudança legítima, ex: Korin renomeou o
  produto mantendo o código), só exige revisão consciente em vez de aceitar direto.
- `npx vite build` validado sem erro.
- **Status no GitHub: mesclada na `main`.** Commit do fix: `e388ad7`
  (branch `fix/avisa-reaproveitamento-codigo`). Merge commit na `main`: `43d2768`
  (`71d9a8e..43d2768`).

---

## Produto "fora da tabela" agora sinalizado na UI da coordenadora

Consequência direta do fix de "impedir deletar produto com pedido vinculado": um produto mantido
no período (não apagado) por ter pedido ativo, mesmo sem estar mais na última tabela importada,
ficava **indistinguível** de um produto normal — a coordenadora não tinha como saber que aquele
item não reflete mais a planilha/foto mais recente.

**Correção aplicada**:
- Migration no Supabase (projeto `nbfvkmdcbfvgpqpvvspv`): `periodo_produtos` ganhou coluna
  `fora_da_tabela` (boolean, default `false`).
- `src/lib/periodos.js`: `produtoFromDb`/`produtoToDb` mapeiam o campo novo (`foraDaTabela` no
  app). `substituirProdutosDoPeriodo` agora marca `fora_da_tabela = true` explicitamente nos
  produtos mantidos por pedido vinculado; qualquer produto que **vem** na lista nova importada sai
  com `fora_da_tabela = false` via upsert — inclusive se ele tinha sido marcado numa importação
  anterior e voltou a aparecer.
- UI: `App.jsx` (`ProdutosScreen`, aba Produtos) e `WebScreen.jsx` (`TabProdutos`, aba Embalagens)
  mostram borda âmbar + aviso "⚠️ Fora da última tabela importada — mantido por ter pedido em
  aberto" no produto marcado.
- Escopo: só a tela da coordenadora (painel). **Não alterei** o catálogo público
  (`CatalogoApp.jsx`) — o produto continua comprável por um cliente novo mesmo estando fora da
  tabela atual; isso não foi pedido nesta rodada, fica como possível próximo passo.
- `npx vite build` validado sem erro.
- **Status no GitHub: mesclada na `main`.** Commit da feature: `7a43d4f`
  (branch `feat/marca-produto-fora-da-tabela`). Merge commit na `main`: `88f7304`
  (`5069fdc..88f7304`).

---

## Cadastro leve de clientes (base pra uso futuro — Junior vai detalhar depois)

Sistema não tinha nenhum cadastro de cliente — `cliente_nome`/`cliente_tel` eram só texto solto
em cada pedido, sem entidade nenhuma amarrando isso, sem histórico entre meses, sem autocomplete
(levantamento registrado numa conversa anterior). O Junior confirmou que vai usar isso no futuro
("te digo depois") — esta rodada só constrói a base, sem tela de gestão nova.

**Restrições de design que guiaram a implementação** (analfabetismo digital dos dois lados — a
coordenadora e o cliente final — e cada passo/campo a mais é risco de desistência):
- **Zero campo novo, zero passo novo** em qualquer fluxo existente (manual, colado do WhatsApp,
  catálogo público). O cadastro se alimenta sozinho, como efeito colateral de salvar um pedido.
- Onde ajudou a coordenadora (menos digitação), usei o **mesmo input que já existia**, com
  autocomplete nativo do navegador (`<datalist>`) — não é um componente novo pra ela aprender.
- No catálogo público, **não toquei em nada visível** — o cliente final nem sabe que esse cadastro
  existe.

**Implementado**:
- Migration no Supabase (`nbfvkmdcbfvgpqpvvspv`): tabela `clientes` (`org_id`, `nome`, `telefone`,
  `telefone_normalizado`, `unidade`), `unique (org_id, telefone_normalizado)` — telefone só
  dígitos é a chave de dedup. RLS: **SELECT restrito** a `is_org_member`/`is_platform_admin` (é
  PII — nome+telefone de pessoas — mesmo padrão de `korin_pedidos`, nunca leitura pública, ao
  contrário de `periodos`/`periodo_produtos`/`org_unidades` que são `SELECT true`). INSERT/UPDATE
  por `is_org_member`.
- `src/lib/clientes.js`: `normalizarTelefone`, `upsertCliente` (nunca derruba o pedido se falhar
  — é efeito colateral, não o dado principal), `listarClientes`.
- `src/lib/store.js` (`salvarPedido`): upsert automático a cada pedido manual/colado salvo.
- `api/pedido.js`: mesmo upsert no caminho do catálogo público, via `service_role`, em try/catch
  próprio — nunca quebra a confirmação do pedido pro cliente se o upsert de cliente falhar.
- `src/App.jsx` (`ModalPedido`, `ModalColarPedido`): `<datalist>` no campo de nome já existente —
  ao bater com cliente conhecido, preenche telefone/unidade sozinho (só quando ainda vazio, nunca
  sobrescreve o que a coordenadora já digitou). No `ModalColarPedido`, roda também sobre o nome
  que a IA já extrai do texto colado do WhatsApp.
- `npx vite build` validado sem erro.
- **Ainda não existe**: tela "Clientes" de gestão/consulta — combinado que o Junior traz o
  requisito de uso futuro antes de desenhar isso.
- **Status no GitHub: mesclada na `main`.** Commit da feature: `f5e29b7`
  (branch `feat/cadastro-leve-de-clientes`). Merge commit na `main`: `face932`
  (`ebcf71f..face932`).

---

## Unidade de retirada agora obrigatória nos 3 fluxos de pedido

Levantamento de campo: existem coordenadoras que gerenciam **até 15 unidades de retirada** numa
mesma organização (mesmo catálogo, mesmo período — "unidade" aqui é local de entrega/retirada,
não organização separada; confirmado que multi-org de verdade não existe no sistema, só
single-org por login). Verifiquei os 3 fluxos de criação de pedido e **nenhum exigia de fato**
escolher a unidade certa — o campo nunca ficava vazio (sempre pré-selecionado com a primeira da
lista, ordenada por `ordem`), então nada travava se ninguém tocasse nele. Risco real: pedido
criado sem atenção ia parar silenciosamente na unidade #1 de até 15.

**Correção aplicada**:
- `ModalPedido`/`ModalColarPedido` (`App.jsx`, pedido manual e colado do WhatsApp): unidade nasce
  vazia (sem default), `<select>` ganhou opção placeholder "Selecione a unidade de retirada *", e
  `handleSave`/`confirmar` bloqueiam salvar sem escolha — mesmo padrão já usado pra nome do
  cliente.
- `CatalogoApp.jsx` (catálogo público): já existia uma validação (`if (!clienteDados.unidade)`)
  que nunca disparava porque o campo vinha pré-preenchido com `unis[0]?.nome` pra quem nunca
  comprou antes. Removido só esse fallback — **cliente que já comprou continua vendo a última
  unidade dele pré-selecionada** (pedido explícito do Junior: é conveniência real, normalmente é
  sempre o mesmo local). Cliente novo agora começa sem nada selecionado, e a validação que já
  existia passa a funcionar de verdade.
- `npx vite build` validado sem erro.
- **Status no GitHub: mesclada na `main`.** Commit do fix: `4f098f7`
  (branch `fix/unidade-obrigatoria-nos-pedidos`). Merge commit na `main`: `4d3b0ac`
  (`bd42db1..4d3b0ac`).

---

## Código morto de entrega removido (achado ao explicar o fluxo de Entregas)

Ao documentar como o sistema trata entregas, achei `entregarPedidoCombinado` (`App.jsx`): marcava
pedido como `entregue` **direto**, sem passar pelos 3 passos do `ModoEntrega` (ajustar itens,
forma de pagamento, troco). Estava conectada como prop em `PedidosScreen` e `EntregasScreen`, mas
**nenhum botão da UI a chamava** — inalcançável, e perigosa se algum dia fosse conectada por
engano: entregaria pedido sem registrar como ele saiu de verdade, quebrando o Resumo/Fechamento
(que depende de itens ajustados + pagamento + troco pra faturamento real).

**Removida** (função + as duas props + os dois parâmetros nas assinaturas dos componentes). Único
caminho de entrega continua sendo o `ModoEntrega` completo. `npx vite build` validado sem erro.

**Status no GitHub: mesclada na `main`.** Commit do chore: `77149f6`
(branch `chore/remove-entregarPedidoCombinado-morto`). Merge commit na `main`: `37af194`
(`67f4b76..37af194`).

---

## Nome/telefone/unidade visíveis nas 3 etapas do fluxo de entrega

Ao verificar o `ModoEntrega` (achado documentado no bloco anterior), ficou claro que nome do
cliente aparecia nas 3 etapas, telefone só na etapa 1, e **unidade de retirada em nenhuma delas**
— inclusive na etapa 3 (confirmação final, o clique que fecha o pedido de verdade). Com
coordenadora gerenciando até 15 unidades, perder essa referência no meio do fluxo é risco real de
confusão entre pedidos.

**Correção aplicada** (`ModoEntrega`, `App.jsx`): header padronizado nas 3 etapas — nome (linha
principal), telefone (quando existe) e `📍 unidade` sempre visíveis, do início ao fim da entrega.
`npx vite build` validado sem erro.

**Status no GitHub: mesclada na `main`.** Commit da feature: `c1fc23e`
(branch `feat/mostra-cliente-unidade-em-toda-entrega`). Merge commit na `main`: `20eca6f`
(`51af97a..20eca6f`).

---

## Fechamento de período — como funciona hoje (levantamento)

Documentando pra não perder: **fechamento é por organização inteira, nunca por unidade
religiosa.** `periodos` só tem `org_id`, sem relação com `org_unidades` — arquivar um período
trava todos os pedidos/produtos daquele mês, de todas as unidades juntas. O botão "📦 Arquivar"
só aparece na aba Fechamento quando ela **não** está olhando o período corrente — ou seja, não
existe "encerrar o mês agora": o mês vira passado sozinho quando ela importa uma tabela nova de
mês diferente (`criarPeriodoComCopia`), e só depois disso, navegando até aquele período antigo,
é que aparece a opção de arquivar de verdade.

## Prática real trazida pelo Junior: unidades não fecham todas juntas

Coordenadora que cuida de várias unidades (até 15) não fecha todas ao mesmo tempo — tem casos de
unidades próximas onde ela soma os pedidos de X, Y, Z e manda **um pedido consolidado** pra Korin.
Depois de mandar, ninguém deveria mais conseguir criar pedido novo pra essas unidades específicas.
Isso não existia no sistema (só existia abrir/fechar o período inteiro). Duas frentes de solução
discutidas — a segunda (encerramento por unidade) foi implementada nesta rodada; a primeira
(export consolidado somando unidades pra Korin) fica pendente:

1. **Export consolidado por seleção livre de unidades** (Fechamento → XLSX) — ainda não
   implementado. Hoje o export já deixa marcar quais unidades incluir, mas gera uma aba por
   unidade; falta o modo "uma aba só, somando as unidades marcadas", pro caso de pedido único
   consolidado.
2. **Encerrar pedidos por unidade — implementado nesta rodada** (ver bloco abaixo).

## Encerramento de pedidos por unidade — implementado

**Correção aplicada**:
- Migration no Supabase (`nbfvkmdcbfvgpqpvvspv`): `org_unidades` ganhou coluna `aberto` (boolean,
  default `true`) — interruptor manual, não data de corte automática (ela decide na hora que
  manda o pedido pra Korin, não precisa programar com antecedência).
- `src/lib/unidades.js`: `getUnidades`/`addUnidade` retornam o campo; `setUnidadeAberto(id, aberto)`
  novo.
- `UnidadesManager.jsx`: botão "🔒 Encerrar pedidos desta unidade" / "🔓 Reabrir" em cada unidade,
  com confirmação só pra fechar (reabrir é reversível). Unidade encerrada fica marcada
  visualmente (borda âmbar + aviso) — inclusive vira o mecanismo de "exceção": se ela precisar
  lançar algo manual depois de fechar, reabre, lança, fecha de novo — sem precisar de um caminho
  separado de override.
- **Bloqueia só pedido NOVO, nos 3 caminhos** (catálogo público, manual, colado do WhatsApp) —
  nunca trava pedido que já existia antes de encerrar (continua editável e vai pra Entregas
  normalmente, senão travaria a entrega de quem já comprou).
- `ModalPedido`/`ModalColarPedido` (`App.jsx`): `<select>` desabilita unidade encerrada com aviso;
  bloqueio antes de salvar; autocomplete de cliente não preenche sozinho uma unidade que foi
  encerrada nesse meio-tempo.
- `CatalogoApp.jsx`: unidade encerrada aparece **desabilitada com aviso**, não some — evita
  confusão de cliente que não entende por que o local sumiu. Última unidade comprada não é
  reaproveitada como pré-seleção se foi encerrada.
- `api/pedido.js`: revalida no servidor, nunca confia no cliente — mesmo padrão já usado pra
  período/prazo.
- `npx vite build` validado sem erro.
- **Status no GitHub**: branch `feat/encerrar-pedidos-por-unidade`, commit `1b331b9`, aguardando
  merge — atualizar este bloco com o SHA do merge assim que for mesclado.

---

## Pendente / próximos passos

1. **Testar de verdade no app**: upload de uma planilha real, conferir se a IA classifica bem as
   categorias, se o preview mostra tudo certo, se salva corretamente. Testar também o bloqueio de
   remoção de produto com pedido vinculado, o aviso de código reaproveitado, e o novo selo de
   "fora da tabela" (Produtos e Embalagens).
2. **Decidir se o catálogo público também deve sinalizar/esconder produto "fora da tabela"** —
   hoje ele continua comprável por qualquer cliente novo mesmo sem estar na última importação.
3. **Atualizar o artefato publicado** com a feature de importação por planilha e com os gaps de
   integridade produto↔pedido (documentado em markdown no repo, artefato visual ainda não
   reflete).
4. **Gap de offline-first do Sistema 2** (identificado no comparativo): existe uma proposta
   técnica desenhada (fila de escrita por "intenção", documentada no artefato) mas **nada foi
   implementado**. Ainda não há decisão de seguir com isso.
5. **Próximas partes do fluxo de campo ainda não totalmente levantadas**: como os outros
   coordenadores captam pedido dos membros (coberto), como fecham/enviam o consolidado pra Korin
   (levantamento feito, encerramento por unidade implementado — falta o export consolidado
   somando unidades, item 7).
6. **Aguardando o Junior trazer o requisito de uso futuro do cadastro de clientes** — a base
   (tabela + upsert automático + autocomplete) já está funcionando, mas nenhuma tela de gestão foi
   desenhada de propósito, até saber o que de fato vai ser construído em cima disso.
7. **Export consolidado por seleção de unidades** (Fechamento → XLSX) — somar quantidades de
   unidades marcadas numa aba só, em vez de uma aba por unidade, pro caso de pedido único
   consolidado pra Korin (ver bloco "Prática real trazida pelo Junior" acima).
8. **Testar de verdade o encerramento por unidade**: fechar uma unidade e confirmar que bloqueia
   pedido novo nos 3 caminhos (catálogo, manual, colado) sem travar pedido/entrega já existente;
   testar reabrir.

---

## Nota operacional sobre sessões múltiplas

O acesso de escrita ao GitHub do Sistema 1 e do Sistema 2 fica em sessões Claude Code separadas
(cada uma criada com um repositório diferente como fonte). Usar duas sessões ao mesmo tempo pra
coordenar merges de produção (relay de patch entre sessões, confirmações duplicadas) se mostrou
improdutivo. Recomendação: trabalhar cada sistema direto na sessão que já tem acesso de escrita
ao repo correspondente, trazendo este arquivo como contexto inicial quando for preciso retomar em
outra sessão.
