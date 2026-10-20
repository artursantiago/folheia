# Folheia — Estudo de interface: a biblioteca pessoal

> 20/10/2026. **Status: proposta para sabatina. Nada aqui está decidido.**
>
> **Ponto de partida:** os candidatos I0–I16 do `estudo-mihon.md` §8.3. Este documento é o I0, o estudo que vem antes de qualquer item de interface. Trazer a organização do Mihon (acervo, estantes, ficha, registro, marcadores) muda a tela inicial, a navegação e o que o app guarda no aparelho. É um redesign grande, então vai por etapas e com protótipo antes do código.

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
  - Só existe um corte de tela, em `≤ 600px`.
- **O que fica guardado:**
  - Tudo está em `localStorage` (`src/platform/storage.ts`).
  - Por livro, só **números** (`src/storage/books.ts`): última página, direção e até 6 carimbos de leitura. São no máximo 200 livros.
  - Por decisão escrita no código, **nem o nome nem o título são guardados**.
- **Identidade do livro:**
  - PDF: pela impressão digital do PDF.js.
  - CBZ local: por `nome:tamanho:data`, que não é um hash do conteúdo.
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

| Já existe                                                      | Vira                                                          |
| -------------------------------------------------------------- | ------------------------------------------------------------- |
| Ficha de empréstimo ("Traga um livro para a mesa")             | O jeito de **adicionar** um livro, e o estado vazio do acervo |
| Tombo `Nº 0001` (o soltar arquivo já mostra "o próximo tombo") | O **número fixo** de cada livro no acervo                     |
| Cartão de empréstimo com carimbos datados                      | O **registro de leitura**                                     |
| Ficha catalográfica                                            | A **página do livro**                                         |
| "Devolver à estante", "Lugar vago na estante"                  | As **estantes**                                               |
| Gaveta de fichas (índice)                                      | O modo de exibição **fichário**                               |
| Carimbos ("Não catalogado", "Avariado", "Pág. 87")             | Selos na capa e a estante "Por catalogar"                     |
| Fita do slider de páginas                                      | Os **marcadores de página**                                   |
| "Catalogando" (carregando)                                     | Importar um livro para o acervo                               |

**Um conflito de nome:** hoje "Do acervo" são os exemplos de domínio público. Se "Acervo" passar a ser "os meus livros", os exemplos precisam de outro nome. Ver §3.

## 3. Proposta de organização

### 3.1 Seções

| Seção         | O que é                                                                                                                                                                  | Equivalente no Mihon |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| **Acervo**    | Os seus livros, organizados em estantes. É a tela inicial.                                                                                                               | Biblioteca           |
| **Registro**  | O histórico de leitura: "retirado em… devolvido na pág…", agrupado por dia. Tocar retoma a leitura.                                                                      | Histórico            |
| **Catálogos** | De onde vêm livros que você não tem: os **exemplos de domínio público** hoje e, no futuro, os servidores **OPDS** e as fontes (F1–F8). Resolve o conflito de nome do §2. | Navegar              |
| **Mais**      | Ajustes, exportar/importar o acervo, estatísticas e "Sobre", onde passam a morar os carimbos de privacidade e de domínio público (C9).                                   | Mais                 |

O **leitor** não é uma seção: ele abre por cima de tudo.

Os **marcadores** não são uma seção no começo. Eles aparecem na ficha do livro, na gaveta do leitor e num filtro do acervo ("com marcadores"). Ganham uma seção própria só se a lista central fizer falta.

### 3.2 Navegação por tamanho de tela

- **Celular (< 600px):** barra inferior com as 4 seções, sempre com rótulos visíveis.
- **Tablet e desktop (≥ 600px):** **trilho lateral** à esquerda, também com rótulos. Nada de "rótulo só ao segurar", que é um problema de acessibilidade.
- **Corte do tablet:** precisa ser definido (hoje só existe ≤ 600px). Sugestão: dois painéis a partir de ~900px de largura. O iPad em pé tem 820px e o iPad deitado tem 1180px.
- **Na linguagem Ex-libris:** o trilho pode ser um **fichário vertical** de abas de papel, com a aba atual em destaque.
- **Botão Voltar** (navegador e Android): fecha o diálogo ou painel aberto, depois sai do leitor, depois volta para o Acervo. Isso exige navegação com histórico (§5).

### 3.3 Acervo

- **Vazio:** a ficha de empréstimo de hoje ("Traga um livro para a mesa") é o estado vazio. A identidade aprovada continua sendo a primeira coisa que se vê.
- **Com livros:**
  - **"Adicionar"** vira uma ação fixa no topo.
  - **Soltar um arquivo** em qualquer lugar continua funcionando, e mostra o próximo tombo.
  - O **`?file=`** continua abrindo direto o leitor e oferece "Guardar no acervo".
- **Estantes:**
  - abas no topo, roláveis;
  - um livro pode estar em várias;
  - uma estante de sistema, **"Por catalogar"**, guarda os livros sem estante e só aparece se tiver livros;
  - criar, renomear, reordenar e apagar, sempre com **desfazer**.
- **Exibições:**
  - **capas** (grade);
  - **lista**;
  - **fichário**: cada livro como uma ficha catalográfica curta. É a mais "nossa" e a candidata a padrão.
  - Colunas separadas para retrato e paisagem.
- **Na capa:**
  - **selo de progresso** ("pág. 45/200" ou uma fita);
  - "novo";
  - carimbo "lido";
  - formato discreto.
  - **Tocar na capa retoma a leitura**, sem passar pela ficha. A ficha abre por um botão ou com o toque longo.
- **Ordenar:** título, autor, última leitura, data de entrada e progresso.
- **Filtrar:** em leitura, não lidos, lidos, com marcadores, PDF ou CBZ.
- **Buscar:** busca simples por título, autor e notas.
- **Seleção:** toque longo ou um botão "Selecionar", com caixas visíveis no iPad. As ações são mover de estante (caixas de três estados), marcar como lido e remover (com desfazer).

### 3.4 Ficha do livro

- **Formato:** continua sendo a ficha catalográfica do protótipo, que agora ganha conteúdo.
- **Conteúdo:**
  - tombo;
  - autor, título, ano, páginas, formato e tamanho;
  - série, número e volume (CBZ);
  - idioma;
  - estantes;
  - notas;
  - progresso;
  - **marcadores**, com miniatura;
  - um resumo do registro.
- **Tocar no autor ou na série filtra o acervo.**
- **Onde aparece:**
  - no iPad deitado e no desktop, **painel à direita** do acervo (dois painéis);
  - no celular e no iPad em pé, uma **página**;
  - dentro do leitor, continua um **diálogo**.
- **Ações:**
  - ler e continuar;
  - escolher uma página como capa;
  - editar título e autor (os PDFs costumam vir com metadados ruins);
  - remover do acervo;
  - exportar a ficha.

### 3.5 Registro

- **Base:** os carimbos que o app já grava, os `LoanStamp`, numa lista por dia, com **uma linha por livro**.
- **Comportamento:** tocar retoma a leitura. Dá para apagar uma linha ou limpar tudo.
- **Depois:** **tempo de leitura** (só o tempo ativo, pausado quando a aba fica escondida) e o "relatório da biblioteca" (estatísticas).
- **"Leitura sem registro":** um interruptor que impede que o livro entre no Registro.
- **Ao abrir um livro:** o cartão "Continuar da página 87?" continua existindo, mas **só aparece quando a pessoa entra por um caminho que não retoma sozinho**, como `?file=` ou um arquivo escolhido de novo. Tocar na capa no acervo já retoma direto.

### 3.6 Marcadores de página

O Mihon não tem marcador de página; o Folheia vai ter.

- **Criar:**
  - um botão de **fita** na barra do leitor;
  - a tecla `B`;
  - no PDF, nada de toque longo, para não conflitar com a seleção de texto.
- **Onde aparecem:**
  - como fitas sobre o `PageSlider`;
  - numa aba "Marcadores" na gaveta do índice;
  - na ficha do livro.
- **O que guardam:** página, data, uma nota curta opcional e a miniatura, que sai da prévia que já é renderizada.

### 3.7 Catálogos

- **Agora:**
  - os exemplos de domínio público, num formato mais discreto que o carrossel de hoje (C7);
  - um botão "Adicionar ao acervo".
- **Depois:**
  - catálogos OPDS que o usuário adiciona (F2);
  - as fontes (F5), com a mesma interface: lista, busca e detalhe;
  - um livro de catálogo aberto por URL pode ser guardado no acervo.

## 4. O que muda no leitor

Mudanças pequenas. A virada e o desempenho não são afetados.

- **Topo:** o tombo aparece ao lado do título, como no protótipo. O "Devolver à estante" volta ao Acervo.
- **Barra:** ganha o botão de **marcador** (fita).
- **Celular:** o **"⋯"** do protótipo passa a guardar o que hoje some (primeira/última, zoom, compartilhar).
- **Gaveta:** ganha a aba Marcadores. As miniaturas **em pares de spread**, previstas no protótipo, também entram.
- **Ajustes por livro** (L5): a ficha mostra quando um ajuste do livro está sobrepondo o global.

## 5. O que muda por baixo (fundações)

A biblioteca não cabe no que existe hoje. São pré-requisitos:

1. **Armazenamento assíncrono:**
   - **O que:** uma interface nova em `src/platform/`, com IndexedDB na web e SQLite + Filesystem no app Android (F19). O `localStorage` não guarda capas nem arquivos, e é síncrono.
   - **Migração:** os dados de `folheia:books` são migrados.
2. **O que guardar de cada livro:**
   - **Sempre:** metadados e uma capa pequena (WebP, ou JPEG no Safari, com ~300px).
   - **O arquivo:**
     - **PDF/CBZ local:** cópia **opcional** no OPFS, com cota e aviso de espaço. Sem a cópia, o livro fica no acervo como **"exemplar ausente"** e pede o arquivo de novo, reconhecido pela impressão digital.
     - **URL:** guarda só a URL.
3. **Identidade do livro:**
   - **PDF:** continua pela impressão digital.
   - **CBZ:** passa a usar um hash do **diretório central do ZIP**, que é barato e não depende do nome nem da data. Isso evita "exemplar repetido" falso.
   - **Tombo:** sequencial, por ordem de chegada, fixo para sempre.
4. **Privacidade:**
   - **Muda uma regra escrita no código:** passar a guardar título, autor e capa contradiz o comentário "only numbers" de `books.ts`. Nada sai do aparelho, então a regra 2 do `CLAUDE.md` continua valendo.
   - **"Leitura sem registro"** é a válvula para quem não quer guardar um livro.
5. **Rotas e histórico:**
   - **Esquema por hash, por exemplo:**
     - `#/acervo`, `#/acervo/<estante>`;
     - `#/livro/<tombo>` (a ficha);
     - `#/ler/<tombo>?p=42`;
     - `#/registro`, `#/catalogos`, `#/mais`.
   - **Hash com `pushState`:** permite usar o Voltar.
   - **Compatibilidade:** o `?file=` e o `#p=` atuais continuam funcionando, redirecionados.
   - **`#/estilo` e `#/lab`** ficam como estão.
6. **Plataforma:**
   - "abrir arquivo" e "buscar por URL" viram interfaces em `src/platform/` (hoje o input de arquivo mora dentro da HomeScreen).
7. **Capas e desempenho:**
   - **Uma vez só:** a capa é gerada no **primeiro uso**, a partir da prévia da 1ª página que o leitor já renderiza, e guardada. A grade nunca abre arquivos.
   - **Exemplar ausente:** sem arquivo e sem capa, usa a capa tipográfica, generalizada a partir do `BookCover`.
8. **Exportar e importar o acervo** em JSON (I16): estantes, progresso, marcadores e notas, sem os arquivos. É necessário antes de mudar de origem (a organização `folheia-app`) ou de plataforma (o app Android).

## 6. Componentes novos

Cada um entra em `src/ui/components/` e no `#/estilo`, nos dois temas:

| Componente                          | Para que serve                                                    |
| ----------------------------------- | ----------------------------------------------------------------- |
| `BookCover`                         | Capa genérica: a imagem guardada ou a tipográfica, com selos      |
| `CoverGrid`, `BookList`, `CardFile` | As três exibições do acervo                                       |
| `NavRail` / `TabBar`                | O trilho lateral (iPad e desktop) e a barra inferior (celular)    |
| `ShelfTabs`                         | As abas de estante                                                |
| `SearchField`                       | A busca                                                           |
| `Checkbox` (três estados)           | A seleção e as estantes em lote                                   |
| `SelectionBar`                      | Contador, "selecionar tudo" e ações                               |
| `Snackbar`                          | Um aviso com "desfazer" (pode ser uma extensão do `Notice`)       |
| `EmptyState`                        | Uma ficha em branco com a mensagem e a ação, no tom da biblioteca |
| `Badge`                             | Um selo pequeno na capa (progresso, novo, lido)                   |
| `ListItem`                          | Uma linha de lista (registro, catálogos, estantes)                |

## 7. Caminho em etapas

Cada etapa é entregue sozinha e passa por sabatina antes.

| Etapa                        | O que entra                                                                                                                                                                                                           | Depende de |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **0. Protótipo v2**          | Revisar o protótipo com as telas novas (§8). Nenhum código.                                                                                                                                                           | —          |
| **1. Fundações**             | Armazenamento assíncrono + migração, identidade e tombo, rotas com histórico (Voltar), interfaces de abrir/buscar em `platform/`, exportar/importar JSON.                                                             | 0          |
| **2. Acervo mínimo**         | O Acervo como tela inicial (vazio = a ficha de hoje), capas geradas, tocar para retomar, selos de progresso, remover com desfazer, a ficha com tombo, o "⋯" do leitor no celular. **Substitui o item C6 (Recentes).** | 1          |
| **3. Organização**           | Estantes, seleção em lote, três exibições, ordenar, filtrar, buscar.                                                                                                                                                  | 2          |
| **4. Registro e marcadores** | A seção Registro, os marcadores de página (barra, slider, gaveta, ficha) e a leitura sem registro.                                                                                                                    | 2          |
| **5. Catálogos e tablet**    | A seção Catálogos (exemplos; depois OPDS), dois painéis no iPad, notas, capa escolhida, estatísticas.                                                                                                                 | 3, 4       |

As etapas 3 e 4 são independentes e podem andar em paralelo.

## 8. Protótipo v2: telas a desenhar

Revisar o protótipo aprovado, mantendo a linguagem Ex-libris. As telas:

1. **Acervo vazio:** a ficha de hoje, dentro da nova navegação. No iPad e no celular.
2. **Acervo com livros:** nas três exibições (capas, lista, fichário), com abas de estante, no iPad deitado e no celular.
3. **Acervo + ficha em dois painéis:** no iPad deitado.
4. **Ficha do livro como página:** no celular, com marcadores e registro.
5. **Seleção em lote** + o diálogo de estantes com três estados.
6. **Registro**, agrupado por dia.
7. **Leitor:** o topo com o tombo, o botão de marcador, as fitas no slider, a aba Marcadores na gaveta e o "⋯" no celular.
8. **Catálogos:** os exemplos.
9. **Mais:** ajustes e "Sobre", com os carimbos que saíram do início.
10. **Estados:** exemplar ausente, aviso com desfazer, estante vazia, busca sem resultado.
11. **Trilho lateral e barra inferior:** nos dois temas.

O protótipo atual vive como artifact privado, com cópia em `docs/prototipo/`. A v2 pode seguir o mesmo formato.

## 9. Perguntas para a sabatina

1. **Nomes:** Acervo, Registro, Catálogos e Mais? E "Por catalogar" para os livros sem estante?
2. **Navegação:** são 4 seções? Os marcadores ganham seção própria agora ou só depois?
3. **Arquivo:** guardar uma cópia no aparelho por padrão, pedir ou nunca? Qual cota?
4. **Exemplar ausente:** o livro sem arquivo fica no acervo, ou some?
5. **Toque na capa:** retoma direto (proposta) ou abre a ficha?
6. **Cartão "Continuar?":** fica só para `?file=` e arquivo escolhido de novo?
7. **Exibição padrão:** fichário, capas ou lista?
8. **Ficha:** página/painel (proposta) ou continua diálogo em todo lugar?
9. **Marcadores:** botão de fita + tecla `B` bastam? Guardam nota?
10. **Registro:** medir tempo de leitura agora ou depois?
11. **Corte do tablet:** dois painéis só no iPad deitado (≥ ~900px)?
12. **Ordem das etapas:** protótipo v2 primeiro, sem nenhum código, como proposto?
13. **Mudança para a organização** (`folheia-app`): antes da etapa 1, para nascer na origem nova, ou depois, com exportar/importar pronto?
