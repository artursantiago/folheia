# Folheia — Estudo de interface: a biblioteca pessoal

> 20/10/2026. **Status: sabatinado e decidido em 20/10/2026.** As decisões estão logo abaixo, e o texto da proposta (§3–§8) já foi atualizado com elas. **Nada começa agora:** o Artur vai revisar este estudo junto com os outros que estão em andamento e só então decidir os próximos passos.
>
> **Ponto de partida:** os candidatos I0–I16 do `estudo-mihon.md` §8.3. Este documento é o I0, o estudo que vem antes de qualquer item de interface. Trazer a organização do Mihon (acervo, estantes, ficha, leituras, marcadores) muda a tela inicial, a navegação e o que o app guarda no aparelho. É um redesign grande, então vai por etapas e com protótipo antes do código.

## Decisões da sabatina (20/10/2026)

Uma pergunta por vez, com recomendação. O número entre parênteses é a pergunta da sabatina.

**O arquivo e o acervo**

1. **Cópia do arquivo (Q1):** **copia sempre, por padrão**, para o armazenamento do app (OPFS no PWA).
   - Um interruptor em Mais desliga a cópia, e Mais mostra o espaço usado.
   - A ficha tem "remover só o arquivo", que mantém o livro no acervo.
   - O app pede `navigator.storage.persist()`.
   - Não há cota fixa. Quando o espaço acaba, o livro entra no acervo sem o arquivo e um aviso explica o porquê.
2. **Android nativo (Q2):** a tendência é uma **pasta da biblioteca**, como a fonte local do Mihon. Você escolhe uma pasta uma vez (Storage Access Framework), o app lê os livros dela sem copiar, e os livros abertos de outro lugar são copiados para ela. Isso se decide na fase do app.
   - Nas fundações, a interface de arquivos em `src/platform/` aceita as duas formas: cópia interna ou referência a um arquivo de fora.
   - O empacotamento do Android (Capacitor ou TWA) também fica para a fase do app.
3. **Exemplar ausente (Q3):** **o livro fica no acervo**, com a capa guardada e o carimbo "Exemplar ausente".
   - Tocar pede o arquivo ("Traga este exemplar de volta"). O app confere a impressão digital; se bater, copia de novo e retoma.
   - Se o arquivo for outro, o app avisa: "Este não é o mesmo exemplar". Você escolhe entre **abrir só desta vez** e **adicionar como livro novo**.
   - Num livro de URL, tocar tenta a URL antes de pedir o arquivo.
4. **O que entra no acervo (Q4):** o **arquivo local** (escolher ou soltar) **entra sozinho**, com a cópia. O `?file=` e os exemplos abrem direto no leitor, com um "Guardar no acervo" discreto no topo e na ficha.
   - A página continua lembrada mesmo sem guardar o livro, só com números, como hoje. Se você guardar depois, o livro entra já com o progresso.
5. **Livro de URL (Q15):** guardar no acervo guarda **a URL, a capa e os metadados**, e o livro continua sendo lido aos pedaços (range requests). Na ficha, "Guardar cópia no aparelho" baixa o arquivo, **só se você pedir**. Se a URL morrer sem cópia, o livro vira exemplar ausente. Vale também para os exemplos.
6. **Exemplar repetido (I13) se resolve sozinho:** trazer um arquivo com a mesma impressão digital abre o livro que já está no acervo, sem aviso.
7. **Remover do acervo** apaga a ficha, a cópia, os marcadores e as linhas em Leituras, com "Desfazer". "Remover só o arquivo" mantém todo o resto.
8. **Tombo:** para o Artur, é um detalhe da identidade, não uma informação importante. Ele aparece discreto (na ficha, no topo do leitor e no fichário) e **fica fora da capa**. Tecnicamente é só um contador, sem regra especial.

**Navegação e telas**

9. **Seções (Q7):** **quatro seções fixas**: Acervo, Leituras, Catálogos e Mais. Não há seção de marcadores. Cada seção entra na navegação quando a etapa dela fica pronta, e nunca aparece vazia.
   - O que é configurável, como no Mihon, são as **estantes**, a ordem, o filtro e a exibição, que podem valer por estante ou para o acervo todo.
   - **Sem nenhuma estante criada**, o Acervo é uma lista única, sem abas. Ao criar a primeira estante aparecem as abas, e os livros sem estante ficam na aba de sistema "Por catalogar", que só existe enquanto tiver livros.
10. **Nomes (Q8):** **Acervo, Leituras, Catálogos e Mais**, e "Por catalogar". Em inglês: Library, Reading, Catalogs, More e Uncataloged.
    - "Registro" saiu: numa biblioteca, o livro de registro (ou de tombo) é a lista de entradas do acervo, não o histórico de leitura.
    - A metáfora do empréstimo entra no conteúdo de Leituras (carimbos, "retirado em… devolvido na pág…"), não no rótulo da barra.
11. **Toque na capa (Q5):** **retoma a leitura direto**, com o mesmo gesto em todo aparelho.
    - **A ficha** abre por um botão pequeno na capa (com 44 px de área de toque), pelo toque longo no celular e pelo clique direito no desktop.
    - **Livro nunca aberto:** abre na página 1. **Exemplar ausente:** pede o arquivo. **Em modo de seleção:** o toque marca e desmarca.
12. **Cartão "Continuar?" (Q6):** **sai.** Todo caminho retoma direto na última página e mostra por alguns segundos um aviso: "Retomado da pág. 87 · **Do início**".
    - O `#p=` na URL tem prioridade.
    - O visual do cartão de empréstimo (os carimbos datados) passa a ser o resumo das leituras na ficha e a linguagem da seção Leituras.
    - De quebra, some a renderização inútil da página 1 por baixo do cartão.
13. **Exibição padrão (Q9):** **capas**, porque o caso principal são HQs no iPad.
    - O **fichário** é a exibição "assinatura": aparece no protótipo e no `#/estilo`, e é a melhor para PDFs de texto.
    - **Ordem padrão: última leitura**; os nunca abertos vão por data de entrada. A ordem e a exibição são lembradas por estante.
14. **Ficha (Q10):** **um conteúdo, três molduras.**
    - **Página** (`#/livro/<tombo>`) no celular e no iPad em pé.
    - **Painel à direita** do acervo no iPad deitado. Até a etapa dos dois painéis, ali também é página.
    - **Diálogo** dentro do leitor.
15. **Cortes de tela (Q11):** definidos **pela largura**, não pela orientação, porque o Split View e o Stage Manager do iPad deixam a janela com qualquer largura.
    - **Barra inferior** abaixo de 600px. **Trilho lateral** a partir de 600px; o celular deitado (~915 × 412) ganha trilho.
    - **Dois painéis** a partir de 1024px: cobre o iPad deitado de todos os tamanhos, o iPad Pro 13" em pé e o desktop.
    - Os cortes viram **tokens num lugar só**, em `src/theme/`. Hoje são quatro `600px` soltos em quatro arquivos CSS.

**Marcadores e Leituras**

16. **Marcadores (Q12):**
    - **Criar:** um botão de **fita** na barra e a tecla `B`. Nada de toque longo, nem no PDF nem no CBZ.
    - **Página dupla:** marca **a primeira página do spread na ordem de leitura**. A fita fica "ligada" se qualquer uma das duas estiver marcada.
    - **Nota:** é opcional e **editada depois**, na gaveta ou na ficha, sem pergunta na hora de marcar.
    - **Desmarcar:** tocar de novo remove o marcador, com "Desfazer".
    - **Limite:** nenhum. A miniatura sai da prévia que já existe.
17. **Tempo de leitura (Q13):** **não medir.** Os carimbos continuam guardando a data e as páginas de início e fim.
18. **Estatísticas (I15, Q14):** **saem do plano.** Vão para o backlog como "se houver vontade".
19. **Leitura sem registro (Q16):** é um **modo global**, como o modo anônimo do Mihon.
    - **Onde liga:** em Mais e no menu do leitor.
    - **Enquanto ligado:** nada é gravado. Nenhum livro entra no acervo, nenhum carimbo é feito e nenhuma página é lembrada.
    - **Aviso:** uma faixa fina e fixa no topo diz "Leitura sem registro".
    - **Livro que já está no acervo:** abre normalmente, mas o progresso não muda.
    - **Não há interruptor por livro.** Para tirar um livro de Leituras, apague as linhas dele.
20. **Série (I11, Q17):** é **um dado, sem agrupar.**
    - A ficha mostra a série e o número e deixa editá-los (no PDF, à mão).
    - Tocar na série filtra o acervo, e a busca encontra pela série.
    - A **ordem por título usa série + número**, então o v.2 vem depois do v.1.
    - A pilha de volumes na grade vai para o backlog.
21. **Busca:** simples, por título, autor, série e notas. A mini-linguagem do Mihon (`autor:`) vai para o backlog.

**Etapas e organização**

22. **Etapas (Q18):** o protótipo v2 e as fundações **andam em paralelo**. ~~Os exemplos ganham a seção Catálogos **já na etapa 2**.~~ **Mudado em 20/10/2026** (sabatina do pedido, abaixo): os exemplos saem do app, e Catálogos só entra com o primeiro catálogo de verdade. O tablet fica sozinho na etapa 5, e o OPDS vira um item próprio do backlog. A tabela está no §7.
    - **Começo:** só depois da revisão conjunta dos estudos. A etapa 2 só começa com o protótipo v2 aprovado.
23. **Organização `folheia-app` (Q19):** fazer a mudança **antes de qualquer código da biblioteca ir para a `main`**: logo depois da revisão conjunta e antes da etapa 1.
    - Hoje a origem antiga só guarda números (página e carimbos de até 200 livros, e as preferências), então perder isso custa quase nada, e a biblioteca já nasce na origem nova.
    - **Não agora:** só quando nenhuma outra sessão estiver trabalhando no repositório.
    - Na hora, conferir se o GitHub Pages redireciona o endereço antigo.
    - O exportar/importar continua necessário para o app Android, que é outra origem.
24. **Migração do `localStorage`:** os registros de hoje não têm título nem arquivo, então não viram livros do acervo. Eles ficam como memória de progresso: quando o mesmo arquivo voltar, o livro entra já com a página e os carimbos.

## Decisões da sabatina do pedido do protótipo v2 (20/10/2026)

Uma segunda sabatina, sobre o pedido do protótipo v2 (`prototipo-v2-pedido.md`), com esboços. O texto da proposta (§3–§8) já foi atualizado com ela.

25. **Estantes:** as abas são **divisórias de fichário**, com a aba atual "na frente" e o filete terracota. As prateleiras (uma fileira por estante, empilhadas) foram descartadas: um livro em duas estantes apareceria duas vezes, e cada fileira só mostraria capas.
26. **Sem aba "Tudo":** o "Por catalogar" já é o "Padrão" do Mihon. A busca procura no acervo inteiro, não só na aba aberta.
27. **Quatro exibições:** capas (o padrão), lista, fichário e **lombadas**.
    - **A lombada é gerada pelo app.** As APIs de livros (Open Library, Google Books) só servem a capa da frente, e imagens de lombada só existem em bases de visão computacional. A lombada usa a cor da capa, uma faixa da borda dela, o título na vertical e o volume. A espessura segue as páginas (de 44 px a ~72 px) e a altura segue a proporção da página.
    - **Lombada escaneada:** se um CBZ trouxer uma página com proporção de lombada, o app usa ela.
    - **Em leitura:** uma fita saindo do topo. **Exemplar ausente:** uma vaga tracejada na tábua.
    - **Hover (desktop):** o livro sai um pouco da estante, sem girar. **Toque ou clique:** o livro sai e gira para mostrar a capa, sobre o véu (sem desfoque). Duas propostas vão ao design: "ao centro" e "a ficha sai do bolso".
    - Nesta exibição, o toque não retoma direto, como na capa (Q5): ele tira o livro da estante, e tocar na capa aberta continua a leitura. A ficha não cabe como botão numa lombada de 44 px.
28. **Sons do acervo:** tirar o livro da estante tem som; o hover pode ter um som bem mais baixo, com limite. Vão para a trilha do som (E13), com um liga/desliga só.
29. **"Nova entrada":** a antiga ficha de empréstimo vira a "Nova entrada", com o próximo tombo. Ela aparece no acervo vazio e no "Adicionar".
    - O slogan é o título da página vazia. "Comece o seu acervo." vai dentro da ficha, e "O que vamos ler hoje?" vai no "Adicionar".
    - **"Ou cole um endereço"** mora dentro da ficha, e o endereço colado ali **entra no acervo** (guarda a URL, a capa e os dados, como na Q15). O `?file=` de um link de fora continua abrindo direto no leitor (Q4).
30. **Navegação: o fichário vertical.** A partir de 600 px, cada seção é uma divisória com a aba saindo da lateral, e a atual é a ficha da frente. No celular, as abas descem da borda de baixo. As bordas das fichas de trás ficam mínimas, para não poluir.
    - **Exploradas e descartadas:** trilho sóbrio de ícone e rótulo (genérico), gaveteiro de fichas, índice de dedo, pilha de livros e a lombada do app com etiquetas de classificação.
31. **Ajustes:** o menu do leitor fica com o que se muda no meio da leitura: páginas, capa sozinha, sentido, barra no modo imersivo, tema, sons e a leitura sem registro, com "Copiar diagnóstico" no rodapé. Mais fica com tema, idioma, sons, **qualidade máxima** e ponta no canto. Tema e Sons aparecem nos dois lugares, com uma preferência só.
32. **Dica das zonas de toque (L2):** aparece na primeira leitura no app e quando o sentido muda. Some no primeiro toque, que não vira a página, e nunca junto com o aviso "Retomado".
33. **Exemplos fora do app:** os exemplos de domínio público vão para uma **landing page**, fora do app. **Catálogos sai da etapa 2** e entra com o primeiro catálogo de verdade (OPDS, F2). A etapa 2 fica com Acervo e Mais.
34. **"Sobre":** é a **ficha catalográfica do próprio Folheia** (edição, licença, créditos, diagnóstico). Nenhum carimbo de privacidade aparece no app. O carimbo "Domínio público" vai para a landing, com os exemplos.
35. **Tamanhos:** **cada tela em três tamanhos**, um por faixa de corte: celular (390 × 844), tablet (iPad em pé, 820 × 1180) e desktop (1280 × 800). A responsividade em qualquer aparelho é uma passada própria no fim, depois das features.

## Decisões do desenho da leva 1 (20/10/2026)

O Artur aprovou a leva 1 do protótipo v2 ([canvas](https://claude.ai/artifact/67HDT4miiB5ftEqtDBJsTb), cópia em `docs/prototipo-v2/`). O desenho fez estas escolhas, além do pedido:

36. **Fichário vertical, na prática:**
    - **A partir de 600 px:** a aba atual é da cor da ficha da frente e avança 1 px sobre ela, com o filete terracota sob o rótulo. As de trás ficam num tom mais escuro e encostam em duas linhas finas, que são as bordas das fichas de trás. O cabeçalho da ficha da frente leva o filete terracota.
    - **No celular:** as abas têm largura fixa e ficam à esquerda. Na etapa 2 (só Acervo e Mais), são duas abas, sem esticar.
    - **Rótulos:** em mono, caixa alta, sem ícones.
37. **Capa no acervo:**
    - **Progresso:** a fita é uma faixa fina na borda de baixo da capa, e "pág. 45/200" vai na legenda, antes do formato.
    - **"novo":** uma etiqueta terracota saindo do topo da capa.
    - **"Lido":** carimbo inclinado.
    - **Ficha:** o botão é um quadradinho no canto de cima, com 44 px de área de toque.
    - **Legenda:** título em até duas linhas e, em mono, a página e o formato.
38. **Barra do acervo:** busca e "Adicionar" no cabeçalho. Ordem, filtrar e as quatro exibições numa linha logo abaixo. No celular, a busca vira um botão de ícone. O título "Acervo" traz um contador discreto ("12 obras").
39. **Estado arrastando:** só no tablet e no desktop. A ficha da frente ganha um picote terracota, e a "Nova entrada" se inclina com "Solte para guardar no acervo", o nome e o tamanho do arquivo.
40. **Diálogos e gavetas:** o "Adicionar", a ficha dentro do leitor, os diálogos de exemplar ausente e os ajustes de leitura são **diálogos (ou popovers) a partir de 600 px** e **gavetas de baixo no celular**.
41. **Ficha do livro:**
    - **Leituras:** um cartão de empréstimo com "Retirado em" e "Devolvido na", e as datas carimbadas.
    - **Ações:** editar os dados, usar uma página como capa, exportar a ficha, remover só o arquivo e remover do acervo, que fica na cor de destaque.
    - **Livro fora do acervo:** no lugar do tombo aparece "Fora do acervo".
42. **Leitor:**
    - **Índice:** um botão só abre a gaveta, com as abas Sumário e Páginas.
    - **"Retomado da pág. 87 · Do início":** fica logo acima da barra.
    - **Barra no celular:** em duas linhas, com o slider em cima e os botões embaixo. Os ajustes ficam na barra.
    - **"⋯" no celular:** primeira e última página, zoom (com "Ajustar à tela"), compartilhar e modo imersivo.
43. **Dica das zonas de toque:**
    - **Onde:** o véu cobre a tela toda, e as zonas cobrem só o palco, sem a barra.
    - **"Próxima":** vai na cor de destaque, e "Anterior" em tinta.
    - **No desktop:** o meio diz **"Clique duplo aproxima"**.
44. **Mais:** grupos Ajustes (tema, idioma, sons), Leitura (qualidade máxima, ponta no canto) e Arquivos (cópia de cada livro, espaço usado, exportar e importar).
    - **O "Sobre":** fica ao lado no desktop e embaixo no tablet. No celular é uma página própria.
    - **"Nova edição do Folheia disponível":** aparece como aviso dentro do "Sobre".
45. **Estados:**
    - **"Este não é o mesmo exemplar":** o botão principal é "Adicionar como livro novo".
    - **Sem espaço:** o aviso diz "Sem espaço no aparelho: … entrou no acervo sem o arquivo." e tem a ação "Ver espaço", que leva a Mais.
    - **Remover:** o aviso diz "… saiu do acervo · Desfazer".

## Decisões do desenho da leva 2 (20/10/2026)

O Artur aprovou a leva 2 no mesmo canvas da leva 1 (cópia em `docs/prototipo-v2/`). As duas primeiras foram perguntas a ele; as outras são escolhas do desenho.

46. **O livro sai da estante: "a ficha sai do bolso"** (pergunta ao Artur). O toque tira o livro, que gira mostrando a lombada e a capa. A ficha catalográfica desliza de trás dele, com tombo, título, autor, página, "Continuar" e "Ficha completa". No celular, a ficha desce por baixo da capa. A proposta "ao centro" ficou descartada.
47. **Título da lombada de cima para baixo** (pergunta ao Artur), como nos livros em inglês e, até onde sabemos, na norma brasileira de lombada. "De baixo para cima" ficou descartado.
48. **Abas de estante:**
    - **Onde:** no topo do acervo, abaixo do cabeçalho.
    - **Rótulo:** texto normal com a contagem em mono.
    - **Aba atual:** fica "na frente", com o filete terracota **em cima**.
    - **"Por catalogar":** tem a borda picotada.
    - **No fim da fileira:** o "+" cria uma estante, e um lápis abre "Organizar estantes".
    - **Diferença da navegação:** a navegação é lateral (ou embaixo, no celular), em mono caixa alta, com o filete sob o rótulo.
49. **Lombadas:**
    - **Textura:** vem da capa. São a tira de papel do mangá e os filetes da HQ.
    - **Estados:** a fita terracota sai do topo de quem está em leitura. O exemplar ausente vira uma vaga tracejada com o nome.
    - **Hover:** puxa o livro uns 12 px.
    - **A tábua:** é uma faixa lisa, sem textura de madeira.
    - **Ordem:** a prancha usa a ordem por título, que alinha os volumes de uma série.
50. **Lista e fichário:**
    - **Lista:** capa pequena, título e autor, uma coluna de leitura (fita, "novo", "Lido" ou "Exemplar ausente"), a última leitura (só no desktop), o formato e o botão da ficha.
    - **Fichário:** fichas curtas, com tombo, formato, título, "autor invertido · ano" e o estado, sobre pautas e com o furo.
51. **Seleção em lote:**
    - **Barra:** em tinta no topo, com "3 selecionados", "Estantes", "Marcar como lido" e "Remover". No celular as ações descem para baixo.
    - **Diálogo "Estantes":** caixas de três estados, com a contagem ("1 de 3") quando a estante tem só parte dos livros.
    - **"Organizar estantes":** arrastar pela alça, renomear no lugar e apagar com "Desfazer".
52. **Leituras:** uma linha por livro e por dia, agrupadas por data. O texto é "retirado às 20:40 · devolvido na pág. 45", com o carimbo "Lido" no fim. O × apaga a linha, e "Limpar tudo" fica no cabeçalho.
53. **Marcadores em verde** (a cor de encadernação da paleta), para não se confundirem com a fita terracota da página atual.
    - **No leitor:** o botão de fita fica na barra, e as fitas verdes ficam sobre o slider.
    - **Na gaveta do índice:** a aba Marcadores, com miniatura, página, data e nota (ou "Adicionar nota").
    - **Na ficha:** o cartão "Marcadores".
54. **Leitura sem registro:** uma faixa de 24 px na cor de destaque, no topo de todas as telas, abaixo do entalhe no iPhone. O interruptor fica nos ajustes do leitor e no grupo Ajustes de Mais, com "Nada é gravado enquanto estiver ligada".
55. **Dois painéis (desktop):** o acervo em 4 colunas e a ficha num painel de 420 px à direita, separado por um picote, com "Continuar" e "Ficha completa".
56. **Catálogos:** a lista traz uma frase curta do que é um catálogo e "Adicionar catálogo"; o exemplo é o Project Gutenberg (OPDS). O catálogo aberto é uma grade com "Guardar no acervo" e o carimbo "No acervo".
57. **Estados:**
    - **Estante vazia:** uma tábua sem livros e o botão "Selecionar livros".
    - **Busca:** enquanto ela está aberta, as abas de estante dão lugar a "Busca em todo o acervo". Sem resultado, aparece "Nada no acervo com “…”." e "Limpar a busca".

## 1. Onde estamos

**Protótipo aprovado** (`docs/prototipo/`, 15 telas). Ele foi desenhado para "abrir um arquivo e ler":

- **Início:** é uma ficha de empréstimo ("Traga um livro para a mesa") com um carrossel de exemplos "Do acervo".
- **Leitor:** cabeçalho, barra flutuante, gaveta de índice, ajustes, ficha catalográfica e cartão de empréstimo ("Continuar da página 87?").
- **Estados:** carregando, erros e senha.
- **Celular × tablet:** existem variantes de celular para o início, o leitor e o zoom. **O tablet não tem layout próprio.**

**App de hoje:**

- **Telas e rotas:**
  - A tela inicial é o protótipo "Main".
  - **Não há Recentes, nem capas geradas, nem um jeito de reabrir um arquivo local**: é preciso escolher o arquivo de novo.
  - O leitor **não é uma rota**: o app escolhe a tela pelo estado da sessão (`src/ui/session.ts`).
  - **O botão Voltar** do navegador e do Android não é tratado.
  - Só existe um corte de tela, em `≤ 600px`, repetido à mão em quatro arquivos CSS.
- **O que fica guardado:**
  - Tudo está em `localStorage` (`src/platform/storage.ts`).
  - Por livro, só **números** (`src/storage/books.ts`): última página, direção e até 6 carimbos de leitura. São no máximo 200 livros.
  - Por decisão escrita no código, **nem o nome nem o título são guardados**.
- **Identidade do livro:**
  - PDF: pela impressão digital do PDF.js.
  - CBZ local: por `nome:tamanho:data`, que não é um hash do conteúdo.
- **Cartão "Continuar?":** o leitor abre na página 1 e, se a última página lida for maior que 1, mostra o cartão por cima (`ReaderScreen.tsx`).
- **Componentes:** existe a base da assinatura (`Card`, `Stamp`, `Accession`, `Dialog`, `Drawer`, `Popover`, `ReaderBar`, `PageSlider`…). **Faltam os de biblioteca:**
  - capa genérica (hoje `BookCover` só serve aos exemplos e vive fora do design system);
  - grade e lista;
  - trilho e abas de navegação;
  - busca;
  - caixa de três estados;
  - barra de seleção;
  - aviso com "desfazer";
  - estado vazio;
  - selos.

**Diferenças entre o protótipo e o app que este redesign pode resolver de uma vez:**

- No leitor do celular falta o menu "⋯": os itens escondidos ficam inacessíveis.
- O tombo não aparece no topo do leitor nem na ficha.
- A ficha não mostra série, número e volume do CBZ.
- O modo imersivo não está no protótipo.

## 2. As metáforas que já existem

A identidade (`identidade-visual.md`) já fala a língua de biblioteca. O redesign **estende**, não inventa:

| Já existe                                                      | Vira                                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------ |
| Ficha de empréstimo ("Traga um livro para a mesa")             | O jeito de **adicionar** um livro, e o estado vazio do acervo      |
| Tombo `Nº 0001` (o soltar arquivo já mostra "o próximo tombo") | O **número** de cada livro no acervo, discreto (fora da capa)      |
| Cartão de empréstimo com carimbos datados                      | A linguagem da seção **Leituras** e o resumo das leituras na ficha |
| Ficha catalográfica                                            | A **página do livro**                                              |
| "Devolver à estante", "Lugar vago na estante"                  | As **estantes**                                                    |
| Gaveta de fichas (índice)                                      | O modo de exibição **fichário**                                    |
| Carimbos ("Não catalogado", "Avariado", "Pág. 87")             | Selos na capa, "Exemplar ausente" e a estante "Por catalogar"      |
| Fita do slider de páginas                                      | Os **marcadores de página**                                        |
| "Catalogando" (carregando)                                     | Importar um livro para o acervo                                    |

**Conflito de nome, resolvido:** hoje "Do acervo" são os exemplos de domínio público. Como "Acervo" passa a ser "os meus livros", os exemplos saem do app e vão para uma landing page (decisão 33).

## 3. Organização

### 3.1 Seções

Quatro seções fixas, sem ajuste para esconder nenhuma. Cada uma entra na navegação quando a etapa dela fica pronta.

| Seção         | O que é                                                                                                                                                                                    | Equivalente no Mihon |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| **Acervo**    | Os seus livros, com estantes opcionais. É a tela inicial.                                                                                                                                  | Biblioteca           |
| **Leituras**  | O histórico de leitura: "retirado em… devolvido na pág…", agrupado por dia. Tocar retoma a leitura.                                                                                        | Histórico            |
| **Catálogos** | De onde vêm livros que você não tem: os servidores **OPDS** e as fontes (F1–F8). Entra com o primeiro catálogo de verdade; os exemplos de domínio público vão para a landing (decisão 33). | Navegar              |
| **Mais**      | Ajustes, cópia dos arquivos e espaço usado, leitura sem registro, exportar/importar o acervo e "Sobre", que é a ficha catalográfica do próprio Folheia, sem carimbos (decisão 34).         | Mais                 |

O **leitor** não é uma seção: ele abre por cima de tudo.

Os **marcadores** não têm seção. Eles aparecem na ficha do livro, na gaveta do leitor e num filtro do acervo ("com marcadores"). Ganham uma seção própria só se a lista central fizer falta.

### 3.2 Navegação por tamanho de tela

- **Abaixo de 600px:** barra inferior com as seções, sempre com rótulos visíveis.
- **A partir de 600px:** **trilho lateral** à esquerda, também com rótulos. Nada de "rótulo só ao segurar", que é um problema de acessibilidade. O celular deitado também usa o trilho, porque ali o que falta é altura.
- **A partir de 1024px:** **dois painéis** (acervo + ficha). Cobre o iPad deitado (todos os tamanhos), o iPad Pro 13" em pé e o desktop. O iPad Air tem 820px em pé e 1180px deitado.
- **O critério é a largura**, não a orientação, por causa do Split View e do Stage Manager. Os cortes ficam em tokens em `src/theme/`.
- **Na linguagem Ex-libris (decidido em 20/10/2026, decisão 30):** a navegação é um **fichário vertical**. Cada seção é uma divisória com a aba de papel saindo da lateral, em alturas escalonadas, e a seção atual é a ficha da frente. No celular, as abas descem da borda de baixo. As bordas das fichas de trás ficam mínimas.
- **Botão Voltar** (navegador e Android): fecha o diálogo ou painel aberto, depois sai do leitor, depois volta para o Acervo. Isso exige navegação com histórico (§5).
- **Leitura sem registro ligada:** uma faixa fina e fixa no topo de todas as telas avisa.

### 3.3 Acervo

- **Vazio:** a ficha de hoje vira a **"Nova entrada"**, com o próximo tombo (decisão 29). A identidade aprovada continua sendo a primeira coisa que se vê.
- **Como um livro entra:**
  - **Arquivo local** (escolher ou soltar em qualquer lugar): entra sozinho, com a cópia do arquivo. Soltar mostra o próximo tombo.
  - **Endereço colado na "Nova entrada":** entra no acervo, guardando a URL.
  - **`?file=` de um link de fora:** abre direto o leitor, com "Guardar no acervo" no topo e na ficha.
  - **Mesmo arquivo de novo** (mesma impressão digital): abre o livro que já está lá.
  - **"Adicionar"** é uma ação fixa no topo e abre a mesma ficha "Nova entrada".
- **Estantes:**
  - **sem nenhuma estante criada, não há abas**: o acervo é uma lista única;
  - com estantes, abas roláveis no topo, como **divisórias de fichário**;
  - um livro pode estar em várias;
  - a estante de sistema **"Por catalogar"** guarda os livros sem estante e só aparece se tiver livros;
  - **não há aba "Tudo"**: a busca procura no acervo inteiro;
  - criar, renomear, reordenar e apagar, sempre com **desfazer**.
- **Exibições:**
  - **capas** (grade): **o padrão**;
  - **lista**;
  - **fichário**: cada livro como uma ficha catalográfica curta. É a exibição "assinatura", a melhor para PDFs de texto.
  - **lombadas**: os livros de lado, sobre tábuas, com a lombada gerada pelo app (decisão 27). Brilha numa estante de série.
  - Colunas separadas para retrato e paisagem.
  - A exibição e a ordem são lembradas por estante, ou valem para o acervo todo.
- **Na capa:**
  - **selo de progresso** ("pág. 45/200" ou uma fita);
  - "novo";
  - carimbo "lido";
  - carimbo "Exemplar ausente";
  - formato discreto;
  - **o tombo não aparece na capa.**
  - **Tocar na capa retoma a leitura**, sem passar pela ficha. A ficha abre por um botão pequeno na capa, pelo toque longo (celular) ou pelo clique direito (desktop).
- **Ordenar:** **última leitura (padrão**, com os nunca abertos por data de entrada), título (série + número quando houver), autor, data de entrada e progresso.
- **Filtrar:** em leitura, não lidos, lidos, com marcadores, PDF ou CBZ.
- **Buscar:** busca simples por título, autor, série e notas.
- **Seleção:** toque longo ou um botão "Selecionar", com caixas visíveis no iPad. As ações são mover de estante (caixas de três estados), marcar como lido e remover (com desfazer).

### 3.4 Ficha do livro

- **Formato:** continua sendo a ficha catalográfica do protótipo, que agora ganha conteúdo.
- **Conteúdo:**
  - tombo, discreto;
  - autor, título, ano, páginas, formato e tamanho;
  - série e número (do `ComicInfo.xml` no CBZ, ou digitados);
  - idioma;
  - estantes;
  - notas;
  - progresso;
  - **marcadores**, com miniatura;
  - o resumo das leituras, no visual do cartão de empréstimo (carimbos datados).
- **Tocar no autor ou na série filtra o acervo.**
- **Onde aparece** (um conteúdo, três molduras):
  - no celular e no iPad em pé, uma **página** (`#/livro/<tombo>`);
  - a partir de 1024px, **painel à direita** do acervo (até a etapa 5, página);
  - dentro do leitor, continua um **diálogo**.
- **Ações:**
  - ler e continuar;
  - "Guardar no acervo" (livro de URL ou exemplo ainda não guardado);
  - "Guardar cópia no aparelho" (livro de URL);
  - "Remover só o arquivo" (livro com cópia);
  - escolher uma página como capa;
  - editar título, autor, série e número (os PDFs costumam vir com metadados ruins);
  - remover do acervo, com desfazer;
  - exportar a ficha.

### 3.5 Leituras

- **Base:** os carimbos que o app já grava, os `LoanStamp`, numa lista por dia, com **uma linha por livro**. Sem tempo de leitura.
- **Comportamento:** tocar retoma a leitura. Dá para apagar uma linha ou limpar tudo.
- **Leitura sem registro:** é um modo global, que liga em Mais ou no menu do leitor. Enquanto ele está ligado, nada é gravado (§3.2).
- **Ao abrir um livro:** não existe mais o cartão "Continuar?". Todo caminho retoma direto na última página e mostra o aviso "Retomado da pág. 87 · Do início" por alguns segundos.

### 3.6 Marcadores de página

O Mihon não tem marcador de página; o Folheia vai ter.

- **Criar:**
  - um botão de **fita** na barra do leitor;
  - a tecla `B`;
  - sem toque longo, nem no PDF (conflita com a seleção de texto) nem no CBZ (para o gesto ser o mesmo).
  - **Na página dupla**, marca a primeira página do spread na ordem de leitura. A fita fica "ligada" se qualquer uma das duas estiver marcada.
  - Tocar de novo desmarca, com "Desfazer".
- **Onde aparecem:**
  - como fitas sobre o `PageSlider`;
  - numa aba "Marcadores" na gaveta do índice;
  - na ficha do livro.
- **O que guardam:** página, data, uma nota curta opcional (editada depois, na gaveta ou na ficha) e a miniatura, que sai da prévia que já é renderizada. Sem limite de quantidade.

### 3.7 Catálogos

- **Não entra na etapa 2** (decisão 33). Os exemplos de domínio público não pertencem ao acervo de ninguém: eles vão para uma landing page, fora do app, para quem quer experimentar o Folheia.
- **Entra com o primeiro catálogo de verdade:**
  - catálogos OPDS que o usuário adiciona (F2), como uma lista de catálogos desde o começo;
  - as fontes (F5), com a mesma interface: lista, busca e detalhe;
  - um livro de catálogo aberto por URL pode ser guardado no acervo ("Guardar no acervo" guarda a URL, §5).

## 4. O que muda no leitor

Mudanças pequenas. A virada e o desempenho não são afetados.

- **Topo:** o tombo aparece discreto ao lado do título, como no protótipo. O "Devolver à estante" volta ao Acervo. Num livro que não está no acervo, aparece "Guardar no acervo".
- **Abertura:** retoma direto na última página, com o aviso "Retomado da pág. 87 · Do início". O cartão "Continuar?" sai.
- **Barra:** ganha o botão de **marcador** (fita).
- **Celular:** o **"⋯"** do protótipo passa a guardar o que hoje some (primeira/última, zoom, compartilhar).
- **Gaveta:** ganha a aba Marcadores. As miniaturas **em pares de spread**, previstas no protótipo, também entram.
- **Menu:** liga e desliga a leitura sem registro.
- **Ajustes por livro** (L5): a ficha mostra quando um ajuste do livro está sobrepondo o global.

## 5. O que muda por baixo (fundações)

A biblioteca não cabe no que existe hoje. São pré-requisitos:

1. **Armazenamento assíncrono:**
   - **O que:** uma interface nova em `src/platform/`, com IndexedDB na web. No app Android, a forma (SQLite, Filesystem ou a própria WebView) se decide na fase do app. O `localStorage` não guarda capas nem arquivos, e é síncrono.
   - **Migração:** os registros de `folheia:books` não têm título nem arquivo. Eles viram memória de progresso: quando o mesmo arquivo voltar, o livro entra já com a página e os carimbos.
2. **O que guardar de cada livro:**
   - **Sempre:** metadados e uma capa pequena (WebP, ou JPEG no Safari, com ~300px).
   - **O arquivo:**
     - **PDF/CBZ local:** **cópia por padrão** no OPFS, que um interruptor em Mais desliga, sem cota fixa. O app pede `navigator.storage.persist()`, e Mais mostra o espaço usado. Sem a cópia, o livro fica no acervo como **"exemplar ausente"** e pede o arquivo de novo, reconhecido pela impressão digital.
     - **URL:** guarda só a URL, lida aos pedaços. A cópia é feita só se você pedir.
     - **App Android:** a tendência é a pasta da biblioteca (decisão 2). A interface de arquivos aceita uma cópia interna ou uma referência externa.
3. **Identidade do livro:**
   - **PDF:** continua pela impressão digital.
   - **CBZ:** passa a usar um hash do **diretório central do ZIP**, que é barato e não depende do nome nem da data. Isso evita "exemplar repetido" falso.
   - **Tombo:** um contador sequencial simples.
4. **Privacidade:**
   - **Muda uma regra escrita no código:** passar a guardar título, autor e capa contradiz o comentário "only numbers" de `books.ts`. Nada sai do aparelho, então a regra 2 do `CLAUDE.md` continua valendo.
   - **"Leitura sem registro"** é a válvula para quem não quer deixar rastro.
5. **Rotas e histórico:**
   - **Esquema por hash, por exemplo:**
     - `#/acervo`, `#/acervo/<estante>`;
     - `#/livro/<tombo>` (a ficha);
     - `#/ler/<tombo>?p=42`;
     - `#/leituras`, `#/catalogos`, `#/mais`.
   - **Hash com `pushState`:** permite usar o Voltar.
   - **Compatibilidade:** o `?file=` e o `#p=` atuais continuam funcionando, redirecionados.
   - **`#/estilo` e `#/lab`** ficam como estão.
6. **Plataforma:**
   - "abrir arquivo", "guardar arquivo" e "buscar por URL" viram interfaces em `src/platform/` (hoje o input de arquivo mora dentro da HomeScreen).
7. **Cortes de tela:** 600px e 1024px viram tokens em `src/theme/`, e os quatro `600px` soltos passam a usá-los.
8. **Capas e desempenho:**
   - **Uma vez só:** a capa é gerada no **primeiro uso**, a partir da prévia da 1ª página que o leitor já renderiza, e guardada. A grade nunca abre arquivos.
   - **Sem capa:** usa a capa tipográfica, generalizada a partir do `BookCover`.
9. **Exportar e importar o acervo** em JSON (I16): estantes, progresso, marcadores e notas, sem os arquivos. É necessário para o app Android, que é outra origem. A mudança para a organização `folheia-app` acontece **antes** das fundações irem para a `main` (decisão 23), então não depende disso.

## 6. Componentes novos

Cada um entra em `src/ui/components/` e no `#/estilo`, nos dois temas:

| Componente                          | Para que serve                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| `BookCover`                         | Capa genérica: a imagem guardada ou a tipográfica, com selos                    |
| `CoverGrid`, `BookList`, `CardFile` | Três das exibições do acervo                                                    |
| `SpineShelf` / `BookSpine`          | A exibição de lombadas: a lombada gerada e o livro que sai da estante           |
| `NavRail` / `TabBar`                | O fichário vertical (≥ 600px) e as abas embaixo (celular)                       |
| `ShelfTabs`                         | As abas de estante, como divisórias de fichário                                 |
| `Sheet`                             | A gaveta de baixo do celular ("Adicionar")                                      |
| `TapZonesHint`                      | A dica das zonas de toque do leitor                                             |
| `SearchField`                       | A busca                                                                         |
| `Checkbox` (três estados)           | A seleção e as estantes em lote                                                 |
| `SelectionBar`                      | Contador, "selecionar tudo" e ações                                             |
| `Snackbar`                          | Um aviso com ação: "Desfazer" e "Do início" (pode ser uma extensão do `Notice`) |
| `Banner`                            | A faixa fixa da leitura sem registro                                            |
| `EmptyState`                        | Uma ficha em branco com a mensagem e a ação, no tom da biblioteca               |
| `Badge`                             | Um selo pequeno na capa (progresso, novo, lido, ausente)                        |
| `ListItem`                          | Uma linha de lista (leituras, catálogos, estantes)                              |

## 7. Caminho em etapas

Decidido em 20/10/2026. **Nada começa antes da revisão conjunta dos estudos.** Cada etapa passa por sabatina antes de ser implementada.

| Etapa                        | O que entra                                                                                                                                                                                                                                                                                                                                                                      | Depende de                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **0. Protótipo v2**          | Revisar o protótipo com as telas novas (§8). Nenhum código.                                                                                                                                                                                                                                                                                                                      | —                            |
| **1. Fundações**             | Armazenamento assíncrono + migração, cópia dos arquivos, identidade e tombo, rotas com histórico (Voltar), interfaces de abrir/guardar/buscar em `platform/`, tokens de corte, exportar/importar JSON.                                                                                                                                                                           | a mudança para `folheia-app` |
| **2. Acervo mínimo**         | Acervo como tela inicial (vazio = a "Nova entrada"), Mais na navegação (Catálogos só com o OPDS; os exemplos vão para a landing), capas geradas, tocar para retomar com "Do início" (sai o cartão "Continuar?"), selos, exemplar ausente, "Guardar no acervo" para URL, ficha como página, remover com desfazer, o "⋯" do leitor no celular. **Substitui o item C6 (Recentes).** | 0 aprovado, 1                |
| **3. Organização**           | Estantes, seleção em lote, quatro exibições, ordenar, filtrar, buscar, série, notas e capa escolhida.                                                                                                                                                                                                                                                                            | 2                            |
| **4. Leituras e marcadores** | A seção Leituras, os marcadores de página (barra, slider, gaveta, ficha) e a leitura sem registro.                                                                                                                                                                                                                                                                               | 2                            |
| **5. Tablet**                | Dois painéis a partir de 1024px (acervo + ficha).                                                                                                                                                                                                                                                                                                                                | 3                            |

As etapas 0 e 1 andam em paralelo, porque as fundações não dependem do visual. As etapas 3 e 4 são independentes e também podem andar em paralelo. O OPDS e as fontes ficam como itens próprios do backlog (F1–F8).

## 8. Protótipo v2: telas a desenhar

**O pedido completo e aprovado (20/10/2026) está em `prototipo-v2-pedido.md`**, em duas levas. A lista abaixo é o resumo.

- **Leva 1 (destrava a etapa 2). Desenhada e aprovada em 20/10/2026** ([canvas](https://claude.ai/artifact/67HDT4miiB5ftEqtDBJsTb), decisões 36–45):
  - a navegação em fichário, com as quatro seções e só com Acervo e Mais;
  - o Acervo vazio com a "Nova entrada", e o "Adicionar";
  - o Acervo com capas, sem estantes;
  - a ficha como página;
  - a moldura nova do leitor, com o menu de ajustes novo e a dica das zonas de toque;
  - Mais, com o "Sobre" como ficha do Folheia;
  - os estados da etapa 2;
  - o splash.
- **Leva 2. Desenhada e aprovada em 20/10/2026** (decisões 46–57):
  - as estantes em divisórias;
  - lista, fichário e lombadas, com as duas propostas de animação;
  - a seleção em lote;
  - Leituras;
  - os marcadores;
  - a leitura sem registro;
  - os dois painéis;
  - Catálogos como estrutura do futuro;
  - estante vazia e busca sem resultado.
- **Tamanhos:** cada tela em três tamanhos (celular, tablet e desktop), nos dois temas.

O protótipo v1 vive como artifact privado, com cópia em `docs/prototipo/`. A v2 segue o mesmo formato, com cópia em `docs/prototipo-v2/`: um arquivo por tela e tamanho, com claro e escuro lado a lado.

## 9. Perguntas

**Decididas na sabatina de 20/10/2026** (ver "Decisões" no topo):

1. Nomes: Acervo, **Leituras**, Catálogos, Mais e "Por catalogar".
2. Navegação: 4 seções fixas, sem seção de marcadores.
3. Arquivo: copiar sempre por padrão, sem cota fixa.
4. Exemplar ausente: fica no acervo.
5. Toque na capa: retoma direto.
6. Cartão "Continuar?": sai; fica o aviso "Do início".
7. Exibição padrão: capas, por última leitura.
8. Ficha: página, painel e diálogo, com o mesmo conteúdo.
9. Marcadores: fita + `B`, nota editada depois.
10. Tempo de leitura: não medir. Estatísticas fora do plano.
11. Cortes: trilho ≥ 600px, dois painéis ≥ 1024px.
12. Etapas: 0 ∥ 1, Catálogos na etapa 2, tablet na 5.
13. Organização `folheia-app`: antes das fundações irem para a `main`, sem sessões em paralelo.

**Ainda em aberto:**

- **Quando começar:** depende da revisão conjunta dos estudos.
- **App Android:** empacotamento (Capacitor ou TWA), armazenamento dos dados e a pasta da biblioteca. Decide-se na fase do app.
- **Detalhes de cada etapa** (por exemplo, o formato do JSON de exportação e o desenho do selo de progresso), na sabatina da própria etapa.
