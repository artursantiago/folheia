# Identidade visual: tema Ex-libris

> A identidade é um ponto forte do produto: quem bate o olho tem que reconhecer "isso é o Folheia". Este documento é a regra; o [protótipo aprovado](prototipo/) é a referência visual (link do canvas no `CLAUDE.md`).

## Ideia central

O Folheia é uma **biblioteca de bolso**: um acervo de leitura pessoal, com livros, quadrinhos, mangás e revistas, lidos folheando. Toda a interface fala a língua de uma biblioteca: fichas catalográficas, números de tombo, carimbos, bordas picotadas e números batidos à máquina. Uma biblioteca cataloga qualquer obra, então essa linguagem não é só de "livro". O único símbolo é o monograma F (abaixo); fora ele, a identidade está no vocabulário, sem mascote.

- **De dia (tema claro):** o ateliê, com papel, tinta e carimbo terracota.
- **À noite (tema escuro):** o sebo, com azul-noite, uma luz de abajur atrás do livro e detalhes em latão.

O livro aberto é sempre o protagonista. A personalidade fica na moldura (início, barra, painéis, diálogos, estados), e o fundo atrás das páginas fica calmo.

## Ícone: o monograma F

Decidido em 20/10/2026 (D4 do `roteiro.md`). O ícone é o **F da Young Serif** em tinta sobre papel, com o **filete terracota** das fichas logo abaixo.

- **Arquivos:** `public/icons/` (PWA, apple-touch, maskable e favicon), gerados por `scripts/make-icons.mjs`. O script guarda o contorno do F, e a licença OFL permite usar o desenho da fonte num logo.
- **Cores:** os PNGs usam o tema claro (Ateliê). O favicon SVG troca para o Sebo à noite quando o sistema está no escuro.
- **Proporção:** o bloco (F + espaço + filete) ocupa 62% da altura do ícone, e 50% no maskable, para caber no recorte redondo do Android.
- **Variações exploradas e descartadas:** ficha, orelha de página, carimbo com F, livro com fita, folha virando, ex-libris.

## Paleta

| Papel               | Claro (Ateliê)              | Escuro (Sebo à noite)  |
| ------------------- | --------------------------- | ---------------------- |
| Fundo (`paper`)     | `#F3EDE1` papel             | `#12161D` noite        |
| Superfície (`card`) | `#FBF7EF` ficha             | `#1E242E` ficha        |
| Texto (`ink`)       | `#2B2420` tinta             | `#EDE3CF` papel        |
| Texto secundário    | `#5F5045`                   | `#A9B1BF`              |
| Destaque (`accent`) | `#A9481F` carimbo terracota | `#E2A84B` latão        |
| Apoio               | `#3E5641` encadernação      | `#8DB39A` encadernação |
| Pautas e divisórias | `#DDD1BE`                   | `#323A47`              |
| Picote              | `#8C7B6B`                   | `#6E7788`              |

O destaque é usado com parcimônia: carimbos, filete das fichas, item atual, foco e erros. Textos de interface têm contraste mínimo de 4,5:1 nos dois temas.

## Tipografia

Todas as fontes são OFL, hospedadas no próprio site.

- **Young Serif:** títulos, nome "Folheia", títulos de livros. Peso único.
- **Atkinson Hyperlegible Next:** todo texto de interface (botões, descrições, menus). Foi desenhada para legibilidade.
- **IBM Plex Mono:** números e metadados, a "máquina de escrever": número de página, tombo (`Nº 0001`), datas, rótulos em caixa alta com espaçamento (`FICHA DE EMPRÉSTIMO`), ficha catalográfica.

A fonte mono **nunca** é usada em frases longas de interface. A serifada **nunca** é usada em texto pequeno.

## Assinatura (os elementos que se repetem)

1. **Ficha:** cartão com cabeçalho separado por um filete na cor de destaque, corpo com pauta horizontal e, quando representa um "cartão" físico, o furo central embaixo.
2. **Picote:** borda tracejada interna (área de soltar arquivo, barra de controles, gaveta lateral).
3. **Carimbo:** rótulo em mono, caixa alta, borda dupla, levemente girado (−3° a −8°). Marca estados e selos: "Domínio público", "Pág. 87", "Acesso negado", "Seu arquivo não sai deste aparelho".
4. **Tombo:** número `Nº 0001` em mono, como identificador de cada livro e de cada ficha.
5. **Luz de abajur** (só no escuro): um halo radial suave atrás do livro.

## Componentes

Toda tela é montada **somente** com os componentes de `src/ui/components/`. Se faltar um, crie-o no design system (e no guia `#/estilo`), não na tela.

| Componente       | Uso                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------- |
| Botão primário   | Uma ação principal por tela (fundo tinta, texto papel).                             |
| Botão secundário | Contorno de 1,5 px na cor tinta.                                                    |
| Botão fantasma   | Sem borda; ações terciárias ("Cancelar").                                           |
| Botão de ícone   | 44 × 44 px no mínimo; ativo = contorno interno.                                     |
| Campo            | Linha de formulário: só a borda inferior, texto em mono, rótulo em mono caixa alta. |
| Segmentado       | Opções mutuamente exclusivas (Auto/Uma/Duas, Sistema/Claro/Escuro).                 |
| Alternador       | Liga/desliga.                                                                       |
| Ficha            | Diálogos, painéis de informação, área de soltar arquivo.                            |
| Carimbo          | Selos e estados.                                                                    |
| Barra de leitura | Ficha horizontal com picote no topo e o contador de páginas em mono.                |
| Gaveta           | Painel lateral (índice: sumário + miniaturas).                                      |
| Aviso            | Faixa curta em tinta com uma ação ("Nova edição disponível · Recarregar").          |

Cantos: 3 px em controles e 4 px em fichas, nada arredondado demais. Alvos de toque de pelo menos 44 px. Foco sempre visível.

## Textos de apresentação

Decididos em 20/10/2026 (D4). O app é um acervo de leitura, não um "conversor de PDF em flipbook". Por isso os textos não citam formato nem "flipbook", e não dão ênfase a de onde vêm os arquivos.

| Papel          | Onde                                                                | Português                                                                                                                  | Inglês                                                                                                  |
| -------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Descrição**  | Repositório, manifesto do PWA, `<meta description>`, topo do README | Leia livros, HQs e mangás folheando, como no papel.                                                                        | Read books, comics and manga by leafing through them, like on paper.                                    |
| **Slogan**     | Título do acervo vazio, página da organização                       | Para folhear tudo o que você lê.                                                                                           | Leaf through everything you read.                                                                       |
| **Explicação** | "O que é" do README e do plano                                      | O Folheia é o seu acervo de leitura: livros, quadrinhos, mangás e revistas num lugar só, lidos folheando, página a página. | Folheia is your reading collection: books, comics, manga and magazines in one place, read page by page. |

**Dentro do app** (aplicados no redesign, onda 2 do roteiro):

- **Cabeçalho:** "Biblioteca de bolso" (no lugar de "Leitor de livros · PDF e CBZ").
- **Início com o acervo vazio:**
  - sobretítulo "Seu acervo";
  - título "Para folhear tudo o que você lê.";
  - apoio "Leia seus livros, quadrinhos e mangás folheando, como no papel.".
- **Instrução de soltar:** "Arraste um arquivo até aqui, ou escolha no seu aparelho.", sem formato. Logo abaixo, em mono e discreto, como metadado: `PDF · CBZ · ZIP`. É o único lugar do app que cita formatos.
- **A antiga "ficha de empréstimo"** não encaixa: empréstimo é pegar de uma biblioteca, e aqui você põe algo no seu acervo.
  - **Direção a validar no protótipo v2:** a ficha vira **"Nova entrada"**, mostrando o próximo tombo.
  - **Títulos candidatos:** "Comece o seu acervo." (acervo vazio), "O que vamos ler hoje?", "Escolha o que folhear." e "Traga algo para ler.".
- **O carimbo de privacidade** vai para o "Sobre", em Mais.

## Voz

A interface fala como uma bibliotecária gentil: clara antes de criativa.

| Em vez de                   | Escrevemos                                                 |
| --------------------------- | ---------------------------------------------------------- |
| Fechar livro                | Devolver à estante                                         |
| Informações                 | Ficha do livro                                             |
| Exemplos                    | Catálogos (antes "Do acervo"; o Acervo agora é o seu)      |
| Área de upload              | Nova entrada (a validar no protótipo v2; ver acima)        |
| Carregando…                 | Catalogando                                                |
| Retomar leitura             | "Retomado da pág. 87 · Do início" (o cartão saiu)          |
| Nova versão                 | Nova edição do Folheia disponível                          |
| Erro: formato não suportado | "Ainda não lemos arquivos CBR." · carimbo "Não catalogado" |

Erros dizem **o que aconteceu** e **o que fazer**, sem jargão: "Esse endereço não deixou a gente entrar. Baixe o arquivo e abra daqui." Em inglês, a mesma metáfora com vocabulário natural (_Return to shelf_, _Book card_, _From the collection_).

## Regras de engenharia

- Cores, fontes, tamanhos, espaçamentos, raios e durações vêm **só** dos tokens em `src/theme/`. O Stylelint barra hex, `rgb()`/`hsl()` e `font-family` literais fora dessa pasta.
- Cada tema é um conjunto de tokens. Temas futuros (Cordel, HQ, mangá) trocam tokens e texturas da assinatura, não a estrutura dos componentes.
- Todo componente novo aparece no guia de estilo vivo (`#/estilo`), nos dois temas.
- `prefers-reduced-motion` desliga carimbos animados e troca a dobra de página por um fade.

## O que não fazer

- Outros logos ou símbolos além do monograma F.
- Gradientes decorativos, sombras pesadas, glassmorphism, emoji na interface.
- Cantos muito arredondados ou botões em formato de pílula.
- Texturas pesadas (madeira, couro) ou imagens decorativas que pesem no carregamento.
- Componentes "soltos" criados direto numa tela.
