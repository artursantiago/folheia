# Identidade visual: tema Ex-libris

> A identidade é um ponto forte do produto: quem bate o olho tem que reconhecer "isso é o Folheia". Este documento é a regra; o [protótipo aprovado](prototipo/) é a referência visual (link do canvas no `CLAUDE.md`).

## Ideia central

O Folheia é uma **biblioteca de bolso**. Toda a interface fala a língua de uma biblioteca: fichas catalográficas, números de tombo, cartões de empréstimo carimbados, bordas picotadas e números batidos à máquina. Ela não usa ícone de marca nem mascote: a identidade está no vocabulário.

- **De dia (tema claro):** o ateliê, com papel, tinta e carimbo terracota.
- **À noite (tema escuro):** o sebo, com azul-noite, uma luz de abajur atrás do livro e detalhes em latão.

O livro aberto é sempre o protagonista. A personalidade fica na moldura (início, barra, painéis, diálogos, estados), e o fundo atrás das páginas fica calmo.

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

## Voz

A interface fala como uma bibliotecária gentil: clara antes de criativa.

| Em vez de                   | Escrevemos                                                 |
| --------------------------- | ---------------------------------------------------------- |
| Fechar livro                | Devolver à estante                                         |
| Informações                 | Ficha do livro                                             |
| Exemplos                    | Do acervo                                                  |
| Área de upload              | Ficha de empréstimo · "Traga um livro para a mesa."        |
| Carregando…                 | Catalogando                                                |
| Retomar leitura             | Cartão de empréstimo · "Continuar da página 87"            |
| Nova versão                 | Nova edição do Folheia disponível                          |
| Erro: formato não suportado | "Ainda não lemos arquivos CBR." · carimbo "Não catalogado" |

Erros dizem **o que aconteceu** e **o que fazer**, sem jargão: "Esse endereço não deixou a gente entrar. Baixe o arquivo e abra daqui." Em inglês, a mesma metáfora com vocabulário natural (_Return to shelf_, _Book card_, _From the collection_).

## Regras de engenharia

- Cores, fontes, tamanhos, espaçamentos, raios e durações vêm **só** dos tokens em `src/theme/`. O Stylelint barra hex, `rgb()`/`hsl()` e `font-family` literais fora dessa pasta.
- Cada tema é um conjunto de tokens. Temas futuros (Cordel, HQ, mangá) trocam tokens e texturas da assinatura, não a estrutura dos componentes.
- Todo componente novo aparece no guia de estilo vivo (`#/estilo`), nos dois temas.
- `prefers-reduced-motion` desliga carimbos animados e troca a dobra de página por um fade.

## O que não fazer

- Logo, ícone de marca ou símbolo gráfico (até o Artur pedir).
- Gradientes decorativos, sombras pesadas, glassmorphism, emoji na interface.
- Cantos muito arredondados ou botões em formato de pílula.
- Texturas pesadas (madeira, couro) ou imagens decorativas que pesem no carregamento.
- Componentes "soltos" criados direto numa tela.
