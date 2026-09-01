# STATUS — Clube de Compras Korin (Sistema 2)

> Status vivo do projeto. Atualizar a cada mudança relevante (merge feito, feature nova, decisão
> tomada, teste realizado) e sempre commitar na `main` — é o mecanismo pra qualquer sessão nova
> retomar o contexto sem o Junior precisar reexplicar tudo de novo.
>
> Última atualização: 31/08/2026. Resumo das entregas recentes (detalhes em cada seção abaixo):
> **sessão de lançamento de 28/08 — confirmada OK pelo Junior em teste real**: estoque
> redesenhado (Alerta de caixa + Comprado/Entregue/Reservado→Sobra, sem mais "caixas abertas"
> travando o catálogo público); push pro membro avisando abertura/fechamento do catálogo (com
> fechamento automático por prazo vencido); nova aba Config→Relatórios (5 relatórios A4 pra
> imprimir/PDF, incluindo a planilha pra Korin que saiu de Fechamento); seção de Preço na Home e
> **trava de trial real até 08/09/2026** (bloqueia painel/catálogo/API pra quem não pagar, com
> "Marcar pago" manual em `/gestor`); nome de produto limpo automaticamente (com fix de bug que
> apagava nome customizado a cada reimportação) e foto de produto automática (banco
> compartilhado, em Pedidos/PDV/Catálogo) — ver seção dedicada "Sessão de lançamento (28/08)"
> mais abaixo; e, antes disso (24/08):
> gaps de integridade produto↔pedido corrigidos; cadastro leve de clientes **com tela de gestão**
> (buscar, editar, cadastrar/excluir manualmente, exportar planilha); unidade de retirada
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
> real de auth corrigido (a tela resetava sozinha toda vez que voltava o foco da aba) — **Junior
> confirmou em teste real que resolveu de vez**; e
> **estoque real não-travante + PDV ágil pra feira/culto implementados e mesclados na `main`**:
> sobra do período anterior agora é um número vivo (some ao estoque disponível o tempo todo, não
> só um aviso no início do mês seguinte) e existe um modo de venda rápida em tela cheia, com
> estoque alocado por unidade religiosa (nova tabela `unidade_estoque_pdv`, sem mexer no pool
> orçamentário por organização que já existia) (ver seção dedicada); a **página inicial ganhou
> uma seção de gancho** pro PDV, com print real da tela de venda e nova pergunta no FAQ; e o
> sistema passou a ter **marca própria — "Clube Unido"** (nome e símbolo novos, desenhados do
> zero) em vez de usar o nome/logo oficial da Korin, já que o app não é um produto oficial dela
> — mantidas todas as menções reais à Korin como fornecedora (tabela de preços, planilha, etc);
> **catálogo público passou a esconder produto "fora da tabela"** (decisão do Junior, mesmo
> padrão do produto esgotado); e o **artefato técnico publicado foi atualizado** com a
> importação por planilha (implementada), o gap de integridade produto↔pedido, o link de
> entrega por PIN e a sobra/compra confirmada.
>
> **30/08**: **material comercial publicado** — apresentação em slides (`/apresentacao.html`) e
> cartões de estudo interativos (`/cartoes.html`), pra divulgar o Clube Unido e ensinar o uso na
> prática; ver seção dedicada abaixo.
>
> **30-31/08 (sessão seguinte)**: **guia interativo (avatar + tour) na Home implementado e
> mesclado** — botão "Como funciona" abre modal com avatar narrando os 7 passos (efeito de
> digitação) ao lado de mockup de navegador com print real de cada tela, em vez de navegar pra
> `/ajuda`; bug de responsividade (modal mais alto que a viewport, sem scroll) encontrado e
> corrigido logo em seguida; **integração com Asaas implementada e mesclada** — módulo
> Financeiro no painel (Configuração Guiada R$150 avulsa, Mensalidade recorrente por unidade,
> pedido de cancelamento que só sinaliza pro gestor efetivar), webhook idempotente que confirma
> pagamento e libera acesso sozinho, migração de banco (colunas em `organizacoes` + tabela
> `cobrancas` + RPCs) e visibilidade completa no `/gestor` — **no processo, descoberto e corrigido
> um limite real do Vercel Hobby (máx. 12 Serverless Functions por deploy)**, resolvido
> consolidando endpoints relacionados num arquivo só com `vercel.json` fazendo rewrite das URLs
> antigas (ver seção dedicada — **importante pra qualquer sessão futura que for criar um novo
> arquivo em `api/`**); Junior configurou `ASAAS_API_KEY`/`ASAAS_WEBHOOK_TOKEN` e reativou o
> webhook no Asaas, mas **o Pix não apareceu no primeiro teste real — ainda não confirmado se
> resolveu** (ver Pendente); **proposta comercial de Entrega em Domicílio** planejada e
> precificada com o Junior (R$499 único pro primeiro Dedicante, R$9,90/unidade/mês recorrente
> pros próximos) — publicada como artifact e como página real do produto (`/proposta_001.html`),
> mas **ainda não implementada em código**; e, puxado por uma reflexão sobre o sistema depender
> indiretamente da Korin, **apresentação dedicada pra Korin Alimentos publicada**
> (`/apresentacao-korin.html`) contando a origem real do sistema (Valéria/Lattuga Orgânicos,
> validado na Jornada Korin 2026) e uma ideia de "portal" pra Korin em duas fases — só a Fase 1
> (painel de leitura com o pedido consolidado da rede) ficou de fato planejada em detalhe, **nada
> disso foi implementado**; ver seções dedicadas abaixo pra tudo isso.

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

## Cadastro leve de clientes + tela de gestão — implementado

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
- **Status no GitHub: mesclada na `main`.** Commit da feature: `f5e29b7`
  (branch `feat/cadastro-leve-de-clientes`). Merge commit na `main`: `face932`
  (`ebcf71f..face932`).

### Tela de gestão "Clientes" — implementada depois, escopo confirmado pelo Junior

Antes: "ainda não existe tela, aguardando o Junior trazer o requisito". Junior confirmou que
precisa, com escopo: **editar dados**, **cadastrar/excluir manualmente** e **exportar planilha**
(buscar/listar já vem junto, é a base da tela).

**Implementado**:
- Migração `add_clientes_delete_policy`: a tabela só tinha SELECT/INSERT/UPDATE — faltava
  política de DELETE (`is_org_member(org_id)`, mesmo padrão das outras).
- `src/lib/clientes.js`: `criarClienteManual` (erro aparece pra coordenadora, ao contrário do
  `upsertCliente` do fluxo de pedido que falha calado de propósito), `atualizarCliente`,
  `excluirCliente`. `listarClientes` passou a trazer `id`/`created_at` (precisa do id pra
  editar/excluir).
- `src/ClientesManager.jsx` (novo): mesmo padrão visual/estrutural do `UnidadesManager.jsx` —
  lista com form inline de criar/editar, exclusão com confirmação (não afeta pedido já feito,
  só remove o cadastro). Busca por nome/telefone. Botão "Exportar" gera `.xlsx` (nome, telefone,
  unidade) com a mesma lib `xlsx` já usada no export de pedidos.
- Nova sub-aba **"👥 Clientes"** em Web, ao lado de "📍 Unidades" (`WebScreen.jsx`).
- `npx vite build` validado sem erro; revisado visualmente via harness descartável (estado vazio,
  formulário de cadastro, lista com clientes fictícios) — harness revertido, não ficou no repo.
- **Status no GitHub: mesclada na `main`.** Commit `03bd988`
  (branch `feat/cadastro-clientes-tela-gestao`). Merge `d52a74d` (`cbadf53..d52a74d`).
- **Ainda não testado por ninguém em uso real** — ver Pendente.

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

## Logo oficial nova aplicada em todo o sistema — implementado, depois substituída (ver rebrand)

> **Superada**: a logo oficial da Korin aplicada aqui foi removida do sistema inteiro na sessão
> seguinte, junto com o rebrand pra "Clube Unido" (ver seção dedicada mais abaixo) — o app não é
> um produto oficial da Korin. Fica registrado por histórico.

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

## Estoque real (não-travante) + PDV ágil pra feira/culto — implementado

**Pedido do Junior**: 2 soluções interligadas. Desenhadas e alinhadas com ele nesta sessão,
depois implementadas e testadas via harness descartável (Junior confirmou que tudo que já
existia continuava funcionando antes de pedir pra seguir).

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

### Restrição confirmada pelo Junior — resolvida

**O PDV precisa usar o estoque da unidade religiosa específica onde a feira/culto está
acontecendo — não o estoque somado da organização inteira.** Resolvida sem mexer no pool
orçamentário existente: nova tabela `unidade_estoque_pdv` (produto × unidade → `alocado_und`),
puramente aditiva. A Korin continua vendendo só pra organização inteira — não existe "segunda
compra" por unidade — `alocado_und` é só "quanto desse total a Dedicante decidiu levar pra essa
unidade vender no local", informativo, nunca trava a venda. Dentro do PDV, "restam N" por produto
é `alocado_und` menos o que já foi vendido ali via PDV (`getVendidoPdvPorProduto`, filtrado por
unidade). Sem alocação definida, o PDV funciona igual (mostra só o vendido, sem limite sugerido) —
zero configuração obrigatória antes de vender.

### Perguntas em aberto — respondidas na implementação

- Mais de um aparelho vendendo ao mesmo tempo na mesma unidade (duas pessoas ajudando na feira)?
  Ainda não tratado com trava otimista — "restam N" é calculado ao vivo em cima dos pedidos já
  carregados, então dois aparelhos podem, em teoria, vender o mesmo "último" item quase ao mesmo
  tempo sem se avisar um do outro. Como o desenho é **não-travante por princípio**, isso não
  impede a venda (só o aviso visual erra por um instante até recarregar) — mas fica registrado
  como limitação conhecida, não bug.
- Vale identificar a venda como vinda do PDV separado dos outros pedidos? **Sim** — todo pedido do
  PDV grava `origem: 'pdv'`, `status: 'entregue'` na hora (não fica pendente) e `entreguePor`
  preenchido. Aparece junto dos demais em todos os relatórios/Fechamento, mas é filtrável/
  identificável por essa origem quando precisar.

### Status no GitHub

Ambas mescladas na `main`, com `npx vite build` validado sem erro e revisão visual via harness
descartável (showcase.jsx + Playwright, screenshots das duas telas — Produtos/Embalagens com sobra
dobrada no número, e os 6 passos do fluxo do PDV) antes do merge.

- **Estoque real (item 1)**: commit `a10ffe7` na `main` (branch
  `feat/estoque-real-sobra-nao-travante`).
- **PDV ágil (item 2)**: commit `614c56e` na `main`, merge de `feat/pdv-venda-no-local`
  (commit da feature `2493f13`, migração `add_unidade_estoque_pdv` aplicada direto no Supabase de
  produção — `nbfvkmdcbfvgpqpvvspv`).
- Preview do Vercel gerado automaticamente pro branch do PDV foi usado pro Junior testar ao vivo
  antes de autorizar o merge ("PODE MERGER TUDO E PUSH").
- **Ainda não testado em produção de verdade** (venda real numa feira/culto) — ver item 12 em
  Pendente.
- **Gancho na página inicial**: nova seção "Feira, bazar ou dia de culto? Venda direto no celular,
  sem parar a fila" (com print real do PDV, gerado via harness descartável) e nova pergunta no FAQ
  rápido. Commit `3291d56` (branch `feat/home-gancho-pdv-estoque`), merge `f901dbc` na `main`.
  Build validado (`npx vite build`) e revisão visual desktop+mobile via Playwright antes do merge.

---

## Rebrand: "Clube de Compras Korin" → "Clube Unido" — implementado

**Pedido do Junior**: ele vai apresentar o sistema numa Live e cobrar por ele — nesse momento caiu
a ficha de que o app não é um produto oficial da Korin, então não pode usar o nome nem a logo dela
como se fosse. Pedido: criar uma marca própria.

**Nome e símbolo escolhidos**: apresentei 4 direções (nome + símbolo, cada uma com um conceito
diferente — círculo/comunidade, cesta/caixa fechada, colheita/orgânico, clube/continuidade) num
artefato visual; o Junior escolheu a opção 4, **"Clube Unido"**, com o símbolo de dois círculos
entrelaçados (ideia de "unir/juntar"), pensado especificamente pra continuar legível até em
favicon de 16px (por isso os dois círculos usam cores sólidas diferentes, tipo Mastercard — um
preenchimento translúcido/uniforme desaparecia virando uma mancha em tamanho pequeno).

**O que mudou**: nome e símbolo do sistema em si, em tudo que é identidade — título de cada
página, meta tags (og:title/description, apple-mobile-web-app-title), os 2 manifests do PWA
(nome/descrição — não o `id` interno, ver abaixo), favicon, ícones de instalação (192/512/apple-
touch), tela de login, headers do painel/catálogo/entrega/gestor, rodapés (inclusive impressão),
imagem de compartilhamento (`og-image.png`) e o nome do app instalado dinamicamente por org
(`AuthGate.jsx`). Logo antiga (`logo-korin.png`) removida do projeto.

**O que ficou igual, de propósito**: toda menção real à Korin como **fornecedora** — "tabela de
preços da Korin", "planilha oficial da Korin (.xlsx)", "O que comprar na Korin", "Catálogo Korin"
etc. Isso não é a marca do sistema, é a descrição factual de quem é o fornecedor real — continua
certo e não tem por que mudar. A distinção foi feita item por item, não com busca-e-troca cego.

**2 prints reais tinham a marca antiga cravada nos pixels** (`screenshot-embalagens.jpg`,
`screenshot-entrega.jpg`, usados na página inicial) — refeitos via harness descartável reproduzindo
o layout real (mesmas classes Tailwind do `App.jsx`/`EntregaApp.jsx`) com dado fictício parecido
com o original, harness revertido depois.

**Bug pego na validação, corrigido antes do Junior perceber em produção**: os 3 service workers
(`sw.js`, `sw-catalogo.js`, `sw-entrega.js`) ainda apontavam pro `/logo-korin.png` que acabou de
ser removido — pré-cache e ícone/badge de notificação push quebrados. Corrigido pra
`/logo-clube-unido.png` e subida a versão do cache (v2→v3 catálogo/entrega, v8→v9 admin), senão
quem já tem o PWA instalado ficaria preso no cache antigo.

**`id` dos manifests não foi mexido** (`korin-admin-v2`, `korin-catalogo`) — é só um identificador
interno do PWA, não aparece pro usuário, e mudar isso faria o sistema operacional tratar como um
app diferente pra quem já instalou (duplicaria ícone ou perderia a instalação existente).

- `npx vite build` validado sem erro (duas vezes — antes e depois do fix dos service workers);
  revisão visual completa via Playwright antes do merge (home, login, ajuda, seção do PDV,
  favicon em 16px e 32px upscalado pra conferir legibilidade).
- Preview do Vercel gerado automaticamente pro branch (`clubecompraskorin-git-rebran-c38452-…`)
  foi conferido pelo Junior antes de autorizar o merge ("tudo certinho, siga").
- **Status no GitHub: mesclada na `main`.** Commit `d00115a` (branch `rebrand/clube-unido`),
  merge `5cefec6`. Fix dos service workers: commit `cbb9729`, direto na `main` (correção do que
  tinha acabado de subir, sem precisar de branch/preview novo).
- Branch `rebrand/clube-unido` não foi possível apagar do GitHub (permissão negada, 403) — fica
  órfã lá, sem efeito prático, já mesclada.

---

## Página inicial e Ajuda reformuladas: objetivo do sistema, hooks de venda e prints reais — implementado

**Pedido do Junior**: a home já tinha visual bom e prints reais, mas faltava deixar claro *o que
o sistema resolve* logo de cara. Pediu pra citar o objetivo (facilitar a gestão de quem coordena
um Clube de Compras) e cobrir 6 pontos específicos — de que jeito o pedido chega, como funciona a
entrega, como o estoque atualiza sozinho, venda rápida (PDV), múltiplas unidades, e pedido
consolidado pro fornecedor — cada um mostrando a dor real que resolve, com print. Pediu também pra
deixar claro que dá pra começar com passos simples, e que a Ajuda mostrasse esses passos com
prints. Único requisito rígido: manter o depoimento existente sem alterar nada.

**O que mudou na Home**: novo headline com o objetivo em primeiro plano; parágrafo "Por que existe"
reescrito; 3 seções novas ("3 jeitos de receber pedido", "Estoque atualiza sozinho", "Pedido pro
fornecedor" consolidando por unidade); seção de entrega reescrita cobrindo tanto autoentrega quanto
delegação por link/PIN; faixa compacta sobre múltiplas unidades (decisão minha, confirmada com o
Junior: não virou seção pesada porque o cuidado por unidade já aparece implícito em pedido/entrega/
estoque/fornecedor — uma seção a mais ficaria repetitiva). Depoimento da Valéria mantido 100%
inalterado, como pedido.

**O que mudou na Ajuda**: os 7 passos do guia completo ganharam print de tela ao lado de cada
explicação, em layout alternado (imagem ora à esquerda, ora à direita).

**7 screenshots novos** (`screenshot-estoque.jpg`, `screenshot-export.jpg`, `screenshot-criar-
conta.jpg`, `screenshot-onboarding-unidades.jpg`, `screenshot-link-catalogo.jpg`, `screenshot-
pedidos-lista.jpg`, `screenshot-link-entrega-gerar.jpg`) — gerados via harness descartável
reproduzindo o markup/classNames reais de `App.jsx`/`WebScreen.jsx`/`Login.jsx`/
`UnidadesManager.jsx` com dado fictício, harness revertido depois, nenhum ficou no repo.

**Correção de uma rodada de revisão do Junior**, antes do merge:
- Linguagem de gênero: "a Dedicante", "você mesma", "sozinha" (formas femininas) removidas da Home
  e Ajuda — Dedicante pode ser homem ou mulher. Achado o mesmo padrão nas telas que o membro vê
  (`CatalogoApp.jsx`, `EntregaApp.jsx`) e corrigido junto.
- Passo "Catálogo" e o hook "Sem digitar nada" davam a entender que só dava pra tirar foto — agora
  deixam claro que a planilha oficial da Korin (a mesma que a Dedicante já usa pra comprar) é a via
  principal, com a foto como alternativa.
- Passo "Fechamento" dizia "sem sobra" — impreciso, já que caixa fechada não é garantia de venda
  total. Corrigido pra "controla a sobra", não "elimina a sobra".
- "Por que existe" dava a entender que o pedido só chega por WhatsApp — reescrito pra deixar claro
  que qualquer forma de chegada (WhatsApp, ligação, viva voz) é simples de incluir no sistema.

- `npx vite build` validado (antes e depois da rodada de correções). Revisão visual completa via
  Playwright, seção por seção, desktop e mobile, nas duas páginas, antes de cada push.
- Preview do Vercel (branch `feat/home-reformulada-hooks-e-ajuda-com-prints`) conferido pelo Junior,
  que pediu os ajustes de linguagem/precisão acima antes de aprovar o merge.
- **Status no GitHub: mesclada na `main`.** Commits `0ccab28` (conteúdo + prints) e `f34e07e`
  (correções pós-revisão), branch `feat/home-reformulada-hooks-e-ajuda-com-prints`, merge
  fast-forward direto na `main` (sem commit de merge separado).

---

## Catálogo do cliente parecia travar ao confirmar pedido — corrigido

**Relato do Junior**: testando o catálogo como cliente, escolhia produtos, tentava salvar e "não
saía da tela" — parecia que o app simplesmente não fazia nada.

**Investigação**: reproduzi o fluxo real com um harness Playwright descartável (mockando Supabase e
as duas Vercel Functions envolvidas, `/api/pedido` e `/api/meu-pedido`, sem tocar em dado real).
Achado: se o cliente esquece de tocar no local de retirada — ou a unidade salva no aparelho dele foi
renomeada/excluída desde a última compra —, `handleConfirmar` já bloqueava certo e mandava de volta
pra tela "Seus dados", mas o `erro` só era passado/renderizado na `TelaPagamento`. A `TelaDados`
nunca recebia esse prop, então o usuário via a mesma tela de novo, sem nenhuma mensagem — clicava
"Continuar" e "Confirmar" de novo, entrava num loop sem explicação nenhuma.

**Corrigido**: `TelaDados` agora recebe e mostra `erro`, igual já acontecia na `TelaPagamento`.
Aproveitei e endureci a validação: unidade que não existe mais na lista atual (renomeada/excluída)
agora é barrada com a mesma mensagem — antes passava batido e o pedido ia pro servidor com um local
de retirada inválido, sem avisar ninguém.

- `npx vite build` validado. Reproduzido e confirmado com o harness Playwright antes e depois da
  correção (cenário sem unidade selecionada e cenário de unidade obsoleta) — harness não ficou no
  repo.
- **Status no GitHub: commit `eaca247`, direto na `main`** (correção pontual, sem branch/preview).

---

## Aba "Web" renomeada pra "Config" e Pedidos consolidado numa aba só — implementado

**Análise pedida pelo Junior**: "Web" misturava configuração (Config, Embalagens, Unidades, Clientes,
Dados) com uma sub-aba "Pedidos" que só listava pedidos vindos do catálogo — mas a aba Pedidos
principal já mostra todos os pedidos, de qualquer origem (já tinha badge 🌐/📋 distinguindo e ação de
cancelar pro catálogo). Concordei que fazia sentido: 6 dos 7 itens de Web são mesmo config, um não
era — melhor não ter pedido em dois lugares diferentes do app.

**O que mudou**:
- Bottom nav: "🌐 Web" → "⚙️ Config".
- `WebScreen.jsx`: removida a sub-aba Pedidos (`TabPedidos`, `handleCancelar`, botão na lista de
  sub-abas). Embalagens/Resumo continuam usando os totais de pedidos do catálogo por baixo dos
  panos — só a listagem em si saiu, pra não ficar duplicada.
- Aba Pedidos principal: novo filtro "🌐 Só catálogo" ao lado dos filtros de status (Todos/
  Pendentes/Entregues) — substitui a visão que existia só dentro de Web.
- `Ajuda.jsx`: todas as referências a "Web → Config"/"aba Web" atualizadas pra "Config" (mesmo nome
  da aba agora, sem redundância).

- `npx vite build` validado.
- **Status no GitHub: commit `df7e3dd`, direto na `main`** (mudança mecânica e bem delimitada —
  build passou limpo, revisão de diff confirmou que nada mais referenciava o código removido).

---

## Config: "rotina do mês" separada de "configuração avulsa" + Embalagens mais legível — implementado

**Pedido do Junior**: análise da aba Config recém-renomeada — se a ordem das sub-abas fazia sentido
e se a informação estava disposta de forma didática. Concordei que a ordem das sub-abas (Config →
Embalagens → Resumo → Unidades/Clientes/Dados) já segue o ciclo real do mês, mas achei dois pontos
fracos de legibilidade e o Junior pediu pra implementar a correção.

**O que mudou**:
- `TabControles` (sub-aba Config): antes eram 4 cards soltos sem separação de propósito (status do
  período, importar, "Configurações" com um campo "Nome do período" só de leitura e redundante com
  o card de status, link + contador de instalação, notificações). Agora tem duas seções com título
  próprio — **🗓️ Rotina do mês** (status, importar, data limite — o que se mexe todo ciclo) e
  **⚙️ Configuração avulsa** (link pros membros, notificações — o que se configura uma vez). O campo
  "Nome do período" read-only saiu; a explicação dele virou legenda do botão de importar, que é onde
  a ação de fato acontece.
- `TabProdutos` (sub-aba Embalagens): a linha por produto era uma frase só concatenando 4 números —
  "Disponível: X un. (Y deste mês + Z de sobra) · Pedidos: N · Restante: R". Quebrada em linhas
  separadas, no mesmo formato que já funcionava bem no Resumo (uma informação por linha, cor só onde
  importa — vermelho quando vende além do estimado).

- `npx vite build` validado. Revisado visualmente via harness Playwright descartável reproduzindo os
  dois componentes com dado fictício (não ficou no repo) — comparação visual antes/depois confirmou
  a melhora de leitura.
- **Status no GitHub: commit `98dd91a`, direto na `main`.**

---

## Estoque unificado: confirmar compra vira o gatilho do estoque real — implementado

**Como chegamos aqui**: ao analisar a aba Config, o Junior estranhou a sub-aba "Resumo" (só via pedido
do catálogo — sem sentido, já que pedido também chega por WhatsApp/manual) e não achava onde subia a
planilha do que foi realmente comprado da Korin. Pedi pra ele descrever o fluxo completo do clube de
compras antes de mexer em qualquer coisa — resumo do que ele explicou: mês começa com a planilha de
preços da Korin → ela sobe e o sistema gera o catálogo → membros pedem de qualquer jeito (catálogo,
WhatsApp, manual, PDV) → numa data ela soma tudo e manda pra Korin (isso ainda não é fechamento) →
quando a compra chega, ela sobe de volta a MESMA planilha, agora com o que realmente comprou — é esse
upload que liga o controle de estoque de verdade. Fechamento efetivo só acontece quando sobe a
planilha do mês seguinte ou quando ela clica pra encerrar período/unidade. E um ponto que corrigiu uma
suposição minha: **estoque é controlado por Dedicante (organização), não por unidade** — quando ela
compra da Korin não necessariamente separa por unidade, então dividir estoque por unidade nunca fez
sentido; o controle de entrega por unidade (link, separação, relatórios) já dá conta disso sozinho.

**O que mudou**:
- `lib/helpers.js`: novo `calcEstoque(produto, totalPedido, sobra)` — fonte única do estoque real de
  um produto no período. Prioriza `compra_confirmada_und` (a planilha real) sobre a estimativa de
  caixas abertas; a partir do momento que a compra é confirmada, é esse número que manda. Usado tanto
  em Config → Estoque quanto no PDV, pro mesmo produto valer o mesmo saldo em qualquer canal.
- **Fechamento** ganhou o card "Confirmar o que foi realmente comprado" — mesmo fluxo de upload que
  existia (reimporta a planilha com "QTDE (CX)" preenchida), só que agora no lugar certo, logo depois
  dos botões de exportar pedido pra Korin. Tirada a etapa de escolher unidades atendidas (não existe
  mais compra por unidade).
- Config: sub-aba "Embalagens" renomeada pra **"Estoque"**, usando `calcEstoque()` — mostra "· compra
  confirmada" quando o número já é real, não mais estimativa. Sub-aba "Resumo" **removida** —
  redundante com Fechamento, que já soma pedido de qualquer origem.
- Totais de pedido em Config passaram a considerar qualquer origem (antes só contava catálogo) —
  mesmo problema que tinha em Resumo, só que ninguém tinha notado ainda em Estoque/Embalagens.
- **PDV**: removida a alocação de estoque por unidade (`ConfigEstoquePdv`, tabela
  `unidade_estoque_pdv`) — agora lê o mesmo estoque compartilhado da organização. Tabela do banco não
  foi apagada (só parou de ser lida/escrita) pra não arriscar uma migração de schema desnecessária.
- `Ajuda.jsx`: FAQ da sobra atualizada pra "Config → Estoque".

- `npx vite build` validado. Revisado visualmente via harness Playwright descartável (não ficou no
  repo) — Estoque com/sem compra confirmada, card novo do Fechamento, PDV sem o botão de configurar
  estoque, tela de escolher unidade do PDV com o texto atualizado.
- Preview do Vercel (branch `feat/estoque-unificado-e-confirmar-compra-no-fechamento`) conferido pelo
  Junior antes do merge.
- **Status no GitHub: mesclada na `main`, commit `aa17f4e`, merge fast-forward** (sem commit de merge
  separado).
- **Pendência anotada pelo Junior**: "não tá errado, só melhoria" — ele quer revisitar a questão do
  estoque com mais calma numa próxima sessão. Resolvida na sessão seguinte, ver próxima seção.

---

## Histórico de compras confirmadas: cada confirmação soma, não substitui — implementado

**O que motivou**: ao revisitar a questão do estoque (pendência da sessão anterior), o Junior levantou
um caso real — quem vende bastante no PDV pode ter que comprar da Korin mais de uma vez no mesmo
período (repor no meio do mês), mesmo o padrão do clube de compras sendo uma compra só por mês. No
modelo anterior (`compra_confirmada_und`, um campo único por produto/período), confirmar uma segunda
compra SOBRESCREVIA a primeira em vez de somar — e não existia lugar nenhum pra ver ou corrigir o que
compunha esse número.

**Modelo acordado com o Junior**: o total ("disponível") continua só informativo, nunca editável
direto — evita perder de onde o número veio. O que é editável são as ENTRADAS que compõem esse total:
cada confirmação (upload de planilha ou ajuste manual) vira uma linha no histórico, e o disponível é
sempre a soma de todas as linhas do produto naquele período.

**O que mudou**:
- Migração `compras_confirmadas_historico`: nova tabela `compras_confirmadas` (uma linha por
  confirmação, `origem` = 'planilha' ou 'manual', `observacao` livre), RLS no mesmo padrão de
  `periodo_produtos` (`is_org_member` + período aberto, via 2 helpers novos —
  `periodo_produto_org_id`/`periodo_produto_periodo_id`). Colunas antigas
  `periodo_produtos.compra_confirmada_und/unidades` removidas (sem nenhuma linha preenchida em
  produção ainda — conferido antes de migrar, seguro trocar sem migração de dados).
- `lib/periodos.js`: `registrarCompraConfirmada` agora INSERE (soma) em vez de UPDATE (substituía).
  Novo `registrarAjusteManualEstoque` (ajuste rápido sem planilha) e `excluirCompraConfirmada`.
  `getComprasConfirmadas` lista o histórico de um período. `getSobraPeriodoAnterior` passou a somar o
  histórico do período anterior.
- `lib/helpers.js`: `calcEstoque` recebe a soma confirmada como parâmetro (`compraConfirmada`) em vez
  de ler do produto — quem chama soma o histórico primeiro.
- Aba Estoque: novo link "📋 Histórico de compras (N)" por produto, abrindo modal com a lista de linhas
  (📊 planilha / ✍️ manual, com data e observação), total, botão de excluir cada uma, e formulário pra
  registrar compra extra ali mesmo — sem gerar planilha.
- PDV usa o mesmo histórico somado no cálculo de restante.
- Upload de planilha em Fechamento grava o nome do arquivo como observação de cada linha, pra
  rastreabilidade de onde cada pedaço do estoque veio.

- `npx vite build` validado. Revisado visualmente via harness Playwright descartável (não ficou no
  repo) — link com contador, modal com histórico misto planilha/manual, estado vazio.
- **Status no GitHub: mesclada na `main`, commit `ce956e8`, merge fast-forward.**

---

## Sessão de lançamento (28/08): estoque redesenhado, push pro membro, Relatórios, trial e nome/foto automática — implementado, testado pelo Junior

Sessão corrida, puxada pela live de lançamento do mesmo dia — 13 commits direto na `main` (sem
branch/PR, ritmo de ajuste rápido antes da live). **Junior testou tudo em 28/08 e confirmou que
está OK.**

**1. Estoque redesenhado** (`5540f87`, `a00d878`, `4569e2f`): modelo anterior tinha 5 termos
técnicos empilhados (caixas abertas/disponível/confirmado/restante/sobra), confuso pra quem usa.
Virou dois conceitos separados: **Alerta de caixa** (aviso pré-compra, só leitura, não trava nada)
e **Comprado/Entregue/Reservado → Sobra** (só existe após a 1ª compra confirmada do mês). Efeito
colateral consultado e confirmado com o Junior na hora: `caixasAbertas` deixou de travar pedido no
catálogo público (`getDisponivel` virou sempre `Infinity` — quem trava pedido agora é só
encerramento de período/unidade, já existente). Sobra do período anterior passou a contar como
estoque disponível mesmo antes de confirmar a 1ª compra do mês corrente. Badge "Restam N" também
apareceu na aba Produtos (cadastro), não só em Config → Estoque.

**2. Push pro membro (abertura/fechamento) + 2 fixes de infra Vercel Hobby** (`8d14738`, `fae483b`,
`b1194e0`): membro agora pode ativar aviso push quando o catálogo abre/fecha (antes só a Dedicante
recebia push de pedido novo); fechamento automático por data-limite vencida também avisa, via cron.
Dois problemas de deploy pegos e corrigidos no processo — plano Vercel Hobby limita cron a 1x/dia
(cron de 15/15min quebrava o build) e a 12 Serverless Functions por deployment (o projeto foi pra
13 e travou) — consolidados 3 endpoints (`inscrever-membro`, `notificar-membros`,
`verificar-prazos`) num único `api/membros.js` com dispatch por `acao`, voltando a 11 functions.

**3. Nova aba Config → Relatórios** (`38966d2`): centraliza 5 relatórios A4 pra imprimir/PDF
(Pedidos Pendentes, Entregues, Estoque, Fechamento-resumo, Planilha pra Korin em XLSX) — a planilha
pra Korin saiu de Fechamento e foi pra cá, pra não ficar duplicada.

**4. Lançamento comercial**: seção de Preço na Home (`9e83a50`) — setup R$150 único + mensalidade
R$49,90 (1ª unidade) + R$9,90/unidade adicional, com exemplos calculados. **Trava de trial real**
(`efff9a3`) até 08/09/2026 — bloqueia painel, catálogo público e a API de pedido (checado no
servidor, não só na UI) pra quem passar do trial sem pagar; `/gestor` ganhou botão manual "Marcar
pago" (integração de gateway/Stripe fica pra depois, é setado manualmente por enquanto).

**5. Produto: nome amigável + foto automática** (`809019d`, `16b2e75`, `0b148b5`): nome do produto
deixou de vir cru da planilha da Korin — gera sugestão limpa automaticamente ("COXA NGMO CONG PCT
CX C/17KG C/17 PCT" → "COXA NGMO 1KG") e **corrigiu bug real**: reimportar a planilha estava
apagando qualquer nome que a Dedicante tivesse ajustado manualmente no mês anterior. Foto de
produto automática (banco compartilhado entre organizações, casada pelo nome cru da Korin, nenhuma
organização faz upload) aparece em Pedidos/PDV/Catálogo — não em Entregas nem no link de PIN, por
decisão do Junior. Endpoint que popula o banco de fotos ajustado pra aceitar `GET` (as ferramentas
de fetch usadas pra popular só disparam GET simples).

- `npx vite build` validado a cada etapa; `node --check` nos endpoints novos/alterados. Sem
  revisão via harness/Playwright nesta rodada (ritmo de véspera de live) — validação real veio do
  teste do Junior em produção depois.
- **Status no GitHub: 13 commits direto na `main`** (sem branch/PR): `85d80b3`, `4569e2f`,
  `5540f87`, `8d14738`, `fae483b`, `b1194e0`, `38966d2`, `a00d878`, `9e83a50`, `efff9a3`, `809019d`,
  `16b2e75`, `0b148b5`.
- **Confirmado pelo Junior em teste real no dia 28/08: tudo OK.**

---

## Ideia registrada (não implementada): usar a planilha exata da Korin como molde no export de Fechamento

**Trazida pelo Junior**: em vez do export pra Korin (Config → Relatórios → "Planilha pra Korin") gerar um
`.xlsx` novo do zero (como faz hoje via `json_to_sheet`), usar o arquivo real que a Korin manda como
molde — só preencher a quantidade em caixa fechada nele — e abrir uma aba por unidade dentro desse
mesmo arquivo (mesmo padrão separado/consolidado que já existe hoje). A Dedicante só conferiria e
mandaria de volta pra Korin, sem estranhar o layout.

**As regras de cálculo continuam as mesmas** (arredondar pra caixa fechada, somar por produto,
separado vs. consolidado por unidade) — só mudaria o "papel" onde o resultado é escrito.

**Trade-off identificado, ainda sem decisão**: hoje o sistema só guarda os *dados* da planilha
importada, não o arquivo original — essa ideia exigiria passar a armazenar o `.xlsx` real da Korin e
escrever de volta em células específicas dele (parecido com o parser de importação, só que na
direção inversa). Funciona bem enquanto o layout da Korin não mudar, mas cria mais um ponto pra
manter sincronizado se ela alterar o modelo num mês futuro.

**Status: só ideia, aguardando o Junior decidir se quer seguir.** Nada implementado.

---

## Material comercial: apresentação em slides e cartões de estudo interativos — publicado

**Pedido do Junior**: material pra divulgar o Clube Unido num grupo de WhatsApp de interessados, e
conteúdo-base pra gerar material com o NotebookLM (áudio/vídeo overview, apresentação, cartões de
estudo) sem a IA "viajar" ou inventar informação.

**Trabalho conversacional, sem código**: ajudei a montar os prompts de personalização pro
NotebookLM pra cada uma dessas ferramentas (cada uma tem campos de customização diferentes —
Video Overview tem prompt livre; a tela de cartões de estudo não tem, só quantidade/dificuldade).
Isso não gera artefato de repositório — fica registrado só aqui como contexto, caso o Junior peça
de novo numa sessão nova.

**O que virou artefato de verdade** — a pedido dele, "sem mexer em nada que já existe":

1. **Apresentação em slides** (`/apresentacao.html`) — 10 slides navegáveis (clique na tela, setas
   na tela, teclado ← →), contando o fluxo real do sistema: o problema → a solução → a jornada do
   mês em 4 passos → estoque unificado → histórico de compras → PDV → fechamento → pra quem é.
   Identidade visual própria (verde-floresta/mostarda sobre papel, tipografia Fraunces + Public
   Sans + IBM Plex Mono) — página estática isolada, não usa nenhum componente do app.
2. **Cartões de estudo interativos** (`/cartoes.html`) — 30 cartões (pergunta na frente, resposta
   ao virar, toque ou clique), organizados em 7 seções na ordem real de uso do app: Primeiros
   passos (cadastro/criação do período) → Pedidos → Entregas → PDV → Fechamento → Config→Estoque →
   Config→outras configurações. Conteúdo conferido direto no código-fonte (nomes exatos de
   botão/aba/tela — ex.: "📥 Confirmar o que foi realmente comprado", "🎪 Iniciar venda no local"),
   não é texto genérico.

Ambos com tags Open Graph (`og:title`/`og:description`/`og:image`, reaproveitando o `/og-image.png`
que já existia no projeto) pra aparecer com preview — título, descrição comercial e a marca — ao
colar o link no WhatsApp; testados em viewport de celular (390px, sem estouro horizontal) e com
Playwright pra pegar bug de interação antes de publicar. Dois problemas reais encontrados e
corrigidos nesse teste: a animação de entrada dos slides travava invisível se a pessoa clicasse
rápido demais entre eles (removida — a troca de slide já tem transição própria, suficiente); e as
zonas de clique esquerda/direita da apresentação cobriam só 45%+45% da tela, deixando 10% sem
reação bem no centro (agora 50%/50%).

**Arquivos novos, nada existente tocado** — só `public/apresentacao.html` e `public/cartoes.html`
(confirmado via `git status`/`git diff` antes de cada commit; nenhuma rota, componente ou config do
app principal foi alterada).

- `npx vite build` validado a cada mudança.
- **Status no GitHub**: `b4b951a` (publicação inicial) e `b051578` (documento HTML completo —
  faltava DOCTYPE/head/body — + tags Open Graph, favicon e o fix da zona de clique), ambos direto
  na `main`.
- URLs em produção: `https://clubecompraskorin.vercel.app/apresentacao.html` e
  `https://clubecompraskorin.vercel.app/cartoes.html`.
- **Nota**: entre o commit anterior desta sessão (`a2aa42f`) e este trabalho, ~20 commits de uma
  sessão paralela chegaram na `main` (trava de trial, estoque redesenhado, aba Relatórios, etc. —
  ver "Sessão de lançamento (28/08)" acima). Rebaseei em cima sem conflito; nada dessa sessão foi
  alterado.
- **Ainda não testado pelo Junior**: preview real do link no WhatsApp (as tags foram validadas
  tecnicamente, mas não visualmente dentro do app do WhatsApp) e navegação num celular de verdade
  (só testado em viewport simulado).

---

## Guia interativo (avatar + tour) na Home — implementado

**Pedido do Junior**: um "chatbot/avatar" na página inicial mostrando o passo a passo com telas,
só na primeira página (antes do login). Decidido em conversa (trade-off registrado): scriptado
(sem IA de verdade respondendo perguntas livres) em vez de chat com IA real — evita custo de API,
latência e resposta fora do tom, e entrega a mesma sensação de "avatar te guiando".

- `src/lib/onboardingSteps.js` — os 7 passos (com screenshot real de cada tela) que antes estavam
  hardcoded só em `Ajuda.jsx`, extraídos pra um arquivo compartilhado.
- `src/GuiaTour.jsx` (novo) — modal com avatar "Guia do Clube Unido", balão de chat com efeito de
  digitação (respeita `prefers-reduced-motion`), mockup de navegador com o screenshot do passo ao
  lado, progresso por bolinhas clicáveis, Voltar/Próximo, fecha com X/clique fora/Esc; no último
  passo o botão vira "Criar minha conta →".
- `src/Home.jsx` — botão "Como funciona" do herói abre o modal em vez de navegar pra `/ajuda`
  (que continua existindo como página estática de apoio).
- **Bug de responsividade encontrado depois de mesclado, corrigido em seguida**: em telas
  pequenas o modal ficava mais alto que a viewport e o overlay usava `items-center` sem
  `overflow-y-auto` — não dava pra rolar, então o topo (avatar/fechar) e o rodapé
  (Voltar/Próximo) ficavam inacessíveis. Corrigido com overlay scrollável de verdade (`overflow-
  y-auto` + wrapper `min-h-full flex items-center` pra centralizar sem cortar) e mockup menor em
  telas estreitas. Testado com emulação de dispositivo real do Playwright (iPhone 13, Pixel 7,
  iPhone SE) — toque real, 7 passos completos, fecha certo, zero erro de JS.
- **Status no GitHub**: PR #5 mesclado (`ad8e25b`), fix de responsividade PR #6 mesclado
  (`570b32b`), ambos direto na `main`.
- URL em produção: `https://clubecompraskorin.vercel.app/` (botão "Como funciona" no herói).

---

## Limite de 12 Serverless Functions no Vercel Hobby — restrição operacional importante

**Descoberto ao implementar a integração com Asaas**: o deploy do PR falhou com
`exceeded_serverless_functions_per_deployment` — o plano Hobby do Vercel só libera **12
Serverless Functions por deploy**, e o projeto já estava exatamente nesse limite (12 arquivos em
`api/`) antes de qualquer arquivo novo. Os 2 arquivos novos do Asaas (`asaas-cobranca.js` +
`asaas-webhook.js`) empurraram de 12 pra 14.

**Solução aplicada** (sem quebrar nada que já chamava essas rotas): consolidar endpoints
relacionados num arquivo só, com dispatch por query param, e usar `vercel.json` (`rewrites`) pra
manter as URLs antigas funcionando exatamente como antes — o cliente e o webhook já configurado
no painel do Asaas não precisaram mudar nada.

- `api/manifest-catalogo.js` + `api/manifest-entrega.js` → `api/manifest.js`
  (`?tipo=catalogo|entrega`).
- `api/asaas-cobranca.js` + `api/asaas-webhook.js` → `api/asaas.js` (`?mode=cobranca|webhook`).
- Volta pra 12 arquivos em `api/` — exatamente no limite de novo.

**Regra pra qualquer sessão futura**: antes de criar um arquivo novo em `api/`, rodar
`ls api/ | wc -l`. Se já estiver em 12, **precisa consolidar algum par existente num rewrite
antes de adicionar** — senão o deploy falha (o build local/`npx vite build` passa normal, o erro
só aparece no deploy real do Vercel, então é fácil não perceber até já ter mesclado).

- **Status no GitHub**: commit `7ee5c4e` (na branch do PR #7, antes do merge).

---

## Integração com Asaas: Configuração Guiada, Mensalidade e cancelamento — implementado

**Contexto**: o Junior abriu conta no Asaas (gateway de pagamento) e pediu pra planejar e depois
implementar cobrança real pra dois produtos que hoje são manuais — a Configuração Guiada (R$150,
setup opcional) e a Mensalidade (hoje só controlada na mão com "Marcar pago" em `/gestor`) —
incluindo fluxo de cancelamento. Requisitos explícitos: não pode quebrar nada existente, o
`/gestor` precisa mostrar tudo (status de assinatura, cobranças, cancelamentos pendentes), e o
Dedicante precisa ter o cadastro completo (nome + CPF/CNPJ) antes de conseguir contratar
qualquer um dos dois — validado tanto na tela quanto no servidor.

**Banco (migração aditiva, aplicada via Supabase MCP)**:
- `organizacoes` ganhou `asaas_customer_id`, `asaas_subscription_id`, `assinatura_status`
  (`nunca_assinou`/`ativa`/`cancelada`, default `nunca_assinou`), `cancelamento_solicitado_em`.
- Tabela nova `cobrancas` (uma linha por cobrança do Asaas, avulsa ou de assinatura) — RLS:
  leitura por `is_org_member`/`is_platform_admin`, escrita só por `service_role` (nenhuma policy
  de INSERT/UPDATE pro cliente — só as serverless functions escrevem).
- RPCs novas: `solicitar_cancelamento_assinatura` (Dedicante só sinaliza, não cancela na hora),
  `platform_admin_processar_cancelamento` (gestor efetiva), `platform_admin_descartar_cancelamento`
  (gestor ignora o pedido, ex.: já resolveu por fora).
- Nada disso mudou a lógica de `trial_fim`/`pago_ate` que já estava em produção.

**`api/asaas.js`** (ver seção do limite de 12 functions acima pro motivo de estar num arquivo só):
- `?mode=cobranca` — cria/reaproveita o cliente no Asaas e gera cobrança avulsa (Configuração
  Guiada) ou assinatura (Mensalidade, `R$49,90 + R$9,90 × unidades extras`, mesmo cálculo já
  usado no preço público). Autenticado por `Authorization: Bearer` (access_token da sessão do
  Supabase) — busca a org do usuário, confere `ativo` e cadastro completo **no servidor**
  (defesa em profundidade, não confia só na UI), e responde com erro claro (sem derrubar o
  endpoint) se `ASAAS_API_KEY` ainda não estiver configurada — mesmo padrão já usado pro VAPID
  em `api/pedido.js`.
- `?mode=webhook` — recebe os eventos de pagamento do Asaas, valida o token
  (`ASAAS_WEBHOOK_TOKEN` contra o header `asaas-access-token`), é **idempotente por
  `asaas_charge_id`** (upsert — reprocessar o mesmo evento nunca duplica nem soma `pago_ate`
  duas vezes), e empurra `pago_ate` (a partir da maior data entre hoje e o `pago_ate` atual — quem
  paga em dia estende do vencimento anterior, quem paga atrasado estende de hoje) e
  `assinatura_status = 'ativa'` quando a mensalidade confirma. Responde 500 (não 200) em erro
  interno de propósito, pro Asaas reenviar o evento em vez de perdê-lo.

**`src/lib/asaas.js`** (client) — `criarCobranca(tipo)` chama o endpoint com o token da sessão;
`listarCobrancas(orgId)` lê direto via RLS (sem passar pelo endpoint, é só leitura).

**`WebScreen.jsx`** — nova aba "💳 Financeiro" ao lado de Config/Dados:
- Se o cadastro não estiver completo, bloqueia com atalho direto pra aba Dados (reaproveita o
  mecanismo `abrirEm`/`webAbrirEm` que já existia pro mesmo propósito).
- Card Configuração Guiada e card Mensalidade, cada um com status real (pendente/paga/ativa/
  cancelada) puxado de `cobrancas` + `assinatura_status`.
- "Quero cancelar minha assinatura" — confirma com `confirmar()` (dialog já existente), mostra
  até quando o acesso continua (`pago_ate`), e só sinaliza — quem efetiva é o gestor.

**`Gestor.jsx`** — badge de `assinatura_status`, resumo de cobranças por organização
(`CobrancasResumo`), e a fila de cancelamento pendente (`PedidoCancelamento`, botões
Efetivar/Ignorar).

**Configuração feita pelo Junior no Vercel/Asaas**: `ASAAS_API_KEY` (gerada no Asaas, colada nas
env vars do Vercel) e `ASAAS_WEBHOOK_TOKEN` (gerado nesta sessão, colado nas env vars do Vercel
**e** no campo de token do webhook no painel do Asaas); webhook do Asaas apontando pra
`https://clubecompraskorin.vercel.app/api/asaas-webhook` (funciona via o rewrite pro
`api/asaas.js` — não precisou mudar depois da consolidação de functions), reativado depois de
ter sido pausado automaticamente (tentativas de entrega anteriores à configuração falharam e o
Asaas pausa a fila sozinho depois de várias falhas).

**Teste real feito pelo Junior (sandbox)**: gerou uma cobrança de Configuração Guiada — criada
certa no banco (`cobrancas`, R$150, link `sandbox.asaas.com/i/...`), cliente criado com CPF
válido, `billingType: 'UNDEFINED'` (deveria liberar Pix/boleto/cartão) — **mas o Pix não
apareceu na tela de pagamento do Asaas**. Não é bug identificado do nosso lado (dado e request
conferidos). Hipóteses não confirmadas: geração assíncrona do QR Pix (pode aparecer só alguns
segundos depois, precisa recarregar a mesma URL) ou uma configuração de conta separada de só ter
uma chave Pix cadastrada ("Pix habilitado pra cobranças" em Configurações → Meios de
Recebimento). **Ainda não resolvido/confirmado** — ver Pendente.

- **Status no GitHub**: PR #7 mesclado (`3cd8477`), fix do limite de functions (`7ee5c4e`, já
  incluído no merge).

---

## Proposta comercial: Entrega em Domicílio — planejada e precificada, não implementada

**Origem**: um Dedicante sugeriu ao Junior algumas ideias; ele quis tratar como diferencial pago
específico, não recurso geral pra todos. Decisão de negócio fechada em conversa:

- **R$499, pagamento único**, cobrado só do primeiro Dedicante que contratar (financia o
  desenvolvimento).
- **R$9,90/unidade/mês, recorrente**, pros próximos Dedicantes que ativarem depois (a feature já
  vai estar pronta, então não cobra setup de novo) — reaproveita o mesmo valor já usado na
  mensalidade padrão por unidade extra, fácil de explicar.
- O Dedicante escolhe **quais unidades** têm entrega ativa (flag por unidade, não por
  organização inteira).

**Modelo técnico planejado (nada implementado ainda)**: Dedicante cadastra os bairros atendidos
por unidade e a taxa de cada um; ao digitar um bairro, o sistema calcula a distância a partir do
endereço da unidade e ordena a lista automaticamente (do mais perto pro mais longe) — decisão
consciente de **não** tentar "descobrir" todos os bairros de uma cidade por raio em km, porque a
base de dados geográfica necessária não é confiável pra cidades menores (público majoritário do
produto). Opção "receber em casa" no catálogo público, endereço e status no painel de pedidos,
taxa somada automaticamente no fechamento.

- Proposta publicada como artifact:
  `https://claude.ai/code/artifact/543ff7bd-b20e-4204-971d-7e9e3962a82c`.
- Publicada também como página real do produto, pra enviar por WhatsApp com logo e identidade do
  Clube Unido: `public/proposta_001.html` — commit `f70b189`, direto na `main` (adição pura,
  nada existente tocado).
- **Nada disso foi implementado em código** — nem a tabela de bairros/taxa, nem a opção no
  checkout, nem o ajuste do fechamento. É só a proposta comercial e o plano técnico registrados,
  aguardando decisão do Junior de seguir.

---

## Aproximação com a Korin Alimentos — apresentação publicada, portal ainda só planejado

**Contexto de negócio registrado**: em conversa, ficou claro que o sistema inteiro depende, de
forma indireta, da Korin — nome nas colunas do banco (`korin_pedidos`, `korin_data`), a
importação de catálogo lê especificamente a planilha oficial da Korin, o marketing na Home
menciona a Korin abertamente. Isso é risco (marca/dependência de um fornecedor sem relação
formal) e oportunidade (o sistema já funciona como uma espécie de CRM não-oficial da rede de
distribuidores deles) ao mesmo tempo.

**A pedido do Junior**, publicada uma apresentação em slides voltada especificamente pra Korin —
mesmo motor de `apresentacao.html` (clique lateral/teclado/swipe), conteúdo todo novo:

- `public/apresentacao-korin.html` — 12 slides: origem real do sistema (criado originalmente pra
  Valéria, coordenadora de um clube de compras da Korin, Lattuga Orgânicos, que passou mais de 4
  anos controlando tudo num caderno à mão — o mesmo depoimento dela que já existe na Home),
  validado na **Jornada Korin 2026** (evento oficial da Korin, onde o Junior conversou com
  dezenas de coordenadoras de várias regiões e confirmou que o padrão se repetia em escala), o
  que o sistema já faz hoje, benefícios pra Dedicante e pra membro, os 4 processos que hoje
  passam por e-mail entre Korin e Dedicante (planilha inicial, planilha final, rupturas,
  atualizações), um slide de gancho ("E se nada disso precisasse passar por e-mail?") antes das
  ideias de evolução de curto prazo, uma visão de mais longo prazo de integração com os sistemas
  internos da Korin (**sem citar o ERP — TOTVS Protheus — explicitamente no material**, por
  pedido direto do Junior), prova de tração real, e fecha com contato (WhatsApp, e-mail, site)
  como botões clicáveis. Menciona também a experiência mais ampla do Junior — consultoria
  J.Lopes Personal Support, outros sistemas já construídos (Celebrai, BarberOS) — não só esse
  projeto, a pedido dele ("minha experiência não é só o app").
- **Bug real de responsividade mobile encontrado e corrigido depois de publicado**: a "zona de
  clique" (invisível, cobre a tela inteira pra navegar entre slides no desktop) ficava por cima
  do slide no mobile e **bloqueava o toque de rolar** quando o conteúdo empilhado (1 coluna)
  ficava mais alto que a viewport; as setas fixas no rodapé também cobriam texto rolando por
  baixo. Corrigido com `pointer-events:none` na zona de clique no mobile (o swipe continua
  funcionando — é ouvido direto no `#deck`, não depende da zona de clique) e as setas movidas pro
  topo, ao lado da marca. **Testado com toque real via CDP** (`Input.dispatchTouchEvent`, não só
  `scrollTo()` programático) — `scrollTop` ficava travado em 0 antes da correção, mudou pra 182
  depois, confirmando que resolveu de verdade.
- **Status no GitHub**: publicação inicial `f972dba`, ajuste de responsivo/gancho/contatos
  `2529fb3`, correção de verdade da rolagem + nome certo do evento + bio `f03e250` — tudo direto
  na `main`.
- URL em produção: `https://clubecompraskorin.vercel.app/apresentacao-korin.html`.
- **Ainda não confirmado pelo Junior num celular real** depois do último fix (só testado com
  emulação/CDP nesta sessão).

**Ideia registrada em conversa, não implementada**: um "portal" pra Korin, em duas fases
possíveis.
- **Fase 1 (recomendada primeiro, mais simples)**: painel só-leitura mostrando o pedido
  consolidado de toda a rede de Dedicantes que usam o Clube Unido — resolve a dor da "planilha
  final por e-mail" sem depender de nada do lado da Korin (os dados já existem no sistema).
  Precisaria de um papel de acesso novo (nem `platform_admins`/gestor, nem `org_members`/
  Dedicante — um terceiro nível, só leitura, vendo a rede agregada).
- **Fase 2 (mais complexa, fica pra depois)**: catálogo oficial compartilhado que a Korin
  atualiza uma vez (reaproveitando o parser de planilha que já existe em
  `src/lib/importarPlanilha.js`), virando fonte de verdade que os Dedicantes puxam — resolveria
  as outras 3 dores (planilha inicial, ruptura, atualização), mas exige decidir como isso convive
  com cada Dedicante já podendo customizar nome/preço no catálogo próprio (não é substituição
  1:1 trivial).
- **Nada disso foi implementado** — fica registrado como direção de produto pra quando o Junior
  decidir seguir.

---

## Dedicante de unidade: login restrito por unidade — implementado, mesclado na `main`

**Pedido do Junior**: primeiro cliente fechado é uma representante que cuida de 14 unidades em 2
grupos (Campo Grande e Costa Verde) — ela não lança pedido, quem lança são os dedicantes de cada
unidade. Vendeu, à parte, a possibilidade de cada dedicante ter login próprio: só vê a(s)
unidade(s) dele, sem custo, sem editar produto/estoque, sem subir planilha (inicial ou confirmação
de compra), sem abrir/fechar/arquivar o mês.

**Desenho**: papel novo em `org_members` (`role='dedicante_unidade'`) — o restante do sistema já
tinha suporte a múltiplos membros por organização (`org_members` + RLS `is_org_member`), só nunca
tinha um segundo papel de verdade até agora. Feature isolada por organização: uma coluna
`organizacoes.permite_dedicante_unidade` que só o Junior liga manualmente no `/gestor` (mesmo
padrão do "Marcar pago") — desligada por padrão, então nada mudou pra quem já usa o sistema hoje.

Com a chave ligada, a própria representante cadastra o dedicante em **Config → Dedicantes**: nome,
e-mail, unidades (nova tabela `org_member_unidades`, um dedicante pode cobrir mais de uma). O
sistema gera a senha na hora (Admin API do Supabase, via `api/dedicante.js`, service_role — só
assim dá pra criar o login já com senha definida, sem confirmação por e-mail) e mostra uma vez pra
ela copiar e mandar por WhatsApp — não depende de o dedicante saber usar e-mail.

**O que reforça a restrição, e onde**:
- Pedidos/Entregas/PDV: RLS nova (`pode_ver_pedido_unidade`) casando `korin_pedidos.unidade` (é
  texto, não FK) pelo nome da unidade do dedicante — leitura e escrita, não só a tela.
- Produtos/Config somem do menu; catálogo/estoque/período (`periodo_produtos`, `periodos`,
  `compras_confirmadas`, `org_unidades`) ganharam checagem de `is_org_admin` nas políticas de
  escrita — inclusive nas funções `security definer` que faziam bypass de RLS
  (`arquivar_periodo`, `desarquivar_periodo`, `criar_periodo_com_copia`), que sem esse ajuste
  continuariam liberadas pra qualquer papel.
- **Custo**: `preco_custo` saiu de `periodo_produtos` (que é pública — o catálogo do cliente final
  precisa ler sem login) e virou uma tabela própria (`periodo_produtos_custo`) com RLS restrita a
  quem tem acesso total. Consequência boa: o card de custo/margem em Fechamento já não aparece
  pra ninguém sem acesso — não precisou esconder na tela, o dado simplesmente não chega no
  navegador do dedicante.

**Infra**: Vercel Hobby trava em 12 functions; já estava no limite (e uma sessão em paralelo
também mexeu nisso pra caber `api/asaas.js`). `manifest-catalogo.js` + `manifest-entrega.js`
viraram `api/manifest.js`, e no merge desta feature com a `main` (que trouxe Asaas) o total voltou
a estourar — `entrega-lista.js` + `entrega-confirmar.js` também viraram um arquivo só
(`api/entrega.js`, roteado por `acao` via `vercel.json`, mesma técnica). URLs antigas continuam
funcionando, nada mudou pra quem chama.

- `npx vite build` validado a cada etapa; `get_advisors` (security) do Supabase conferido antes e
  depois do merge — sem alerta novo além do padrão já existente no projeto (toda função seguranca
  definida já dispara o mesmo aviso genérico de linter, é assim desde antes).
- **Status no GitHub**: branch `feat/dedicante-unidade`, commit `86b5915`, mesclada na `main` via
  merge (não fast-forward — a `main` tinha avançado bastante em paralelo: Asaas, propostas
  publicadas, guia interativo) após resolver conflitos em `api/manifest.js`, `vercel.json`,
  `src/Gestor.jsx`, `src/lib/auth.js`, `src/lib/platform.js` — todos por sobreposição de área
  (os dois lados mexendo no mesmo trecho pra coisas diferentes), sem perda de nada dos dois lados.
- **Não testado ainda**: fluxo real ponta a ponta com um dedicante de verdade (criar, logar,
  confirmar as restrições, remover). Recomendo testar com e-mail descartável antes de usar com o
  cliente real.

---

## Pendente / próximos passos

1. ✅ **Comparativo do Dashboard — confirmado pelo Junior em teste real, tudo certo.**
2. **Link de entrega por PIN — parcialmente testado.** Junior confirmou funcionando; falta
   testar **PIN errado** e **instalar como PWA a partir do link**.
3. **Upload de planilha real — confirmado OK pelo Junior.** Ainda falta testar: bloqueio de
   remoção de produto com pedido vinculado, aviso de código reaproveitado, e o selo "fora da
   tabela" em Produtos/Embalagens.
4. ✅ **Catálogo público esconde produto "fora da tabela" — decisão do Junior, implementada.**
   Commit `40e4124` na `main`: mesmo padrão já usado pro produto esgotado (só some se o
   carrinho do cliente não tiver nada dele, pra nunca sumir algo que ele já estava editando).
5. ✅ **Artefato publicado atualizado** com importação por planilha (implementada), gap de
   integridade produto↔pedido, link de entrega por PIN e sobra/compra confirmada.
   `https://claude.ai/code/artifact/3cae4755-c3cf-4998-8c37-5e4fb05f2325`
6. **Gap de offline-first do Sistema 2 — ainda não testado.** Simular modo avião no meio do
   checkout do catálogo e da confirmação de entrega, confirmar que o banner aparece, desativar
   modo avião e conferir que a ação chega sozinha sem duplicar — não foi possível testar isso
   neste ambiente (sem credenciais Supabase).
7. ~~Próximas partes do fluxo de campo~~ — **item confuso, substituído**: isso só estava
   perguntando "como os outros coordenadores fecham e enviam o consolidado pra Korin", e essa
   pergunta já está respondida pelo que já existe — encerramento por unidade + export
   consolidado (itens 9 e 10). Não é uma pendência de verdade, só ficou uma nota solta do
   levantamento de campo original. Removido da lista.
8. ✅ **Tela de gestão de clientes — implementada e mesclada na `main`** (ver seção dedicada
   acima). Escopo confirmado pelo Junior: editar, cadastrar/excluir manualmente, exportar
   planilha. **Ainda não testada por ele** — testar buscar, editar um cadastro existente,
   cadastrar manualmente, excluir (confirmar que não afeta pedido já feito) e exportar.
9. **Encerramento por unidade — ainda não testado.** Fechar uma unidade e confirmar que bloqueia
   pedido novo nos 3 caminhos (catálogo, manual, colado) sem travar pedido/entrega já existente;
   testar reabrir.
10. **Export consolidado — testado só no desktop, OK.** Falta testar no mobile.
11. **Renomear/excluir unidade — ainda não testado.**
12. **Estoque real + PDV numa feira/culto real — PDV parece OK pro Junior, estoque real ainda não
   testado.** Falta especificamente: conferir que "restam N" desconta certo no PDV (isso o
   Junior já validou), e testar a sobra "dobrada" na aba Produtos/Embalagens com um período que
   já tenha compra confirmada do mês anterior (isso ainda não).
13. ~~Logo nova em produção~~ — **obsoleto, confirmado pelo Junior.** Falava da logo oficial da
   Korin, substituída pelo rebrand (ver item 15). Removido da lista.
14. ✅ **Página inicial em produção — confirmado pelo Junior, tudo certo.**
15. **Rebrand "Clube Unido" — testado em desktop, OK pro Junior.** Falta testar em dispositivo
   real: ícone atualizando sozinho pra quem já tem o PWA instalado (versão do cache subiu de
   propósito pra isso), instalar do zero num Android e num iPhone, preview de compartilhamento
   no WhatsApp, e uma notificação push de verdade.
16. **Asaas — Pix não apareceu no primeiro teste real do Junior (sandbox).** Não é bug
   identificado do nosso lado (`billingType: 'UNDEFINED'` correto, cliente com CPF válido).
   Falta confirmar se foi geração assíncrona do QR (recarregar a mesma URL resolve) ou
   configuração de conta separada ("Pix habilitado pra cobranças" x só ter chave Pix
   cadastrada) — ver seção dedicada "Integração com Asaas" acima.
17. **Asaas — fluxo ponta a ponta ainda não validado com pagamento confirmado de verdade.**
   Testar: webhook realmente chega e atualiza `pago_ate`/`assinatura_status`/`cobrancas` quando
   uma cobrança sandbox é paga; pedido de cancelamento aparecendo certo em `/gestor`; bloqueio
   de cadastro incompleto impedindo contratar (tela e servidor).
18. **Apresentação pra Korin (`/apresentacao-korin.html`) — corrigida e testada com toque real
   via CDP nesta sessão, mas ainda não confirmada pelo Junior num celular de verdade** depois do
   último fix de rolagem mobile.
19. **Entrega em Domicílio — só proposta comercial e plano técnico, nada implementado.** Decisão
   de seguir ou não é do Junior; ver seção dedicada acima pro escopo já fechado (preço, regra de
   bairro/distância, o que entra no R$499).
20. **Portal pra Korin — só ideia registrada, nada implementado.** Se o Junior quiser seguir, a
   Fase 1 (painel de leitura com pedido consolidado da rede) é o ponto de partida recomendado —
   ver seção dedicada acima.

---

## Nota operacional sobre sessões múltiplas

O acesso de escrita ao GitHub do Sistema 1 e do Sistema 2 fica em sessões Claude Code separadas
(cada uma criada com um repositório diferente como fonte). Usar duas sessões ao mesmo tempo pra
coordenar merges de produção (relay de patch entre sessões, confirmações duplicadas) se mostrou
improdutivo. Recomendação: trabalhar cada sistema direto na sessão que já tem acesso de escrita
ao repo correspondente, trazendo este arquivo como contexto inicial quando for preciso retomar em
outra sessão.
