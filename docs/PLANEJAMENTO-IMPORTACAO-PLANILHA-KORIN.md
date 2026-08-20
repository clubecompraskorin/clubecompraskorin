# Sistema 2 (Clube de Compras Korin) — Planejamento: importação da planilha oficial da Korin

> Documento de levantamento de contexto e requisitos — **nada foi implementado ainda**. Registra
> as descobertas de campo do Junior (evento na Korin Alimentos) e a análise técnica de uma
> planilha real da Korin, para orientar o desenho de uma segunda forma de importar o catálogo
> do mês (hoje só existe "foto + IA", pensada no fluxo específico da Valéria).
>
> Complementa o comparativo publicado como artefato (link mantido nas conversas com o Junior),
> que já cobre o inventário completo de telas/botões dos dois sistemas e o veredito de
> paridade/superação entre eles.

---

## 1. Contexto de origem (evento na Korin Alimentos)

O Junior apresentou o Sistema 1 (Ação Social / Valéria) pra outros coordenadores de clube de
compras da Korin, de várias regiões do Brasil, e vai deixar uma versão do Sistema 2 (multi-tenant)
pra esse grupo testar por alguns dias.

Ao perguntar, um a um, como cada coordenador faz a divulgação da tabela até o envio do pedido
consolidado pra Korin, o Junior identificou:

- **A Valéria é a exceção, não a regra.** Ela analisa a tabela da Korin, escolhe um subconjunto
  de produtos, monta sua própria tabela e gera uma imagem, divulgada só pelo grupo de WhatsApp.
  O fluxo de importação por foto+IA que já existe nos dois sistemas foi desenhado em cima
  exatamente desse padrão.
- **A maioria dos outros coordenadores não faz essa curadoria antes.** Alguns repassam a tabela
  cheia da Korin como está; outros usam e-mail ou Google Forms — formatos que não são nem
  "uma imagem de tabela".
- **A fonte oficial que a Korin de fato distribui é uma planilha Excel/Google Sheets**, não uma
  foto. Confirmado com o Junior (não é PDF, não varia por região — é sempre planilha).
- **Restrição de produto que direciona todo o desenho da solução:** grande parte desses
  coordenadores são "analfabetos digitais" — pouco domínio de tecnologia, dificuldade real com
  apps/sites. Qualquer fluxo novo precisa ser o mais simples e direto possível de usar e entender.

## 2. Análise da planilha real da Korin

Arquivo analisado: `TABELA CLUBE DE COMPRAS - SP CIF - AGOSTO 2026` (enviado pelo Junior,
já preenchido com os dados do grupo da própria Valéria — Johrei Center Praia Grande). 1 aba,
90 linhas, 41 intervalos de células mescladas.

### 2.1 Não é só uma tabela de preços — é o próprio formulário de pedido

- **Linhas 1–9**: bloco de cabeçalho já preenchido pela Korin com os dados do grupo — nome do
  JC, razão social, CNPJ, endereço de entrega, data de entrega sugerida, responsável pelo
  recebimento, e o mês de vigência da tabela.
- **3 blocos de produtos nomeados**: "TABELA AÇÃO SOCIAL" (linha 10), "TABELA OPORTUNIDADE:
  Produtos com PREÇOS ESPECIAIS esse mês!" (linha 20, preços promocionais do mês) e "TABELA
  COMPLEMENTAR" (linha 31) — **o nome "Ação Social" do próprio Sistema 1 vem daqui**, é uma
  categoria de preço oficial da Korin, não uma invenção da Valéria.
- **Coluna `QTDE (CX)` vem em branco** — é o que o coordenador preenche e devolve por e-mail pra
  Korin. `TOTAL`, `PESO (KG)` e `VALOR TOTAL DO PEDIDO` são fórmulas que recalculam ao preencher.
- **Linhas 70–90**: campo de observações livre + texto de orientações/instruções (não é dado de
  produto, tem que ser excluído de qualquer parser).

### 2.2 Estrutura difícil pra um parser simples (e pra um humano sem afinidade digital)

- **Cabeçalho de coluna não é consistente entre seções.** A seção "Ação Social" (linha 11) tem 9
  colunas (inclui `PESO (KG)`, `PESO CX`, `QTD P/ CX`); a seção "Complementar" (linha 32) repete
  só 6 delas — mesmo as colunas fantasmas ainda tendo dado nas linhas abaixo.
- **A seção "Oportunidade" não tem linha de cabeçalho própria** — segue direto da seção anterior.
- **Uma seção inteira (peixes, linhas 52–54) não tem título nenhum** — a célula mesclada que
  deveria ter o rótulo está vazia nesse arquivo.
- **Linhas de subtotal (fórmula, sem código de produto)** aparecem misturadas entre os produtos —
  fácil de confundir com uma linha de produto se o parser não filtrar por "tem código".
- **"Unidade" não é uma coluna separada** — vem embutida no texto da descrição
  (`"CX C/12 BD 600G"`, `"PCT CX C/17KG C/17 PCT"`) — precisa de extração de texto, não é
  1 coluna = 1 campo.
- **Categoria quase nunca vem rotulada.** Só os 3 blocos macro têm título; frango 1kg, frango
  600g, peixe, arroz/feijão/café/mel dentro de "Complementar" não têm rótulo nenhum — só dá pra
  inferir por código/nome do produto ou por agrupamento visual (linhas em branco como separador).

### 2.3 Achado que reduz um risco já documentado

Os códigos reais da Korin (`1423`, `41027`, `56004`, `57501`...) são **SKUs estáveis da própria
Korin**, bem diferentes dos códigos 1–29 que a Valéria usa na tabela curada dela (que são uma
numeração sequencial própria, por posição no bloco de categoria).

O "risco estrutural" registrado no comparativo S1×S2 (código de produto podendo deslocar se a
Korin inserir um item no meio de um bloco) é específico do fluxo manual da Valéria — **não existe
esse risco se a origem da importação for a planilha oficial da Korin**, porque o código já é o
identificador estável do produto no catálogo da própria fornecedora.

### 2.4 Achado que expõe uma limitação da taxonomia fixa atual

`CATS_ORDEM` (`src/lib/catalog.js`, idêntico nos dois sistemas) é fixo em 5 categorias:
`Frangos 1kg`, `Frangos 600g`, `Diferenciados`, `Mercearia`, `Ovos` — herdadas 1:1 do mix de
produtos que a Valéria vende. A planilha real da Korin tem uma linha inteira de **peixes**
(truta, tilápia), categoria que **não existe** na taxonomia atual de nenhum dos dois sistemas.
Pra um SaaS multi-tenant com coordenadores de mix de produto variado, uma lista fixa de
categorias tende a não escalar.

### 2.5 Oportunidade paralela (baixa fricção pra usuário pouco tech)

Os mesmos dados que hoje são digitados manualmente na aba "Dados" do Sistema 2 (responsável,
razão social, CNPJ) **já vêm prontos no cabeçalho dessa mesma planilha**. Dá pra propor, no
mesmo fluxo de upload, auto-preencher o cadastro da organização a partir do arquivo — sem o
coordenador digitar nada a mais. Ainda não desenhado, só uma oportunidade identificada.

## 3. Mapeamento de colunas candidato (não implementado)

| Coluna da planilha Korin | Campo do sistema | Observação |
|---|---|---|
| `CÓD.` | `cod` | SKU estável da Korin — ver 2.3 |
| `DESCRIÇÃO PRODUTO` | `nome` (+ `unidade` via parsing) | unidade embutida no texto, precisa extração |
| `VENDA (UND)` | `preco` | preço de venda sugerido, por unidade |
| `CUSTO (CX)` ÷ `QTD P/ CX` | `precoCusto` | custo por unidade = custo da caixa / unidades por caixa |
| `QTD P/ CX` | `qtdCaixa` | mapeamento direto |
| — | `categoria` | sem coluna própria — precisa de inferência (ver 2.2) |
| `PESO (KG)` / `PESO CX` | — | sem campo equivalente hoje em nenhum dos dois sistemas |

## 4. Status

Levantamento de contexto em andamento — **aguardando o Junior trazer a próxima parte** antes de
qualquer desenho de solução ou implementação. Nada foi alterado em nenhum dos dois sistemas.
