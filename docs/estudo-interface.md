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

22. **Etapas (Q18):** o protótipo v2 e as fundações **andam em paralelo**. Os exemplos ganham a seção Catálogos **já na etapa 2**. O tablet fica sozinho na etapa 5, e o OPDS vira um item próprio do backlog. A tabela está no §7.
    - **Começo:** só depois da revisão conjunta dos estudos. A etapa 2 só começa com o protótipo v2 aprovado.
23. **Organização `folheia-app` (Q19):** fazer a mudança **antes de qualquer código da biblioteca ir para a `main`**: logo depois da revisão conjunta e antes da etapa 1.
    - Hoje a origem antiga só guarda números (página e carimbos de até 200 livros, e as preferências), então perder isso custa quase nada, e a biblioteca já nasce na origem nova.
    - **Não agora:** só quando nenhuma outra sessão estiver trabalhando no repositório.
    - Na hora, conferir se o GitHub Pages redireciona o endereço antigo.
    - O exportar/importar continua necessário para o app Android, que é outra origem.
24. **Migração do `localStorage`:** os registros de hoje não têm título nem arquivo, então não viram livros do acervo. Eles ficam como memória de progresso: quando o mesmo arquivo voltar, o livro entra já com a página e os carimbos.

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

**Conflito de nome, resolvido:** hoje "Do acervo" são os exemplos de domínio público. Como "Acervo" passa a ser "os meus livros", os exemplos vão para a seção **Catálogos**.

## 3. Organização

### 3.1 Seções

Quatro seções fixas, sem ajuste para esconder nenhuma. Cada uma entra na navegação quando a etapa dela fica pronta.

| Seção         | O que é                                                                                                                                                                           | Equivalente no Mihon |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **Acervo**    | Os seus livros, com estantes opcionais. É a tela inicial.                                                                                                                         | Biblioteca           |
| **Leituras**  | O histórico de leitura: "retirado em… devolvido na pág…", agrupado por dia. Tocar retoma a leitura.                                                                               | Histórico            |
| **Catálogos** | De onde vêm livros que você não tem: os **exemplos de domínio público** (já na etapa 2) e, no futuro, os servidores **OPDS** e as fontes (F1–F8).                                 | Navegar              |
| **Mais**      | Ajustes, cópia dos arquivos e espaço usado, leitura sem registro, exportar/importar o acervo e "Sobre", onde passam a morar os carimbos de privacidade e de domínio público (C9). | Mais                 |

O **leitor** não é uma seção: ele abre por cima de tudo.

Os **marcadores** não têm seção. Eles aparecem na ficha do livro, na gaveta do leitor e num filtro do acervo ("com marcadores"). Ganham uma seção própria só se a lista central fizer falta.

### 3.2 Navegação por tamanho de tela

- **Abaixo de 600px:** barra inferior com as seções, sempre com rótulos visíveis.
- **A partir de 600px:** **trilho lateral** à esquerda, também com rótulos. Nada de "rótulo só ao segurar", que é um problema de acessibilidade. O celular deitado também usa o trilho, porque ali o que falta é altura.
- **A partir de 1024px:** **dois painéis** (acervo + ficha). Cobre o iPad deitado (todos os tamanhos), o iPad Pro 13" em pé e o desktop. O iPad Air tem 820px em pé e 1180px deitado.
- **O critério é a largura**, não a orientação, por causa do Split View e do Stage Manager. Os cortes ficam em tokens em `src/theme/`.
- **Na linguagem Ex-libris:** o trilho pode ser um **fichário vertical** de abas de papel, com a aba atual em destaque.
- **Botão Voltar** (navegador e Android): fecha o diálogo ou painel aberto, depois sai do leitor, depois volta para o Acervo. Isso exige navegação com histórico (§5).
- **Leitura sem registro ligada:** uma faixa fina e fixa no topo de todas as telas avisa.

### 3.3 Acervo

- **Vazio:** a ficha de empréstimo de hoje ("Traga um livro para a mesa") é o estado vazio. A identidade aprovada continua sendo a primeira coisa que se vê.
- **Como um livro entra:**
  - **Arquivo local** (escolher ou soltar em qualquer lugar): entra sozinho, com a cópia do arquivo. Soltar mostra o próximo tombo.
  - **`?file=` e exemplos:** abrem direto o leitor, com "Guardar no acervo" no topo e na ficha.
  - **Mesmo arquivo de novo** (mesma impressão digital): abre o livro que já está lá.
  - **"Adicionar"** é uma ação fixa no topo.
- **Estantes:**
  - **sem nenhuma estante criada, não há abas**: o acervo é uma lista única;
  - com estantes, abas roláveis no topo;
  - um livro pode estar em várias;
  - a estante de sistema **"Por catalogar"** guarda os livros sem estante e só aparece se tiver livros;
  - criar, renomear, reordenar e apagar, sempre com **desfazer**.
- **Exibições:**
  - **capas** (grade): **o padrão**;
  - **lista**;
  - **fichário**: cada livro como uma ficha catalográfica curta. É a exibição "assinatura", a melhor para PDFs de texto.
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

- **Na etapa 2:**
  - os exemplos de domínio público, num formato mais discreto que o carrossel de hoje (C7);
  - um botão "Guardar no acervo", que guarda a URL (§5).
- **Depois:**
  - catálogos OPDS que o usuário adiciona (F2);
  - as fontes (F5), com a mesma interface: lista, busca e detalhe;
  - um livro de catálogo aberto por URL pode ser guardado no acervo.

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
| `CoverGrid`, `BookList`, `CardFile` | As três exibições do acervo                                                     |
| `NavRail` / `TabBar`                | O trilho lateral (≥ 600px) e a barra inferior (celular)                         |
| `ShelfTabs`                         | As abas de estante                                                              |
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

| Etapa                        | O que entra                                                                                                                                                                                                                                                                                                                                            | Depende de                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| **0. Protótipo v2**          | Revisar o protótipo com as telas novas (§8). Nenhum código.                                                                                                                                                                                                                                                                                            | —                            |
| **1. Fundações**             | Armazenamento assíncrono + migração, cópia dos arquivos, identidade e tombo, rotas com histórico (Voltar), interfaces de abrir/guardar/buscar em `platform/`, tokens de corte, exportar/importar JSON.                                                                                                                                                 | a mudança para `folheia-app` |
| **2. Acervo mínimo**         | Acervo como tela inicial (vazio = a ficha de hoje), Catálogos com os exemplos (C7) e Mais na navegação, capas geradas, tocar para retomar com "Do início" (sai o cartão "Continuar?"), selos, exemplar ausente, "Guardar no acervo" para URL, ficha como página, remover com desfazer, o "⋯" do leitor no celular. **Substitui o item C6 (Recentes).** | 0 aprovado, 1                |
| **3. Organização**           | Estantes, seleção em lote, três exibições, ordenar, filtrar, buscar, série, notas e capa escolhida.                                                                                                                                                                                                                                                    | 2                            |
| **4. Leituras e marcadores** | A seção Leituras, os marcadores de página (barra, slider, gaveta, ficha) e a leitura sem registro.                                                                                                                                                                                                                                                     | 2                            |
| **5. Tablet**                | Dois painéis a partir de 1024px (acervo + ficha).                                                                                                                                                                                                                                                                                                      | 3                            |

As etapas 0 e 1 andam em paralelo, porque as fundações não dependem do visual. As etapas 3 e 4 são independentes e também podem andar em paralelo. O OPDS e as fontes ficam como itens próprios do backlog (F1–F8).

## 8. Protótipo v2: telas a desenhar

Revisar o protótipo aprovado, mantendo a linguagem Ex-libris. As telas:

1. **Acervo vazio:** a ficha de hoje, dentro da nova navegação. No iPad e no celular.
2. **Acervo com livros:** nas três exibições (capas como padrão, lista, fichário), sem estantes e com abas de estante, no iPad deitado e no celular.
3. **Acervo + ficha em dois painéis:** no iPad deitado.
4. **Ficha do livro como página:** no celular, com marcadores e o resumo das leituras.
5. **Seleção em lote** + o diálogo de estantes com três estados.
6. **Leituras**, agrupadas por dia.
7. **Leitor:** o topo com o tombo, "Guardar no acervo", o aviso "Do início", o botão de marcador, as fitas no slider, a aba Marcadores na gaveta e o "⋯" no celular.
8. **Catálogos:** os exemplos.
9. **Mais:** ajustes, cópia dos arquivos e espaço usado, leitura sem registro e "Sobre", com os carimbos que saíram do início.
10. **Estados:** exemplar ausente (e "não é o mesmo exemplar"), aviso com desfazer, faixa de leitura sem registro, estante vazia, busca sem resultado.
11. **Trilho lateral e barra inferior:** nos dois temas.

O protótipo atual vive como artifact privado, com cópia em `docs/prototipo/`. A v2 pode seguir o mesmo formato.

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
