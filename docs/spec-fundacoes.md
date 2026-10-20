# Folheia — Spec das fundações (biblioteca, etapa 1)

> 20/10/2026. **Rascunho para a sabatina da etapa.** As decisões vêm do `estudo-interface.md` (topo e §5). O mapa do código foi feito em 20/10/2026, na `main` da v0.2.0.
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
- **Buscar:** a `Network` do PR #1, refeita como na D5 (`pauta-decisoes.md`), com leitura por intervalos. O `src/sources/http.ts` passa a usá-la.

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

## 4. Perguntas para a sabatina da etapa

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
