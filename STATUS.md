# STATUS — Clube de Compras Korin (Sistema 2)

> Status vivo do projeto. Atualizar a cada mudança relevante (merge feito, feature nova, decisão
> tomada, teste realizado) e sempre commitar na `main` — é o mecanismo pra qualquer sessão nova
> retomar o contexto sem o Junior precisar reexplicar tudo de novo.
>
> Última atualização: 22/08/2026. Resumo das entregas recentes (detalhes em cada seção abaixo):
> gaps de integridade produto↔pedido corrigidos; cadastro leve de clientes; unidade de retirada
> obrigatória; encerramento por unidade + export consolidado; renomear/excluir unidade corrigidos;
> **link de entrega por PIN pro representante da unidade** (separação/entrega sem login completo);
> **sobra do período anterior + confirmação de compra real** enviada pra Korin (substitui a
> estimativa, é só informativo); **logo oficial nova** em todo o sistema (headers, ícones PWA,
> favicon novo, imagem de compartilhamento); **página inicial reformulada** com prints reais em
> vez de mockup e nova seção de entrega por unidade; **terminologia oficial trocada em todo
> texto visível pro usuário**: "coordenadora" → "Dedicante" (forma curta de "Dedicante do Clube
> de Compras"), "cliente" → "membro" — não mexeu em nome de variável/coluna do banco;
> **Dashboard do Fechamento ganhou ticket médio, membros atendidos e comparativo com o período
> anterior** (membros/ticket/produtos vendidos, sempre em cima de pedido entregue), com barra
> proporcional em CSS puro nos rankings — sem instalar biblioteca de gráfico; **auditoria
> completa de responsividade** (mobile/tablet/desktop) em todas as telas do app e na landing
> page — único problema real encontrado (overflow do filtro de Pedidos no mobile) corrigido;
> **reenvio automático offline nos 2 pontos "de rua"** (checkout do catálogo pelo membro,
> confirmação de entrega pelo representante) — se a conexão cair no meio da ação, ela é
> guardada no aparelho e reenviada sozinha quando a internet voltar, com id de idempotência
> pro pedido novo do catálogo nunca duplicar; correções pequenas de UX no painel real (logo
> na tela de login, destaque no botão Entregar, plural e duplicação no Dashboard) e um bug
> real de auth corrigido (a tela resetava sozinha toda vez que voltava o foco da aba); e
> **desenho pronto (ainda não implementado) de estoque real não-travante + PDV ágil pra
> feira/culto** — falta só o Junior confirmar se seguimos pra construir (ver seção dedicada).

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

1. **Export consolidado por seleção livre de unidades** (Fechamento → XLSX) — **implementado**
   (ver bloco "Export consolidado" mais abaixo).
2. **Encerrar pedidos por unidade — implementado** (ver bloco abaixo).

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
- **Status no GitHub: mesclada na `main`.** Commit da feature: `1b331b9`
  (branch `feat/encerrar-pedidos-por-unidade`). Merge commit na `main`: `0f56e73`
  (`2049fb4..0f56e73`).

---

## Export consolidado (pedido único somando unidades) — implementado

Segunda parte da prática real trazida pelo Junior: coordenadora que agrupa unidades próximas
manda pra Korin um pedido só, com as quantidades somadas — não um por unidade.

**Correção aplicada** (`FechamentoScreen`, `App.jsx`):
- `montarLinhasExport` extraído da função de export original (soma itens por produto, calcula
  embalagens fechadas pra Korin) — agora reutilizável pelos dois modos.
- `exportarSeparado`: exatamente o comportamento que já existia (uma aba por unidade marcada,
  mesmo nome de arquivo `pedido-korin-{periodo}.xlsx`) — nada mudou pra quem já usa assim.
- `exportarConsolidado` (novo): soma os pedidos de todas as unidades marcadas numa aba só
  ("Consolidado"), arquivo `pedido-korin-consolidado-{periodo}.xlsx` (sufixo diferente pra não
  confundir com o separado).
- UI: reaproveita a mesma seleção de unidades que já existia (checkboxes) — dois botões diretos,
  "📦 Pedido único (soma as unidades marcadas)" e "📄 Separado por unidade (uma aba cada)", em vez
  de um interruptor + confirmação. Resolve em 1 toque.
- `npx vite build` validado sem erro.
- **Status no GitHub: mesclada na `main`.** Commit da feature: `08c5e35`
  (branch `feat/export-consolidado-por-unidades`). Merge commit na `main`: `8120d9f`
  (`f8336ea..8120d9f`).

---

## Matemática das planilhas — validada

O Junior pediu conferência da conta das planilhas de export (Fechamento → XLSX). Simulei
`montarLinhasExport` com Node e casos numéricos concretos (não só li o código):

- Soma de quantidade por produto, inclusive somando entre unidades diferentes no consolidado: ✅
  correto.
- Arredondamento pra caixa fechada (`Math.ceil`): ✅ correto — 15un com caixa de 12 vira 2 caixas
  (24un), nunca fração.
- Custo total usa a quantidade **arredondada pra caixa fechada** (o que ela paga a Korin de
  verdade); venda total usa a quantidade **exata pedida** (o que ela cobra do cliente) — bases
  diferentes de propósito, confirmado correto.
- Produto sem custo/sem `qtdCaixa` cadastrado: fica em branco, não quebra nem gera `NaN`.
- **Testei o cenário que motiva juntar unidades**: unidade A pede 5un, unidade C pede 4un
  (caixa=12). Separado = 1+1 = 2 caixas (R$ 228). Consolidado = 1 caixa só (R$ 114) — a planilha
  captura a economia real de arredondamento que justifica consolidar.

**Achado durante a validação (não é bug novo, é comportamento pré-existente)**: pedido com
`unidade` em branco, ou com nome que não bate mais com nenhuma `org_unidades` cadastrada (ex:
unidade renomeada/excluída depois do pedido feito), fica de fora de **qualquer** exportação,
silenciosamente — porque os checkboxes vêm de `org_unidades`, não dos pedidos. Checagem no banco
confirmou zero pedido órfão hoje (organização ainda em fase de teste, sem pedido real). Esse
achado motivou a correção abaixo.

## Renomear unidade propaga; excluir bloqueia com histórico — implementado

`unidade` em `korin_pedidos` e `clientes` é texto solto, nunca foi migrado pra FK — excluir ou
renomear uma unidade sem cuidado deixa pedido antigo "grudado" no nome velho, sumindo de
filtro/export silenciosamente (achado documentado acima).

**Correção aplicada** (`src/lib/unidades.js`, `UnidadesManager.jsx`):
- `updateUnidade` agora propaga o rename pra `korin_pedidos` e `clientes` que referenciavam o
  nome antigo. Pedido de período **arquivado** não é tocado — bloqueado pela própria RLS
  (`periodo_editavel`), o que é o comportamento certo: histórico fechado não deveria mudar
  retroativamente.
- `deleteUnidade` bloqueia excluir **só quando a unidade tem pedido no histórico**
  (`unidadeTemHistorico`, qualquer status) — decisão deliberada de não bloquear sempre: unidade
  cadastrada por engano ou nunca usada continua podendo ser excluída livremente. Erro claro
  explica o motivo e sugere renomear ou encerrar em vez de excluir.
- `npx vite build` validado sem erro.
- **Status no GitHub: mesclada na `main`.** Commit do fix: `cbbcb0a`
  (branch `fix/renomear-com-propagacao-e-bloquear-exclusao`). Merge commit na `main`: `9a8ddba`
  (`cffed90..9a8ddba`).

---

## Link de entrega por PIN pro representante da unidade — implementado

**Contexto trazido pelo Junior**: nem toda coordenadora entrega pessoalmente. Em algumas
unidades, um representante local pega o lote de pedidos daquela unidade num dia combinado e
entrega pros clientes de lá — a coordenadora não está presente pra separar/dar baixa.

**Opção escolhida (dentre 3 propostas)**: link público por unidade, protegido por PIN, sem
login completo, reaproveitando a mesma lógica de negócio do `ModoEntrega` do painel — a lista
de pedidos pendentes da unidade serve tanto de lista de separação quanto de tela de confirmação
de entrega, escrevendo na mesma tabela `korin_pedidos` que a coordenadora já vê em tempo real.

**Decisões confirmadas pelo Junior**: PIN variável por unidade (não fixo pro grupo todo);
registra quem confirmou cada entrega (`entregue_por`); link deve ser instalável como PWA igual
ao catálogo.

**O que foi construído**:
- **Banco** (migração `add_pin_entrega_e_entregue_por`, já aplicada em produção):
  `org_unidades.pin_entrega` (texto, nulo = link ainda não habilitado nessa unidade) e
  `korin_pedidos.entregue_por` (texto). A política pública de `org_unidades` foi trocada por uma
  view `org_unidades_publicas` (sem `pin_entrega`) com `GRANT SELECT` pra `anon` — mesmo padrão
  já usado em `organizacoes_publicas`, garantindo que o PIN nunca vaza pra leitura anônima.
  `CatalogoApp.jsx` foi migrado pra ler dessa view (`getUnidadesPublicas`) em vez da tabela
  direta, que passou a exigir login.
- **`UnidadesManager.jsx`**: cada unidade agora tem um bloco "Link de entrega (representante)" —
  botão pra gerar (PIN de 4 dígitos aleatório), link copiável (`/{slug}/entrega?u={unidadeId}`),
  e botão pra trocar o PIN a qualquer momento (ex: trocou o representante).
- **`api/entrega-lista.js`** e **`api/entrega-confirmar.js`**: endpoints públicos (service_role,
  mesmo padrão de `api/pedido.js`) que revalidam PIN + unidade + organização + período corrente
  no servidor antes de listar ou alterar qualquer pedido — nunca confiam no que o cliente manda.
- **`entrega.html` / `src/entrega.jsx` / `src/EntregaApp.jsx`**: nova página pública. Tela de
  entrada pede nome do representante + PIN (ambos salvos no `localStorage` do aparelho pra não
  pedir de novo); depois mostra a lista de pendentes/entregues da unidade (mesmo formato da tela
  "Entregas" do painel) e reaproveita o fluxo de 3 etapas (ajustar itens → pagamento →
  confirmação) — só que gravando via API pública em vez do cliente Supabase autenticado.
  Instalável como PWA (`api/manifest-entrega.js` + `public/sw-entrega.js`, `start_url` já carrega
  o id da unidade pra abrir direto nela).
- **Painel da coordenadora**: `finalizarEntrega` (`App.jsx`) agora grava `entregue_por` com o
  nome da coordenadora (`org.responsavelNome`) quando ela mesma confirma a entrega; a lista
  "Entregues" mostra "Por {nome}" quando preenchido.
- `npx vite build` validado sem erro.
- **Status no GitHub: mesclada na `main`.** Commit do fix/feature: `03aee7d`
  (branch `feat/entrega-representante-por-unidade`). Merge commit na `main`: `b700503`
  (`4e3e46f..b700503`).

---

## Sobra entre caixa fechada e pedido real + compra confirmada — implementado

**Contexto trazido pelo Junior**: a Korin só vende caixa fechada. Se venderam 15 unidades de um
produto e a caixa vem 10, ela compra 2 caixas (20 un.) e sobra 5, que hoje ela controla de
cabeça/no papel — o sistema não guardava esse número em lugar nenhum, e ele se perdia a cada
período novo (pior ainda: `criar_periodo_com_copia` copiava `caixas_abertas` cru do período
anterior pro novo, sem descontar o que já tinha sido vendido — um número enganoso, não a sobra
real). Separado disso, também identificamos que o sistema nunca registrava o que foi de fato
**comprado/recebido** da Korin — só a estimativa calculada a partir dos pedidos.

**Decisão de escopo** (confirmada pelo Junior): implementar só isso agora — carry-forward de
sobra + confirmação de compra real — **sem tocar no PDV/estoque persistente por unidade**
(ficou registrado como ideia pra quando houver mais clareza de quantas coordenadoras operam em
modo "feira" contínua, ver Pendente). E confirmado explicitamente: **isso é só controle,
não trava nada** — a sobra é só informativa; quem decide quantas caixas marcar como abertas
continua sendo a coordenadora.

**O que foi construído**:
- **Banco**: `periodo_produtos.compra_confirmada_und` (unidades, nulo = usa estimativa) e
  `compra_confirmada_unidades` (texto[], nomes das unidades que aquela compra atende —
  informativo). Deliberadamente fora do upsert genérico de produto (`produtoToDb`) — só
  `registrarCompraConfirmada()` escreve nessas colunas, pra edição comum de embalagem ou
  reimportação de catálogo nunca apagar sem querer.
- **`getSobraPeriodoAnterior(orgId, periodoAtualId)`** (`src/lib/periodos.js`): busca o período
  arquivado mais recente da org, calcula sobra por produto = `compra_confirmada_und` (se
  existir) ou estimativa (pedidos arredondados pra caixa fechada) **menos** o total pedido
  naquele período. Mostrado como badge informativo na aba Web → Produtos/Embalagens: "📦
  Sobrou N un. do período anterior — considere antes de marcar caixas abertas". Não altera
  `caixasAbertas` sozinho, não bloqueia nada.
- **`registrarCompraConfirmada(periodoId, itens, unidadesAtendidas)`**: registra a quantidade
  real comprada, casada por código de produto. **Sempre substitui** o que já estava gravado
  pro período (não soma) — decisão explícita do Junior.
- **Reimportação da planilha realmente enviada pra Korin** (aba Web → Resumo → "📥 Confirmar o
  que foi realmente comprado"): reaproveita o mesmo parser da importação de catálogo
  (`parseTabelaKorin`), agora também lendo a coluna `QTDE (CX)` (coluna D — a que a Korin deixa
  em branco pra coordenadora preencher e devolver). Mostra pré-visualização antes de salvar
  (código, quantidade, produtos não encontrados no catálogo) e pede pra marcar quais unidades
  aquele envio atende, antes de confirmar.
- **Coluna `QTDE (CX)` = coluna D confirmada pelo Junior** — a inferência (feita a partir da
  estrutura já validada do parser, sem testar contra arquivo real) estava certa.
- `npx vite build` validado sem erro.
- **Status no GitHub: mesclada na `main`.** Commit da feature: `21f9aa8`
  (branch `feat/sobra-e-compra-confirmada`). Merge commit na `main`: `2741a2e`
  (`783e61d..2741a2e`).

---

## Logo oficial nova aplicada em todo o sistema — implementado

O Junior forneceu a logo oficial (`public/logo_clube_compras_korin.png`, 295×195, fundo branco),
substituindo a marca antiga (o "pote/lata Korin" que era usada até então). Aplicada em:

- **Headers do app**: painel (`App.jsx`), catálogo público (`CatalogoApp.jsx`), tela de entrega
  por PIN (`EntregaApp.jsx`), home (`Home.jsx`) e ajuda (`Ajuda.jsx`) — logo em tamanho natural
  nos espaços largos (`h-X w-auto`).
- **Ícones PWA e favicon**: como a logo nova é retangular (a antiga era praticamente quadrada),
  gerada uma versão quadrada derivada com margem de segurança (fundo branco, logo ocupando ~60%
  do canvas, centralizada) — usada em `icon-192.png`, `icon-512.png` (mantém `purpose: maskable`
  sem cortar o desenho) e no novo `apple-touch-icon.png` (180×180). **Favicon não existia antes**
  — criado `favicon.ico` (16/32px) + fallback PNG, linkado em todas as páginas.
- **Espaços quadrados inline** (ícone de instalação no banner PWA, badge de navbar em
  Home/Ajuda) trocados de `/logo-korin.png` pra `/icon-192.png` — usar a logo retangular ali
  esticaria/cortaria o desenho.
- **Compartilhamento de link no WhatsApp** (`og-image.png`, 1200×630): banner de marketing já
  existente mantido, só o badge pequeno da logo (canto superior esquerdo) foi recortado e
  substituído pela logo nova — não foi redesenhado do zero.
- **Cache dos service workers versionado** (`sw-catalogo.js` v1→v2, `sw-entrega.js` v1→v2,
  `sw.js` v7→v8) — sem isso, quem já tem o PWA instalado continuaria vendo os ícones antigos até
  o cache expirar sozinho.
- `npx vite build` validado sem erro; preview de `og-image.png`, `icon-192.png` e
  `apple-touch-icon.png` enviado pro Junior antes do merge.
- **Status no GitHub: mesclada na `main`.** Commit: `9a599e3`
  (branch `chore/atualiza-logo-clube-compras-korin`). Merge commit na `main`: `f33f18e`
  (`25c965f..f33f18e`).

---

## Página inicial: logo maior e prints reais em vez de mockups — implementado

**Contexto trazido pelo Junior**: a logo ficou pequena no nav depois da troca, e a ideia de
mostrar prints reais das telas do sistema (em vez de mockup desenhado) é um bom gatilho de venda
pra coordenadora que visita pela primeira vez — "era isso que eu tava procurando".

**O que foi feito**:
- **Nav**: logo completa (retangular, com "Clube de Compras") em vez do ícone pequeno recortado
  com o nome repetido do lado.
- **Hero**: o mockup falso (`ManifestCard`, componente desenhado à mão com "Sobra: 0" fixo) foi
  removido e substituído por um print real da tela de Fechamento/Resumo — mostra de verdade
  quantas caixas comprar, o que falta e a compra confirmada.
- **Nova seção "Separação por unidade"**: print real da lista de entrega que o representante vê
  pelo link com PIN (feature do dia anterior) — diferencial que nenhum fluxo manual de WhatsApp
  tem.
- **Copy reforçada**: seção "Foto + IA" agora menciona que a mesma planilha oficial da Korin
  serve tanto pra montar o catálogo quanto pra confirmar a compra depois; seção "Pro seu cliente"
  ganhou uma frase deixando explícito que a coordenadora não fica digitando pedido um por um.
- **Prints antigos corrigidos**: `screenshot-embalagens.jpg` e `screenshot-catalogo.jpg` tiveram
  a faixa com a logo antiga recortada — senão ficariam inconsistentes com a logo nova no resto da
  página.
- **Como os prints novos foram gerados**: sem acesso a login real, os componentes de tela usados
  (`TabResumo` de `WebScreen.jsx`, `TelaLista` de `EntregaApp.jsx`) foram temporariamente
  exportados, renderizados com dado fictício realista (nomes/telefones inventados, nunca dado de
  cliente real) numa página `showcase.html` descartável, capturados via Playwright e depois a
  página e as exportações temporárias foram revertidas — não sobrou nenhum código de teste no
  repositório.
- `npx vite build` validado sem erro; preview enviado pro Junior antes do merge.
- **Status no GitHub: mesclada na `main`.** Commit: `3fa7415`
  (branch `feat/landing-page-prints-reais`). Merge commit na `main`: `6210566`
  (`558fb56..6210566`).

---

## Terminologia oficial: "coordenadora" → "Dedicante", "cliente" → "membro" — implementado

**Pedido do Junior**: o termo correto pro papel da coordenadora é **"Dedicante"** (forma curta de
"Dedicante do Clube de Compras" — confirmado que "Dedicante" sozinho está certo pra uso corrente,
igual "coordenadora" nunca foi escrito por extenso antes). O cliente final vira **"membro"**.

**O que foi trocado**: todo texto **visível pro usuário** — Home, Ajuda, painel (`App.jsx`),
catálogo público (`CatalogoApp.jsx`), tela de entrega por PIN (`EntregaApp.jsx`),
`WebScreen.jsx`, `UnidadesManager.jsx`, `Login.jsx`. Mapeamento feito com grep em todo `src/` (17
arquivos tinham "cliente" ou "coordenador" em algum lugar) e revisado ocorrência por ocorrência.

**O que ficou como estava (deliberado)**: identificadores internos — `clienteNome`, `clienteTel`,
a tabela `clientes` e colunas `cliente_nome`/`cliente_tel` no banco, funções como
`listarClientes`/`upsertCliente`, e comentários de código. Mexer nisso seria migração de banco +
risco de quebrar referência em cascata, sem nenhum ganho — ninguém vê essas strings, só o texto
renderizado na tela importa pro pedido do Junior.

**Aproveitado o embalo pra fechar 2 gaps encontrados numa revisão completa de Home e Ajuda** (a
pedido do Junior, que perguntou se eu tinha analisado as páginas inteiras — não tinha, revisei na
hora): "Como funciona" na Home não citava a Entrega (a página já tinha seção dedicada a isso mais
abaixo); FAQ da Home e da Ajuda não mencionavam entrega por PIN nem confirmação de compra real; a
Ajuda tinha o nav no padrão antigo (ícone pequeno + nome repetido) e passo-a-passo desatualizado.

- `npx vite build` validado sem erro; nav da Ajuda conferido visualmente antes do merge.
- **Status no GitHub: mesclada na `main`.** Commit: `2847545`
  (branch `feat/terminologia-dedicante-membro`). Merge commit na `main`: `a03c064`
  (`f1d7530..a03c064`).

---

## Dashboard: ticket médio, membros atendidos e comparativo com período anterior — implementado

**Contexto trazido pelo Junior**: perguntou o que já existia de acompanhamento no Fechamento
(valores, preços, pedidos, membros) — mapeei tudo que já tinha (Resumo e Dashboard) e identifiquei
4 gaps: sem ticket médio, sem contagem de membros filtrável por unidade que já respeitasse o
filtro (na real já respeitava, só não tinha ticket médio), sem comparação membros/produtos entre
o mês atual e o anterior, e **nenhum gráfico** — o `package.json` não tinha biblioteca de gráfico
nenhuma instalada, e não tinha nenhum SVG/barra desenhada na mão em lugar nenhum do app.

**Decisão confirmada pelo Junior**: fechar os 3 gaps de dado, sempre em cima de pedido
**entregue** (pendente ainda pode mudar, não é venda realizada) — e também comparativo de
produtos vendidos mês × mês anterior, com filtro.

**O que foi construído**:
- **`src/lib/periodos.js`**: extraída `getPeriodoAnteriorArquivado(orgId, periodoAtualId)`,
  compartilhada entre `getSobraPeriodoAnterior` (feature de ontem) e a nova
  `getComparativoPeriodoAnterior(orgId, periodoAtualId)` (retorna produtos+pedidos crus do
  período anterior, sem filtrar — quem chama aplica o mesmo filtro que já está usando no atual).
  **Correção de bug junto**: a busca antes pegava "o arquivado mais recente que não é o atual",
  o que dava errado ao visualizar um período histórico antigo (pegava o mês passado em vez do
  mês *imediatamente anterior ao período visualizado*) — agora compara por `created_at <`.
- **`DashboardScreen` (`App.jsx`)**: novos cards "Membros atendidos" e "Ticket médio", os dois só
  com pedido `entregue`, respeitando o filtro de unidade/origem já existente na tela. Novo bloco
  "Comparativo com o período anterior": membros atendidos e ticket médio lado a lado, e produtos
  vendidos casados por **código** (não por ID, que muda a cada período) — trata certo produto
  novo (sem histórico anterior) e produto que saiu do catálogo (sem venda no período atual),
  ordenado pela maior variação absoluta primeiro.
- **`BarraProporcional`**: barra em CSS puro (só `width: %`, sem SVG nem lib) — aplicada nos
  rankings que já existiam (top produtos, ranking unidades, que eram só texto antes) e nos
  comparativos novos. Decisão deliberada de não instalar biblioteca de gráfico — o bundle do
  painel já é o maior do build (`592KB`), e o resto do app inteiro é Tailwind à mão.
- **Validação**: matemática conferida com script Node espelhando a lógica exata do componente —
  11 checagens (pedido pendente/cancelado excluído do "entregue", produto novo, produto que saiu
  do catálogo, ordenação por maior variação), todas passaram. Visual conferido via harness
  descartável (só os cards que não dependem de rede — o comparativo em si depende de dado real do
  Supabase, não testado com conta de verdade).
- `npx vite build` validado sem erro.
- **Status no GitHub: mesclada na `main`.** Commit: `ee2207d`
  (branch `feat/dashboard-comparativo-periodo-anterior`). Merge commit na `main`: `8340d4f`
  (`720d937..8340d4f`).

---

## Auditoria de responsividade (mobile/tablet/desktop) — implementado

**Pedido do Junior**: revisar responsividade em toda a página inicial e em todas as telas/abas do
sistema — sem elemento truncado, sobreposto ou escondido, fácil de usar em desktop, tablet e
principalmente smartphone. Explícito: não alterar o que já estava bom, e não mexer no tamanho das
fontes (estavam ótimas).

**Método**: componentes normalmente inacessíveis sem login real (Supabase não configurado neste
ambiente) foram temporariamente exportados e renderizados numa página `showcase.html` descartável
com dado fictício realista, capturados via Playwright em 3 larguras (390px mobile, 768px tablet,
1440px desktop) — 23 telas/modais do app, mais Home e Ajuda direto pelas rotas reais. No fim, os
`export` temporários e a página descartável foram revertidos; não sobrou código de teste no repo.

**Achado real**: na tela de Pedidos, no mobile, a linha de filtros (Todos/Pendentes/Entregues +
seletor de unidade + botão Imprimir) ultrapassava a largura da tela e cortava os últimos itens
(773px capturado contra 585px de viewport). Corrigido com `flex-wrap` na `App.jsx` — quebra pra
uma segunda linha só quando necessário, sem alterar tablet/desktop nem o resto do visual.

**Falso positivo descartado**: os botões flutuantes (Colar/+) e a barra fixa "Ver carrinho"
pareciam sobrepor cards nas capturas de página inteira — mas é artefato do método de screenshot
(`position: fixed` gravado uma vez na posição relativa ao viewport, não à rolagem real). Conferido
no CSS que o espaço já é reservado embaixo (`pb-36`/`pb-32` nos `<main>` correspondentes) — não é
bug, não foi alterado.

**Resto revisado, sem problema**: Entregas, Modo de Entrega, Produtos, Fechamento (Resumo +
Dashboard), os 4 modais de Pedidos (editar, colar do WhatsApp, detalhe, confirmar compra), os 5
tabs da aba Web, as 5 telas do catálogo público, as 3 telas da entrega por PIN, o cartão de link
de entrega do `UnidadesManager`, e Home/Ajuda — todos limpos nas 3 larguras.

- `npx vite build` validado sem erro.
- **Status no GitHub: mesclada na `main`.** Commit do fix: `674ab00`
  (branch `fix/responsividade-filtro-pedidos-mobile`). Merge (PR #2): `95b48b8`
  (`f42b2f9..95b48b8`). Deploy de produção no Vercel confirmado (`dpl_BtnaM1GTvonrVTmLRSB1bi7muVUY`,
  `READY`).

---

## Reenvio automático offline: checkout do catálogo e confirmação de entrega — implementado

**Contexto**: ao investigar o gap de offline-first (item pendente 6, ver abaixo), identificamos
que os dois momentos "de rua" do sistema — membro fechando pedido no catálogo público,
representante confirmando entrega na porta — dependiam de chamada direta ao Supabase/API em
tempo real, sem nenhuma persistência local. Se a conexão caísse no meio da ação, a pessoa via só
um erro genérico e precisava refazer tudo manualmente, sem garantia de lembrar de voltar depois.

**Decisão de escopo** (confirmada pelo Junior, depois de avaliar a proposta): não vale a pena um
offline-first completo agora (engenharia pesada pra um sistema ainda em validação) — mas os dois
pontos de maior atrito mereciam uma solução leve: guardar a última ação localmente e reenviar
sozinho quando a conexão voltar, sem virar uma fila genérica.

**O que foi construído**:
- `src/lib/offlinePendente.js` (novo): helper de leitura/escrita de **1 pendência por chave** no
  `localStorage` (não é fila com N itens) + gerador de UUID pra idempotência.
- `src/lib/store-web.js` (`criarPedidoCliente`): passa a distinguir falha de rede (`fetch` nem
  chegou a ter resposta — `semConexao: true`) de erro de validação/servidor (esse continua
  mostrando erro normal, nunca é reenviado às cegas).
- **Catálogo público** (`src/CatalogoApp.jsx`): pedido novo ganha `clientRequestId` (UUID) antes
  de enviar; se falhar por falta de rede, o pedido é salvo local e reenviado sozinho no evento
  `online` do navegador ou ao reabrir a página. Edição de pedido existente não precisa disso — já
  é idempotente por ter `id` real. Banner âmbar na tela de pagamento avisa "seu pedido foi
  guardado neste aparelho, pode fechar o app".
- **Entrega por PIN** (`src/EntregaApp.jsx`): mesmo padrão, mas mais simples — confirmar entrega é
  um `update` por `pedidoId`, já naturalmente idempotente por si (reenviar de novo não duplica
  nem corrompe nada), não precisou de id extra. Banner "1 confirmação aguardando envio" na lista
  de pedidos da unidade.
- **`api/pedido.js` + migration no Supabase** (`nbfvkmdcbfvgpqpvvspv`): `korin_pedidos` ganhou
  coluna `client_request_id` (índice único parcial, só quando não nulo). Pedido novo com esse id
  faz `upsert` por ele em vez de sempre inserir — se a 1ª tentativa já tinha chegado no servidor
  mas a resposta se perdeu por queda de conexão, o reenvio automático atualiza a MESMA linha em
  vez de criar pedido duplicado.
- **Fora do escopo, deliberado**: fila de múltiplas ações, Background Sync API (suporte
  inconsistente em iOS Safari), telas do Dedicante (produtos/embalagens) — risco bem menor ali,
  continuam exigindo conexão normalmente.
- `npx vite build` validado sem erro; lógica de `localStorage`/idempotência testada isolada em
  Node (round-trip do payload, unicidade do UUID, limpeza do slot); os dois banners novos
  conferidos visualmente em mobile via harness descartável (revertido, não sobrou no repo).
- **Limitação conhecida**: teste end-to-end com conexão real (simular modo avião no meio do
  checkout/confirmação e conferir reenvio sem duplicar) não foi possível neste ambiente — sem
  credenciais Supabase configuradas na sessão. Fica como próximo passo de teste real (ver
  Pendente).
- **Status no GitHub: mesclada na `main`.** Commit da feature: `7698201`
  (branch `feat/reenvio-offline-catalogo-e-entrega`). Merge (PR #3): `68432ae`
  (`1e294c8..68432ae`). Deploy de produção no Vercel confirmado
  (`dpl_EDmYVqrSBRz1mmaLE6c2M9LFiYGn`, `READY`).

---

## Estoque real (não-travante) + PDV ágil pra feira/culto — desenho pronto, aguardando "sim" pra construir

**Pedido do Junior**: 2 soluções interligadas, ainda **não implementadas** — só desenhadas e alinhadas
com ele nesta sessão. Não mexer em nada até ele confirmar que quer seguir.

### 1. Estoque real, baseado no que foi comprado de verdade — sem travar nada

Hoje a sobra (`getSobraPeriodoAnterior`) é só um aviso estático mostrado no início do período
seguinte, na aba Embalagens — a coordenadora vê o número e decide manualmente quantas caixas abrir.
Não é um valor "vivo": não é consultado durante o mês, não é usado por mais nada.

**Desenho**: virar um número vivo, consultado o tempo todo (não só como aviso no início do mês):

```
estoque disponível (produto) =
    sobra real do período anterior (baseada em compra_confirmada_und, quando existe)
  + caixas abertas neste período × un. por caixa
  − tudo que já foi vendido neste período (pedido normal + PDV, os dois contam)
```

- **Sempre prioriza o dado real**: assim que `compra_confirmada_und` do período atual existir, vira o
  teto de referência no lugar da estimativa de caixas abertas — mesmo princípio que a sobra já usa
  hoje, só que passando a valer durante o mês inteiro, não só no início do seguinte.
- **Nunca bloqueia**: o número pode ficar negativo (vendeu além do que tinha) sem impedir a venda —
  só muda de cor (verde → âmbar → vermelho) como aviso visual. Quem decide se aquilo é problema é a
  coordenadora, o sistema só avisa.
- Onde aparece: aba Produtos/Embalagens (no lugar do aviso estático de hoje) e dentro do PDV
  (item 2), mostrando "restam N" em cada produto durante a venda.

### 2. PDV ágil pra feira e dia de culto

Cenário real: fila de gente, pouco tempo por pessoa, sinal de internet às vezes ruim (igreja/salão
comunitário), e quem opera pode ter pouca prática de tecnologia — tudo pensado com esses 3
condicionantes.

**Modo à parte, não uma aba a mais**: botão bem visível ("🎪 Iniciar venda no local") que abre uma
tela cheia, sem o menu de baixo do sistema, com "Sair" bem claro — mesmo padrão de tela-cheia que o
Modo Entrega já usa, pra ninguém se perder navegando no meio da venda.

**3 passos, dados do membro por último** (de propósito — não atrasar quem só quer "pegar e pagar"):
1. Grade de produtos (toca, soma no carrinho — reaproveita o visual do catálogo público que já
   existe), cada item mostrando "restam N" vindo do estoque real do item 1.
2. Busca ou cadastro rápido do membro (reaproveita o autocomplete que já existe em `clientes`;
   telefone opcional pra não travar venda rápida).
3. Forma de pagamento (botões grandes, reaproveita os do catálogo) + confirmar — grava o pedido
   já **entregue** na hora (não fica pendente esperando entrega depois — na feira a entrega É a
   venda) e desconta do estoque na hora. Depois de confirmar, cai direto em "Nova venda" sem passar
   por menu nenhum, pra atender rápido o próximo da fila.

Reaproveita bastante coisa que já existe: cadastro leve de clientes, botões de pagamento do
catálogo, e principalmente o **reenvio automático offline** (feature de hoje) — faz muito sentido
aqui, já que feira/culto é exatamente onde a internet costuma falhar.

### Restrição confirmada pelo Junior — crítica pro desenho, ainda não incorporada na conta acima

**O PDV precisa usar o estoque da unidade religiosa específica onde a feira/culto está
acontecendo — não o estoque somado da organização inteira.** Hoje `caixas_abertas` e
`compra_confirmada_und` são um valor único por produto **por período**, sem nenhuma divisão por
unidade (`org_unidades`) — é um pool só pra organização toda. A conta do item 1 acima ("estoque
disponível") precisa ser refeita considerando isso: ou o estoque passa a ser rastreado por
produto **×** unidade (mudança de schema maior — divide `caixas_abertas`/`compra_confirmada_und`
por unidade), ou existe algum mecanismo de alocar/reservar uma fatia do estoque da org pra cada
unidade antes da feira/culto começar. **Ainda não desenhado** — é o próximo ponto a resolver antes
de começar a construir, não só um detalhe de UI do PDV.

### Perguntas em aberto (produto, não bloqueiam o desenho, mas mudam detalhes de implementação)

- Mais de um aparelho vendendo ao mesmo tempo na mesma unidade (duas pessoas ajudando na feira)?
  Muda como calcular "restam N" pra não mostrar número errado com venda simultânea.
- Vale identificar a venda como vinda do PDV separado dos outros pedidos (ex: `origem: 'pdv'`), ou
  pode entrar junto com os demais nos relatórios?

---

## Pendente / próximos passos

1. **Testar de verdade o comparativo do Dashboard com dado real**: abrir Fechamento → Dashboard
   com pelo menos 2 períodos arquivados na conta, conferir que "Comparativo com o período
   anterior" aparece com os números certos, testar trocando o filtro de unidade, e conferir o
   caso de só ter 1 período (comparativo não deve aparecer, sem erro).
2. **Testar de verdade o link de entrega por PIN**: gerar um link numa unidade, abrir como
   representante (nome + PIN), separar/entregar um pedido de teste e conferir que aparece em
   tempo real na tela "Entregas" do painel com `entregue_por` preenchido; testar PIN errado,
   trocar PIN e confirmar que o antigo para de funcionar, e a instalação como PWA a partir do
   link (deve abrir direto na unidade certa).
3. **Testar de verdade no app**: upload de uma planilha real, conferir se a IA classifica bem as
   categorias, se o preview mostra tudo certo, se salva corretamente. Testar também o bloqueio de
   remoção de produto com pedido vinculado, o aviso de código reaproveitado, e o novo selo de
   "fora da tabela" (Produtos e Embalagens).
4. **Decidir se o catálogo público também deve sinalizar/esconder produto "fora da tabela"** —
   hoje ele continua comprável por qualquer cliente novo mesmo sem estar na última importação.
5. **Atualizar o artefato publicado** com a feature de importação por planilha, com os gaps de
   integridade produto↔pedido, com o link de entrega por PIN e com o gap de estoque/compra
   confirmada (documentado em markdown no repo, artefato visual ainda não reflete).
6. **Gap de offline-first do Sistema 2** (identificado no comparativo): offline-first completo
   (fila de escrita por "intenção", documentada no artefato) segue sem decisão de seguir — mas os
   2 pontos de maior risco (checkout do catálogo, confirmação de entrega) já ganharam reenvio
   automático leve (ver seção acima). **Testar de verdade com conexão real**: simular modo avião
   no meio do checkout do catálogo e da confirmação de entrega, confirmar que o banner aparece,
   desativar modo avião e conferir que a ação chega sozinha sem duplicar — não foi possível testar
   isso neste ambiente (sem credenciais Supabase).
7. **Próximas partes do fluxo de campo ainda não totalmente levantadas**: como os outros
   coordenadores captam pedido dos membros (coberto), como fecham/enviam o consolidado pra Korin
   (levantamento feito, encerramento por unidade e export consolidado implementados).
8. **Aguardando o Junior trazer o requisito de uso futuro do cadastro de clientes** — a base
   (tabela + upsert automático + autocomplete) já está funcionando, mas nenhuma tela de gestão foi
   desenhada de propósito, até saber o que de fato vai ser construído em cima disso.
9. **Testar de verdade o encerramento por unidade**: fechar uma unidade e confirmar que bloqueia
   pedido novo nos 3 caminhos (catálogo, manual, colado) sem travar pedido/entrega já existente;
   testar reabrir.
10. **Testar de verdade o export consolidado**: gerar planilha "Pedido único" com 2+ unidades
   marcadas e conferir que soma certo (quantidade e embalagens fechadas), e que "Separado por
   unidade" continua idêntico ao de antes.
11. **Testar de verdade renomear/excluir unidade**: renomear uma unidade com pedido vinculado e
   conferir que o pedido acompanha o nome novo (e que período arquivado não muda); tentar excluir
   unidade com histórico e conferir que bloqueia com a mensagem certa; excluir unidade sem
   histórico e conferir que continua funcionando normal.
12. **Estoque real (não-travante) + PDV ágil pra feira/culto** — desenho completo já feito e
   alinhado com o Junior (ver seção dedicada acima), **aguardando ele confirmar se seguimos pra
   construir**. Falta resolver o estoque por unidade (pool hoje é só por organização, não por
   unidade — ver "Restrição confirmada pelo Junior" na seção acima) antes de começar a implementar.
13. **Conferir visualmente a logo nova em produção**: preview de compartilhamento no WhatsApp de
   verdade (link do `/painel` ou `/pedido`), favicon na aba do navegador, ícone do PWA instalado
   na tela inicial (Android/iOS) — só validei os arquivos estáticos, não o comportamento real de
   cache/preview de cada plataforma.
14. **Conferir a página inicial em produção** (`clubecompraskorin.vercel.app`) — layout e prints
   novos num navegador real. Responsividade em si já foi auditada (mobile/tablet/desktop, ver
   seção acima) — mas via dev server local, não a URL de produção de verdade.

---

## Nota operacional sobre sessões múltiplas

O acesso de escrita ao GitHub do Sistema 1 e do Sistema 2 fica em sessões Claude Code separadas
(cada uma criada com um repositório diferente como fonte). Usar duas sessões ao mesmo tempo pra
coordenar merges de produção (relay de patch entre sessões, confirmações duplicadas) se mostrou
improdutivo. Recomendação: trabalhar cada sistema direto na sessão que já tem acesso de escrita
ao repo correspondente, trazendo este arquivo como contexto inicial quando for preciso retomar em
outra sessão.
