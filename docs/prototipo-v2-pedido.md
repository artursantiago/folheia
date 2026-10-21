# Folheia — Pedido do protótipo v2

> 20/10/2026. **Aprovado pelo Artur em 20/10/2026**, depois de uma sabatina do rascunho, uma pergunta por vez, com esboços. É a etapa 0 da biblioteca (`plano-mvp.md` §8 C2).
>
> - **Fontes do pedido:** as telas do `estudo-interface.md` §8, as mudanças de moldura do leitor do `roteiro.md` §2, os textos e o ícone do `identidade-visual.md` e as decisões abaixo.
> - **Formato:** o mesmo do protótipo aprovado: um arquivo por tela, claro e escuro. A cópia entra em `docs/prototipo-v2/`.
> - **Em duas levas.** A leva 1 destrava a etapa 2 da biblioteca. A leva 2 vai depois que a leva 1 for aprovada.
> - **Como colar:** a "Base comum" vai junto com cada leva.
> - **Leva 1 desenhada e aprovada pelo Artur em 20/10/2026:** [Folheia v2 · protótipo da biblioteca](https://claude.ai/artifact/67HDT4miiB5ftEqtDBJsTb) (privado), com cópia em `docs/prototipo-v2/`. São 38 pranchas: cada tela em celular, tablet e desktop, com claro e escuro lado a lado. As escolhas que o desenho fez além do pedido estão no `estudo-interface.md` (decisões 36–45). A leva 2 ainda não foi desenhada.

## Decisões da sabatina (20/10/2026)

1. **Lista de telas:** entram as lacunas do rascunho (abrir por endereço, leitura sem registro no menu do leitor, "Exportar a ficha" e o splash) e uma tabela do que acontece com cada tela da v1. A ordem segue a etapa que cada tela destrava.
2. **Estantes:** abas como **divisórias de fichário** (a aba atual "na frente", com o filete terracota). As prateleiras (uma fileira por estante) foram descartadas: na tela, um livro em duas estantes apareceria duas vezes, e cada fileira só mostraria capas.
3. **Exibições do acervo: quatro.** Capas (o padrão), lista, fichário e **lombadas**. A lombada é gerada pelo app, porque as APIs de livros (Open Library, Google Books) só servem a capa da frente. Se um CBZ trouxer a lombada escaneada (uma página bem estreita), o app usa ela.
4. **Lombadas: o gesto.** O hover (só no desktop) puxa o livro um pouco para fora da estante, sem girar. O toque ou clique tira o livro da estante e gira para mostrar a capa. **Duas propostas vão ao design, em versão realista:** "ao centro" e "a ficha sai do bolso". O fundo leva o véu dos diálogos, não desfoque: um `backdrop-filter` sobre o acervo inteiro custaria caro no iPad e no Android.
5. **Sons do acervo:** tirar o livro da estante tem som. O hover pode ter um som bem mais baixo, só depois de o mouse parar ~150 ms num livro, para não virar uma rajada. Isso entra na trilha do som (E13), com um liga/desliga só, "Sons". O protótipo não desenha som.
6. **Tamanhos:** cada tela em **três tamanhos**, um por faixa de corte: celular, tablet (iPad em pé) e desktop. A responsividade em qualquer aparelho vira uma passada própria no fim, depois das features (`roteiro.md`).
7. **"Nova entrada":** a ficha aparece no acervo vazio e no "Adicionar", com o próximo tombo.
   - **Títulos:** o slogan "Para folhear tudo o que você lê." é o título da página vazia. "Comece o seu acervo." é a frase da ficha, e "O que vamos ler hoje?" é a frase no "Adicionar".
   - **Endereço:** "ou cole um endereço" mora dentro da ficha. Um endereço colado ali **entra no acervo**. O `?file=` de um link de fora continua abrindo direto no leitor.
8. **Sem aba "Tudo":** o "Por catalogar" já faz o papel do "Padrão" do Mihon. A busca procura no acervo inteiro, não só na aba aberta.
9. **Navegação: o fichário vertical (A).** Cada seção é uma divisória com a aba saindo da lateral; a seção atual é a ficha da frente. No celular, as abas descem da borda de baixo. **Cuidado:** as bordas das fichas de trás devem ser mínimas, para não poluir. Também foram exploradas (e ficaram de fora) um trilho sóbrio de ícone e rótulo, o gaveteiro de fichas, o índice de dedo, a pilha de livros e a lombada do app com etiquetas de classificação.
10. **Menu do leitor × Mais:** o menu do leitor fica com o que se muda no meio da leitura. A **"Qualidade máxima" vai só para Mais**. Tema e Sons ficam nos dois lugares, com uma preferência só.
11. **Dica das zonas de toque:** aparece na primeira leitura no app e quando o sentido da leitura muda. Some no primeiro toque, que não vira a página.
12. **Exemplos fora do app:** os exemplos de domínio público vão para uma **landing page**, item próprio da frente 2. Por isso Catálogos sai da etapa 2 e entra com o primeiro catálogo de verdade (OPDS). No protótipo, Catálogos fica como estrutura futura, na leva 2.
13. **"Sobre":** vira a **ficha catalográfica do próprio Folheia**. Nenhum carimbo de privacidade aparece no app. O carimbo "Domínio público" vai com os exemplos para a landing.
14. **Duas levas:** a leva 1 destrava a etapa 2; o resto vai na leva 2.

---

## Base comum (vai junto com cada leva)

Revise o protótipo aprovado do Folheia (Ex-libris, 15 telas, claro e escuro) para a **biblioteca pessoal**. O app deixa de ser "abrir um arquivo e ler" e vira um acervo de leitura: livros, HQs, mangás e revistas, lidos folheando.

**Mantenha a linguagem aprovada:**

- fichas catalográficas, número de tombo, carimbos, bordas picotadas e números batidos à máquina;
- as paletas Ateliê (claro) e Sebo à noite (escuro);
- Young Serif nos títulos, Atkinson Hyperlegible Next no texto e IBM Plex Mono nos números;
- o único símbolo é o **monograma F** (o F da Young Serif com o filete terracota embaixo). Não crie outros logos nem mascotes.

**Tamanhos:** desenhe **cada tela em três tamanhos**, um para cada faixa de corte: **celular** (390 × 844), **tablet** (iPad em pé, 820 × 1180) e **desktop** (1280 × 800). O desktop também representa o iPad deitado (1180 × 820), que fica na mesma faixa.

- O corte é pela largura: abaixo de 600 px, abas embaixo; a partir de 600 px, abas na lateral; a partir de 1024 px, dois painéis.
- O app precisa funcionar em qualquer largura, mas não desenhe outros tamanhos agora.
- **iOS e Android têm a mesma identidade.** Não imite o Material nem o visual da Apple.

### Navegação: o fichário vertical

Quatro seções fixas, sempre com rótulo visível: **Acervo**, **Leituras**, **Catálogos** e **Mais**. O leitor abre por cima de tudo e não é uma seção.

- **A partir de 600 px:**
  - cada seção é uma **divisória de fichário**, com a aba saindo da lateral esquerda em alturas escalonadas;
  - a seção atual é a **ficha da frente**, com a aba colada a ela e o filete terracota;
  - as outras abas ficam atrás, num tom mais escuro;
  - o monograma F fica no topo.
- **No celular:** as abas descem da borda de baixo da ficha, também escalonadas, com a atual colada à ficha.
- **Cuidado:** as bordas das fichas de trás devem ser mínimas, uma ou duas linhas finas no máximo, para não poluir.
- **As estantes do acervo também são abas** (horizontais, no topo do acervo). As duas não podem se confundir.

### Telas da v1

| Destino               | Telas da v1                                                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Viram outra tela      | Início claro, Início no celular e Início escuro arrastando → **Acervo vazio com a "Nova entrada"**                                |
| Saem                  | Continuar (o cartão "Continuar?" saiu)                                                                                            |
| Ganham a moldura nova | Leitor dupla, Leitor no celular, Leitor virando, Índice (sumário e miniaturas) e Ficha (o diálogo no leitor, com o conteúdo novo) |
| Mudam                 | Ajustes (o menu do leitor, com a divisão abaixo)                                                                                  |
| Ficam como estão      | Carregando ("Catalogando"), Erros, Senha, Zoom no celular e Guia de estilo                                                        |

### Regras

- Toda tela nos três tamanhos e nos dois temas.
- Áreas de toque de 44 px, foco visível e contraste mínimo de 4,5:1.
- Respeite as áreas seguras: o entalhe e o indicador de início do iPhone, e a barra de gestos do Android.
- O Voltar do Android e o Esc fecham o que estiver aberto (diálogo, gaveta, livro tirado da estante), depois saem do leitor, depois voltam ao Acervo.
- `prefers-reduced-motion`: nada gira nem desliza; tudo aparece com um fade curto.
- Sem desfoque de fundo. Para destacar algo por cima, use o véu de tinta dos diálogos.
- Use só os componentes do protótipo aprovado e estes novos: aba de divisória (navegação e estantes), capa com selos, lombada, grade, lista, fichário, busca, caixa de três estados, barra de seleção, gaveta de baixo, aviso com ação, faixa, estado vazio, selo, linha de lista e a dica das zonas de toque.

---

## Leva 1: o acervo aparece (destrava a etapa 2)

1. **Navegação**, nos dois temas.
   - Com as quatro seções.
   - **E também como ela fica na etapa 2, só com Acervo e Mais.** Leituras e Catálogos entram depois, e nenhuma seção aparece vazia.
2. **Acervo vazio.**
   - Cabeçalho "Biblioteca de bolso".
   - Sobretítulo "Seu acervo", título "Para folhear tudo o que você lê." e apoio "Leia seus livros, quadrinhos e mangás folheando, como no papel.".
   - A ficha **"Nova entrada"**, com o próximo tombo (`Nº 0001`) no cabeçalho:
     - a frase "Comece o seu acervo.";
     - a instrução "Arraste um arquivo até aqui, ou escolha no seu aparelho.";
     - o botão "Escolher arquivo";
     - logo abaixo, em mono e discreto, `PDF · CBZ · ZIP`: é o único lugar do app que cita formatos;
     - o campo "ou cole um endereço".
   - O estado **arrastando um arquivo** por cima da página.
3. **"Adicionar"**, com o acervo já cheio: a mesma ficha "Nova entrada", com o próximo tombo e a frase "O que vamos ler hoje?". No celular, numa gaveta de baixo; no iPad e no desktop, num diálogo.
4. **Acervo com capas, sem estantes.**
   - **Na capa:**
     - a fita de progresso (ou "pág. 45/200");
     - "novo";
     - o carimbo "lido";
     - o exemplar ausente (contorno tracejado e o carimbo "Exemplar ausente");
     - o formato, discreto.
   - **O tombo não aparece na capa.**
   - Um botão pequeno na capa abre a ficha (área de toque de 44 px). Tocar na capa retoma a leitura.
   - **No topo:** "Adicionar" fixo, busca, ordenar ("Última leitura" é o padrão), filtrar e a escolha da exibição, com os quatro ícones (capas, lista, fichário, lombadas).
5. **Ficha do livro como página.** No desktop também, até os dois painéis da leva 2.
   - **Dados:** tombo discreto, autor, título, ano, páginas, formato e tamanho, série e número, idioma, estantes, notas e progresso.
   - **O resumo das leituras** no visual do cartão de empréstimo (carimbos datados).
   - **Ações:**
     - continuar;
     - "Guardar no acervo" (livro aberto por URL);
     - "Guardar cópia no aparelho";
     - "Remover só o arquivo";
     - escolher uma página como capa;
     - editar os dados;
     - exportar a ficha;
     - remover do acervo.
6. **Leitor, a moldura nova:** em página dupla no desktop e em página simples no tablet e no celular.
   - **Topo:** o tombo discreto ao lado do título e "Guardar no acervo" num livro aberto por URL.
   - **Abertura:** o aviso "Retomado da pág. 87 · **Do início**", que some sozinho. O cartão "Continuar?" sai.
   - **Barra:**
     - a barra do modo normal **fica sempre visível** (ela não some mais), no espaço que o palco já reserva;
     - o **slider de páginas também na barra normal**, com as marcas dos capítulos do sumário no trilho.
   - **No celular:** o menu **"⋯"** com o que hoje some (primeira e última página, zoom, compartilhar).
   - **Gaveta do índice:** a grade de miniaturas **em pares de spread**.
   - **Menu de ajustes do leitor:**
     - **itens:** páginas (auto, uma, duas), capa sozinha, sentido da leitura, barra no modo imersivo, tema e **sons**;
     - **no rodapé:** "Copiar diagnóstico";
     - **saem para Mais:** a qualidade máxima, a ponta no canto e o idioma.
   - **A dica das zonas de toque:**
     - **quando:** na primeira leitura no app e sempre que o sentido muda;
     - **como:** um véu de tinta sobre as três zonas, separadas por linhas picotadas;
     - **bordas:** os carimbos "Anterior" e "Próxima" com setas, trocados no sentido direita → esquerda, com a linha "Sentido: direita → esquerda";
     - **meio:** "Toque duplo aproxima";
     - **no desktop:** as teclas nos carimbos ("Anterior · ←");
     - **some no primeiro toque**, que não vira a página, e nunca aparece junto com o aviso "Retomado".
7. **Mais.**
   - **Ajustes:** tema, idioma, sons e um grupo "Leitura" com a **qualidade máxima** e a ponta no canto.
   - Cópia dos arquivos (interruptor) e espaço usado.
   - Exportar e importar o acervo.
   - **"Sobre": a ficha catalográfica do próprio Folheia.**
     - Cabeçalho com o monograma F.
     - Edição (versão e canal, estável ou "Folheia β").
     - Licença MIT, com o link do código.
     - Créditos (as fontes OFL e o PDF.js).
     - "Copiar diagnóstico" e "Nova edição disponível", quando houver.
     - **Sem carimbos de privacidade.**
8. **Estados.**
   - Exemplar ausente: "Traga este exemplar de volta".
   - "Este não é o mesmo exemplar", com "abrir só desta vez" e "adicionar como livro novo".
   - Aviso com "Desfazer" (remover do acervo).
   - Sem espaço: o livro entrou no acervo sem o arquivo, e um aviso explica o porquê.
9. **Splash:** o monograma F, no papel (claro) e na noite (escuro), em pé e deitado.

---

## Leva 2: organizar, Leituras, marcadores e o resto

1. **Estantes.**
   - Abas de estante roláveis, como **divisórias de fichário** (a aba atual "na frente", com o filete terracota).
   - A aba de sistema **"Por catalogar"**, no fim, só enquanto tiver livros.
   - **Não há aba "Tudo".** A busca procura no acervo inteiro.
   - Sem nenhuma estante criada, o acervo continua sem abas.
   - Criar, renomear, reordenar e apagar estantes, sempre com desfazer.
2. **As outras exibições:** **lista**, **fichário** (cada livro como uma ficha catalográfica curta) e **lombadas**.
3. **Lombadas.**
   - **A lombada é gerada pelo app:**
     - a cor vem da capa guardada, com uma faixa da borda esquerda da capa como textura;
     - o título fica na vertical, em Young Serif; o número do volume em mono, em cima; o formato discreto embaixo;
     - a espessura é proporcional às páginas, de 44 px (a área de toque) a ~72 px;
     - a altura segue a proporção da página (o mangá fica mais baixo que a HQ americana).
   - **Em leitura:** uma fita terracota saindo do topo.
   - **Exemplar ausente:** uma vaga tracejada na tábua.
   - **Mostre as duas direções do título:** de baixo para cima e de cima para baixo.
   - **Hover (desktop):** o livro sai um pouco da estante, sem girar.
   - **Toque ou clique:** o livro sai da estante e gira para mostrar a capa, sobre o véu. **Desenhe as duas propostas:**
     - **ao centro:** a capa grande no meio, com um cartão embaixo (título, página, "Continuar" e "Ficha");
     - **a ficha sai do bolso:** a capa de um lado e a ficha catalográfica deslizando de trás do livro, com tombo, página, "Continuar" e "Ficha completa".
   - Tocar na capa aberta também continua a leitura. Voltar e Esc devolvem o livro à estante.
4. **Seleção em lote** e o diálogo de estantes com caixas de três estados.
5. **Leituras:** uma linha por livro, agrupada por dia, na linguagem do cartão de empréstimo ("retirado em… devolvido na pág…"). Sem tempo de leitura.
6. **Marcadores.**
   - O botão de **marcador** (fita) na barra do leitor.
   - As fitas dos marcadores sobre o slider de páginas.
   - A aba **Marcadores** na gaveta do índice.
   - Os marcadores com miniatura na ficha do livro.
7. **Leitura sem registro.**
   - A faixa fina e fixa no topo de todas as telas.
   - O interruptor no menu do leitor e em Mais.
8. **Acervo + ficha em dois painéis:** só no desktop, porque só existe a partir de 1024 px.
9. **Catálogos, como estrutura do futuro.**
   - A lista de catálogos, com um servidor OPDS de exemplo, e "Adicionar catálogo".
   - Um catálogo aberto, em grade, com "Guardar no acervo" e o carimbo "No acervo" na obra já guardada.
   - Não detalhe busca, filtros nem páginas do servidor.
10. **Estados:** estante vazia e busca sem resultado.

---

## Fora deste pedido

- **A landing page** com os exemplos de domínio público e o "Experimente": item próprio da frente 2 (`roteiro.md`).
- **A passada de responsividade** em outros tamanhos: depois das features (`roteiro.md`).
- **Os sons** (asset, volume, padrão ligado ou desligado): sabatina do E13 (`plano-mvp.md` §8).
- **O OPDS e as fontes:** sabatina do F2, depois da D2 (`pauta-decisoes.md`).
