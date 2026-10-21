# Folheia — Spec das fundações (biblioteca, etapa 1)

> 20/10/2026. **Aprovada na sabatina da etapa (20/10/2026)**; as respostas estão no §4. **Implementada em 20–21/10/2026:** os 10 passos do §3 estão na `main`, e o §5 conta o que mudou em relação a este rascunho. As decisões vêm do `estudo-interface.md` (topo e §5). O mapa do código foi feito em 20/10/2026, na `main` da v0.2.0.
>
> - **O que este documento faz:** junta o que a etapa 1 precisa construir, o ponto de partida no código e as perguntas que ainda pedem resposta. As perguntas estão no §4.
> - **O que fica de fora:** a etapa 1 não muda a cara do app. O Acervo, a ficha e o aviso "Do início" são da etapa 2.

## 1. Ponto de partida

| Área             | Hoje                                                                                                                                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Armazenamento    | Duas chaves no `localStorage`, com o prefixo do canal (`folheia:` ou `folheia-next:`): `books` e `preferences`. Interface síncrona `KeyValueStore` (`src/platform/storage.ts`). Sem IndexedDB, OPFS, `navigator.storage` nem versão de esquema |
| Livros guardados | `books`: até 200 livros, só números (`lastPage`, `direction`, até 6 carimbos). Grava a cada troca de página (`ReaderScreen.tsx:148-157`)                                                                                                       |
| Identidade       | PDF: `pdf:<fingerprint do PDF.js>`, que vira `pdf:unknown` quando falta. CBZ local: `cbz:nome:tamanho:data`. CBZ por URL sem range: `cbz::<tamanho>:0`, que pode colidir                                                                       |
| Rotas            | `src/ui/router.ts`: `home`, `#/estilo` e `#/lab`. O leitor não é rota: é o estado da sessão (`session.ts`). Nenhum `pushState`, então o Voltar do navegador sai do app                                                                         |
| Plataforma       | `storage`, `fullscreen`, `share` e `pwa`. O input de arquivo e o soltar moram na `HomeScreen`. O `fetch` mora em `src/sources/http.ts`                                                                                                         |
| Fontes           | O PDF e o CBZ já leem de um `Blob` aos pedaços. Um `File` vindo do OPFS funciona sem mudança                                                                                                                                                   |
| Metadados        | PDF: título, autor, ano e direção. CBZ: o `ComicInfo.xml` inteiro (série, número, volume, idioma, mangá). Prévia de 360 px por página (`getThumbnail`)                                                                                         |
| Cortes de tela   | Cinco `@media (width <= 600px)` soltos em quatro arquivos. Não há token nem regra de 1024 px                                                                                                                                                   |

Todo caminho de abertura termina em `openBook` (`session.ts:43`). É ali que entram a importação, a impressão digital e a cópia.

## 2. O que construir

### 2.1 Armazenamento assíncrono

- **Interface em `src/platform/`**, com IndexedDB na web e um falso em memória para os testes.
- **Nome por canal:** o banco se chama `folheia` ou `folheia-next`. A raiz e o `/next/` dividem a mesma origem, então dividem o mesmo IndexedDB e o mesmo OPFS.
- **Versão do esquema** desde o primeiro dia, com migrações numeradas.
- **Coleções:**
  - `books`: o registro do livro, com tombo, impressão digital, origem (arquivo copiado, URL, exemplo), metadados, `lastPage`, direção, ajustes por livro (L5) e datas;
  - `loans`: os carimbos de leitura, sem o limite de 6 de hoje;
  - `covers`: a capa pequena, em JPEG de ~300 px;
  - `meta`: o próximo tombo e a versão.
  - **Ficam para depois:** `bookmarks` (etapa 4) e `shelves` (etapa 3). O esquema já prevê as duas.
- **As preferências continuam no `localStorage`**, síncronas. O tema precisa estar pronto antes do primeiro desenho, para a tela não piscar.
- **L1 (aprovado na D3):** o progresso é gravado ~1 s depois que a leitura para, e forçado no `pagehide` e no `visibilitychange`. Chegar à última página marca como lido.

### 2.2 Migração do `localStorage`

- Os registros de `folheia:books` viram **memória de progresso**, chaveada pelo id antigo, porque não têm título nem arquivo para virar livros do acervo.
- Quando o mesmo arquivo voltar, o livro entra no acervo já com a página e os carimbos.
- **CBZ:** ao abrir um CBZ local, o app calcula também o id antigo (`nome:tamanho:data`) para achar a memória.
- A chave antiga só é apagada depois que a migração termina sem erro.

### 2.3 Identidade e tombo

- **PDF:** continua pela impressão digital do PDF.js. Quando ela falta, usa um hash do tamanho com o começo e o fim do arquivo.
- **CBZ:** SHA-256 (`crypto.subtle`) do **diretório central do ZIP**. O app lê o fim do arquivo (EOCD), acha o diretório e calcula o hash só dele: é barato e não depende do nome nem da data. Resolve também a colisão do CBZ por URL.
- **Tombo:** um contador em `meta`, dado quando o livro entra no acervo.

### 2.4 Cópia no OPFS

- **Interface `FileStore`** em `src/platform/`: guardar com progresso, ler (devolve um `File`), remover e medir o espaço.
- **Na web:** uma pasta por canal na raiz do OPFS (`folheia/` e `folheia-next/`), um arquivo por livro.
- **Ao copiar:** pedir `navigator.storage.persist()`. Se o espaço acabar, o livro entra sem o arquivo e o motivo é guardado, para o aviso da etapa 2.
- **No app Android**, a mesma interface aceita uma referência a um arquivo de fora (a pasta da biblioteca).

### 2.5 Rotas com histórico

- **Hash com `pushState`:** abrir o leitor cria uma entrada no histórico, e o Voltar fecha o leitor.
- **Diálogos e gavetas** se registram numa pilha. O Voltar fecha o de cima primeiro.
- **Rotas da etapa 1:** `#/` (início), `#/ler/<tombo>?p=42`, `#/estilo` e `#/lab`. As outras (`#/acervo`, `#/livro/<tombo>`…) entram com as telas.
- **Compatibilidade:** o `?file=` e o `#p=` de hoje continuam funcionando e são redirecionados. Os links internos do PDF (`href="#p=N"`) continuam funcionando.
- **Atenção:** o Safari lança erro depois de 100 `replaceState` em 10 s. A página só vai para o endereço quando muda (como hoje), e o `push` só acontece ao abrir.

### 2.6 Interfaces de plataforma

- **Abrir arquivo:** o seletor, o soltar e o `launchQueue` saem da `HomeScreen` e do `pwa.ts` e vão para uma interface só.
- **Guardar arquivo:** o `FileStore` (§2.4).
- **Buscar:** a `Network` do PR #1, refeita como decidido na D5 (`pauta-decisoes.md`; opção A), com leitura por intervalos. As peças estão no branch `claude/extension-bridge-poc-6ec4b9`: `src/platform/network.ts`, `bridge.ts`, `network.test.ts` e `extension/src/protocol.ts`, que vai para `src/platform/bridge/protocol.ts`. O `src/sources/http.ts` passa a usá-la.

### 2.7 Cortes de tela

- Tokens de **600 px** e **1024 px** em `src/theme/`, com a mesma fonte para o CSS e para o `matchMedia`.
- **Erro a corrigir:** os `width <= 600px` de hoje deixam 600 px no lado pequeno, mas a decisão é "trilho a partir de 600 px". O lado pequeno vira `width < 600px`.
- **Como fazer no CSS:** variável CSS não funciona dentro de `@media`. Ver a pergunta 4.

### 2.8 Exportar e importar em JSON

- **Exporta:** livros, carimbos, ajustes por livro, a versão e o próximo tombo. Os campos de estantes, marcadores e notas entram quando existirem. As capas e os arquivos ficam de fora.
- **Importa:** junta pela impressão digital. O que já existe não é sobrescrito sem confirmação.
- **Formato** com versão, para o app Android ler.

### 2.9 L4 (aprovado na D3)

Em `src/layout/book.ts`: duas páginas só formam par quando as proporções são parecidas, com uma tolerância. Testes com encarte, página dobrável e PDF de páginas um pouco diferentes.

## 3. Ordem sugerida dos commits

1. Tokens de corte de tela + o ajuste do `width < 600px`. É independente e pequeno.
2. Interface de armazenamento assíncrono, IndexedDB, falso em memória e versão de esquema.
3. Identidade nova (hash do diretório central) e o registro do livro. Migração do `localStorage`.
4. L1: gravação quando a leitura para.
5. `FileStore` no OPFS e a cópia ao abrir um arquivo local.
6. Interface de abrir arquivo; a `HomeScreen` passa a usá-la.
7. `Network` com range; o `http.ts` passa a usá-la.
8. Rotas com histórico e a pilha de diálogos.
9. Exportar e importar.
10. L4: pareamento por proporção. É independente e pode ir antes.

Cada passo com testes, lint, typecheck e build, como sempre. Entram no `CHANGELOG.md` só o que a pessoa nota: o Voltar e, se for o caso, o progresso gravado ao sair.

## 4. Sabatina da etapa

**Respondida com o Artur em 20/10/2026.** As perguntas ficam abaixo como registro; a resposta vem logo depois de cada uma.

### Respostas

1. **A cópia só liga na prévia** (`/next/`) e no dev. Na estável ela fica pronta, mas desligada, até a etapa 2 trazer o Mais com o interruptor e o espaço usado.
2. **OPFS no Safari 18:** o Artur preferiu seguir sem o teste no iPad. A escrita vai sempre por um **worker com `createSyncAccessHandle`**, que existe desde o Safari 15.2 e funciona no Chromium, no Firefox e no WebKit. O teste ficou no `#/lab` ("Armazenamento (OPFS)") para quando ele quiser conferir.
3. **IndexedDB com o `idb`** (ISC, ~1,2 KB), só dentro do adaptador web. Nos testes, o `fake-indexeddb` (Apache-2.0, só de desenvolvimento) exercita o adaptador de verdade.
4. **Cortes de tela:** `src/theme/breakpoints.ts` exporta 600 e 1024 para o `matchMedia`, e a regra `media-feature-name-value-allowed-list` do Stylelint só aceita essas duas larguras nos `@media`. Um teste confere que as duas listas batem. O `postcss-custom-media` é MIT-0, fora da lista de licenças.
5. **O cartão "Continuar?" fica** até a etapa 2. Só muda de onde vem o registro: ele é lido no `openBook`, antes de o leitor aparecer.
6. **A cópia fica ligada nos e2e.** Ela roda em segundo plano, sem atrasar a primeira página, e falha em silêncio: o livro entra sem o arquivo, com o motivo guardado. O `persist()` nunca é esperado, porque no Firefox ele abre um pedido de permissão (no headless, nunca responde). No WebKit do Playwright o contexto efêmero recusa o OPFS (`UnknownError`), então os specs de hoje exercitam a falha. Um spec novo confere a cópia de verdade, com contexto persistente no WebKit.

### Perguntas

1. **A cópia liga já na etapa 1?** Copiar 100 MB por livro sem uma tela para ver ou apagar (Mais só chega na etapa 2) enche o aparelho às escuras.
   - **Recomendação:** a cópia fica pronta, mas só liga na prévia (`/next/`) até a etapa 2.
2. **OPFS no Safari 18:** confirmar no iPad se o `createWritable` existe na página ou se a escrita precisa ir para um worker com `createSyncAccessHandle`.
   - **Recomendação:** testar no iPad real antes do passo 5. Se não existir, escrever pelo worker.
3. **Biblioteca para o IndexedDB:** escrever um invólucro próprio pequeno ou usar o `idb` (ISC, ~1 KB).
   - **Recomendação:** o `idb`. A licença é permitida, o pacote é pequeno e evita erros com transações.
4. **Tokens de corte no CSS:** `@custom-media` com o plugin `postcss-custom-media` (conferir a licença: o csstools usa MIT-0), ou valores fixos com uma regra do Stylelint que só aceita 600 e 1024.
   - **Recomendação:** a regra do Stylelint. Não adiciona dependência, e o TS exporta as mesmas constantes para o `matchMedia`.
5. **O que acontece com o cartão "Continuar?" na etapa 1:** ele continua até a etapa 2, que traz o aviso "Do início".
   - **Recomendação:** não mexer nele agora.
6. **Os testes e2e que abrem arquivos** (sete specs) vão passar pela cópia. É preciso confirmar que o OPFS funciona no WebKit do Playwright, ou desligar a cópia nesses testes.

## 5. Como ficou (implementação, 21/10/2026)

Os 10 passos do §3 entraram na `main`, um commit por passo, com os testes passando no Chromium, no Firefox e no WebKit (e nos iPad e iPhone emulados).

| Passo                    | Commit    | Onde                                                                        |
| ------------------------ | --------- | --------------------------------------------------------------------------- |
| 1. Cortes de tela        | `c05d1df` | `src/theme/breakpoints.ts`, `stylelint.config.js`                           |
| 2. Banco assíncrono      | `b209d08` | `src/platform/database.ts`, `src/storage/schema.ts`, `src/storage/db.ts`    |
| 3. Identidade e registro | `3e84e00` | `src/sources/digest.ts`, `CbzSource.ts`, `PdfSource.ts`                     |
|                          | `959f10f` | `src/storage/library.ts` (registro, carimbos, migração)                     |
| 4. L1                    | `d4b05d8` | `src/storage/saver.ts`, `ReaderScreen.tsx`                                  |
| 5. Cópia no OPFS         | `797c91d` | `src/platform/files.ts`, `opfsWriter.worker.ts`, `src/storage/copies.ts`    |
| 6. Abrir arquivo         | `2c54e9e` | `src/platform/openFile.ts`                                                  |
| 7. `Network`             | `0437de8` | `src/platform/network.ts`, `src/platform/bridge/`, `src/sources/http.ts`    |
| 8. Rotas e Voltar        | `c0a63ef` | `src/ui/router.ts`, `src/ui/hooks/useBackLayer.ts`, `App.tsx`, `session.ts` |
| 9. Exportar e importar   | `dfde93d` | `src/storage/backup.ts` (botões no `#/lab`)                                 |
| 10. L4                   | `ac8c07a` | `src/layout/book.ts`, `src/viewer/Reader.ts`                                |

**O que mudou em relação ao rascunho:**

- **§1 estava errado num ponto:** não existe `getThumbnail`. A loja `covers` existe, mas **a capa ainda não é gerada**: isso fica para a etapa 2, junto da grade, a partir da prévia que o leitor já renderiza.
- **Registro do livro:** uma loja `books` só, chaveada pela identidade do arquivo. Com tombo, o livro está no acervo (com título, autor e origem). Sem tombo, é só memória de progresso (números), que é o que o `?file=`, os exemplos e a migração do `localStorage` viram.
  - **O arquivo local entra no acervo sozinho já na etapa 1**, também na estável (decisão 4 do estudo). Só a cópia é que fica desligada na estável.
  - **"Lido"** é o `finishedAt`: a primeira vez que a última página aparece (`atEnd` do leitor, que cobre o spread final).
  - **L5:** o campo `settings` (`layout`, `coverAlone`) existe no registro, sem uso ainda.
- **Identidade do CBZ:** o unzipit lê o diretório central por último ao abrir o ZIP. O `CbzSource` guarda essa leitura e calcula o SHA-256 dela, sem ler nada a mais (nem por HTTP). Um teste confere o hash contra o diretório lido à parte, para pegar uma mudança do unzipit.
  - Fora de contexto seguro (servidor de dev por IP da rede), não há `crypto.subtle`: o hash vira um FNV não criptográfico. Os dados são por origem, então os dois nunca se misturam.
  - Os ids antigos (`cbz:nome:tamanho:data` e `cbz:<url>`) vêm em `legacyIds`, e a memória achada com eles muda para o id novo.
- **Migração:** roda uma vez, ao abrir o banco, só se o IndexedDB abriu de verdade. Nunca sobrescreve um registro que o banco já tem.
- **Sem IndexedDB** (modo privado antigo, bloqueado), o app usa um banco em memória e continua lendo. Abrir um livro espera o armazenamento no máximo 3 s.
- **L1:** o `createSaver` grava só o último valor, 1 s depois da última página virada. O `flushOnLeave` força a gravação no `pagehide` e no `visibilitychange` (escondida), e fechar o livro também grava.
- **Cópia:** começa 1,5 s depois de o livro abrir, para não disputar o arquivo com as primeiras páginas. Uma por vez, e nunca duas do mesmo livro. O motivo da falta fica em `origin.copy` (`disabled`, `quota`, `unavailable`, `failed`).
- **Rotas:** o livro fora do acervo fica em `#/ler?p=N` (com o `?file=` na query para os de URL).
  - **Recarregar ou avançar** para `#/ler/<tombo>` reabre o livro pela cópia. Sem cópia (a estável), o app volta ao início; na etapa 2, ele vai pedir o arquivo.
  - **Link de fora** (`?file=`, `#/ler/…`): o app põe o início por baixo, para o Voltar ficar no app.
    - **O Firefox não respeita isso:** o Voltar dele pula entradas em que ninguém interagiu e sai do site. É regra do navegador; o e2e desse caso pula o Firefox.
  - **Camadas:** o `Dialog` se registra sozinho. A gaveta do índice e o menu de ajustes usam `useBackLayer`. O cartão "Continuar?" fica de fora, para o Voltar fechar o livro.
  - **Compartilhar** um livro de URL gera `?file=…#/ler?p=N`. Um arquivo local compartilha só o app, sem tombo.
- **`Network`:** o `webNetwork` nunca usa a ponte, nem quando ela está instalada, e um teste garante isso. A ponte só entra num `Network` criado com ela (`createWebNetwork({ bridge })`), o que nada faz ainda. As requisições vão com `credentials: 'omit'`.
- **Exportar e importar:** o formato é `folheia-library` versão 1. A cópia do arquivo não viaja (ela é do aparelho), e os carimbos são juntados sem repetir. Os botões ficam no `#/lab` até o Mais da etapa 2.
- **L4:** a tolerância é `PAIR_TOLERANCE = 0.2` (razão entre as proporções). A página que esperava par ganha um branco virtual. O leitor refaz o layout quando um tamanho novo muda os spreads, e não durante uma virada.

**Ficou para depois:**

- gerar e guardar a capa (etapa 2);
- a tela de exportar e importar e o interruptor da cópia, em Mais (etapa 2);
- pedir o arquivo de volta quando não há cópia (etapa 2);
- testar a cópia e o Voltar no iPad real, na prévia.
