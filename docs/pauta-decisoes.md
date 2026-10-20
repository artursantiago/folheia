# Folheia — Pauta das decisões da onda 0

> 20/10/2026. **Rascunho para o Artur confirmar.** Preparado sem ele, para que cada decisão do `roteiro.md` §3 vire uma conversa curta: **confirmo**, **mudo isto** ou **quero sabatinar**.
>
> Cada item traz uma **recomendação** e o porquê. Nada aqui está decidido. Quando o Artur confirmar, a decisão vai para o lugar dela (`estudo-mihon.md` §8, `plano-mvp.md` §8, `roteiro.md`) e esta pauta fica como registro.

## Ordem sugerida

1. ✅ **D3, só o leitor (L1–L12), decidida em 20/10/2026:** decide o que entra no pedido do protótipo v2 e no motor da onda 1.
2. **D1 + D5** (✅ D1 decidida em 20/10/2026): o "quando começar" das fundações e o que fazer com o PR #1, que entra nelas.
3. **Protótipo v2 e fundações, em paralelo:** rascunhos em `prototipo-v2-pedido.md` e `spec-fundacoes.md`.
4. **D2 + F1–F8:** as fontes dependem da regra 2, então é uma conversa só. Não bloqueia nada até a onda 2 (capas) e a onda 3 (fontes).

## D3a. Triagem do leitor (L1–L12)

**Decidido com o Artur em 20/10/2026.** A última coluna já traz a decisão; o porquê da proposta está logo abaixo. O que o código já faz foi conferido no mesmo dia.

| ID  | Candidato (resumo)                       | Hoje no Folheia                                                                                                      | Recomendação                                                                                                 |
| --- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| L1  | Gravar o progresso quando a leitura para | Grava no `localStorage` a cada troca de página (`ReaderScreen.tsx`, `bookMemory.recordProgress`), sem gravar ao sair | **Sim, nas fundações (etapa 1).** Com o armazenamento assíncrono, vira necessidade                           |
| L2  | Dica das zonas de toque                  | Não existe                                                                                                           | **Sim, etapa 2 (moldura).** Aparece também quando a direção muda                                             |
| L3  | "Zoom e percorrer" spreads largos        | Spreads largos são divididos ao meio (`splitSpreads`)                                                                | **Sim, depois**, junto do painel Paginação (E14). O protótipo só reserva a opção                             |
| L4  | Regras de pareamento                     | Página larga já fica sozinha e a paridade já recomeça (`layout/book.ts`). Falta parear só proporções parecidas       | **Sim, onda 1 (motor):** ~20% de tolerância, só com tamanhos medidos                                         |
| L5  | Ajustes por livro                        | A direção já é guardada por livro; o modo e a capa sozinha são globais                                               | **Sim, junto da E14**, guardado no registro do livro (fundações)                                             |
| L6  | Fundo automático pela cor da borda       | Não existe                                                                                                           | **Não**                                                                                                      |
| L7  | Cortar margens de PDFs escaneados        | Não existe                                                                                                           | **Não**                                                                                                      |
| L8  | Slider que inverte em RTL + "n / total"  | **Feito** no modo imersivo (B5). Falta o contador discreto quando a barra some                                       | **Feito.** Sem contador: a barra do modo normal deixa de sumir                                               |
| L9  | Brilho, sépia, inverter                  | Não existe                                                                                                           | **Backlog "se houver vontade"**                                                                              |
| L10 | Toque longo: capa, salvar, compartilhar  | Não existe                                                                                                           | **Só "usar como capa"**, pelas miniaturas e pela ficha (I12, etapa 3). "Compartilhar esta página" no backlog |
| L11 | Layouts de toque alternativos            | Zonas esquerda/direita, com setas físicas                                                                            | **Não**                                                                                                      |
| L12 | Rolagem vertical (webtoon) com faixas    | É a E15, já no backlog                                                                                               | **Juntar com a E15**, levando a técnica das faixas. "Depois, por vontade"                                    |

**Por que cada um:**

- **L1:** hoje cada página virada reescreve o JSON inteiro da biblioteca no `localStorage`. No IndexedDB a gravação é assíncrona. Gravar só quando a leitura para (~1 s parado) e forçar a gravação no `pagehide` e no `visibilitychange` evita perder a página ao fechar a aba no iPad. Chegar à última página marca como lido, o que alimenta o selo "concluído" da etapa 2. Não mexe na moldura.
- **L2:** a pessoa descobre as zonas de toque sem precisar de um guia. É um componente pequeno no tom Ex-libris, que some no primeiro toque, sem animação com `prefers-reduced-motion`. Mexe na moldura, então vai para o protótipo.
- **L3:** é o que mais ajuda a ler HQ no iPad em pé, mas depende do `ZoomController` e de "próxima" andar pela imagem antes de virar. É um modo novo do leitor, então vai melhor junto da E14.
- **L4:** evita parear uma página dobrável com uma normal, ou duas páginas de tamanhos muito diferentes, como num encarte. Precisa de uma tolerância, para não desmanchar spreads de PDFs com pequenas variações de tamanho.
- **L5:** só faz sentido quando houver ficha do livro. A E14 (painel Paginação) é o lugar natural para escolher entre "este livro" e "todos".
- **L6, L7, L9, L11:** o impacto foi estimado como baixo ou médio. O L6 briga com o fundo de papel da identidade. O L7 e o L9 custam processamento por página no iPad, e o L9 esbarra no aviso do `CLAUDE.md` sobre CSS `filter` em camadas grandes. O Artur guardou só o L9, como ideia.
- **L8:** o palco do modo normal já reserva o espaço da barra, então escondê-la não mostrava mais livro. Basta a barra não sumir. No modo imersivo com a barra que some, quem o escolhe quer 100% do livro, e um toque traz a barra.
- **L10:** no PDF, o toque longo já é o gesto de selecionar texto, e no iOS ele abre o menu do sistema. Escolher a capa pela grade de miniaturas resolve o I12 sem conflito.

## D2. Sabatina de privacidade (com F1–F8)

A regra 2 do `CLAUDE.md` hoje só aceita o `?file=` e os exemplos. As perguntas, cada uma com recomendação:

1. **Servidores adicionados pelo usuário** (OPDS: Komga, Kavita, Calibre-web, Suwayomi).
   - **Recomendação:** aceitar. A regra 2 passa a dizer "servidores e sites **adicionados pelo usuário**, e catálogos de domínio público listados, só quando ele os abre". É a mesma lógica do `?file=`: quem escolhe o destino é a pessoa.
2. **Fontes pela extensão** (E4.1, PR #1).
   - **Recomendação:** aceitar, com a mesma regra da pergunta 1. A extensão é instalada pela pessoa, e o site público não lista nenhuma fonte. O detalhe (quais permissões a extensão pede, o que ela expõe ao site) fica na D5.
3. **Capas buscadas na internet** (C6, E4.4 AniList, Open Library).
   - **O risco:** mandar o título do livro a um terceiro conta o que você lê.
   - **Recomendação:** **só quando pedido, livro a livro**, com um botão "Buscar capa" na ficha que diz para onde vai a consulta. Nunca automático. O padrão continua a capa da 1ª página e, sem ela, a capa tipográfica.
4. **GoatCounter** (G20).
   - **Recomendação:** **não.** Só o Artur usa o app, então métricas de visita não ajudam a decidir nada. Sai do backlog ou fica em G como "não".
5. **Proxy próprio** (F7, Cloudflare Worker).
   - **Recomendação:** **não por ora.** O Suwayomi + Tailscale (F3) e o app Android (F8) dão acesso às fontes sem um servidor nosso, e o site continua 100% estático.
6. **Fontes em JS** (F5, QuickJS-WASM).
   - **Recomendação:** **depois**, só se OPDS + Suwayomi não bastarem. É o item mais caro (G) e o que mais mexe nas regras (código de terceiros, mesmo isolado).

**F1–F8, em resumo:**

| ID  | Recomendação                                                                           |
| --- | -------------------------------------------------------------------------------------- |
| F1  | **Sim, onda 3:** a base (`CatalogSource`) de tudo o que vem depois                     |
| F2  | **Sim, onda 3:** o primeiro catálogo de verdade (OPDS)                                 |
| F3  | **Sim, depois do F2:** o guia só pode ser testado com o cliente OPDS pronto            |
| F4  | **Sim, depois do F2:** Internet Archive com curadoria de domínio público, em Catálogos |
| F5  | **Depois**, só se faltar (pergunta 6)                                                  |
| F6  | **Juntar com a E4:** o userscript é a versão Safari da ponte do PR #1                  |
| F7  | **Não por ora** (pergunta 5)                                                           |
| F8  | **Sim, onda 4:** na fase do app Android                                                |

## D1. Quando começar a biblioteca

**Decidido em 20/10/2026: começar as fundações (etapa 1) já, em paralelo com o protótipo v2,** numa sessão própria em worktree que abre com a sabatina da etapa. Antes do Claude Design, o pedido do protótipo v2 passa por uma sessão própria de conversa.

- **O que o estudo pedia antes já está feito:**
  - desempenho (A2, v0.2.0);
  - a mudança para `folheia-app`;
  - o versionamento com a prévia em `/next/`, que deixa testar as fundações sem tocar na versão estável;
  - o ícone e os textos (D4).
- **As fundações não dependem do visual.** Quase nada muda na tela: o Voltar passa a funcionar, e o progresso é gravado do jeito novo.
- **Rascunho da spec pronto** em `spec-fundacoes.md`, com o mapa do código de hoje e as perguntas para a sabatina da etapa.
- **Sessão própria, em worktree.** Ela mexe em `src/storage/`, `src/platform/`, `src/ui/router.ts`, `session.ts` e nos testes e2e que abrem arquivos.

## D5. O PR #1 (extensão)

Estado em 20/10/2026:

- **O PR está em rascunho**, com CI verde no último push.
- **Está 23 commits atrás da `main`**, com um conflito em `src/ui/pages/Lab.tsx`.
- **Não traz dependências novas.**
- **O roteiro aponta para E4, E4.1 e E4.4**, que só existem no branch. Hoje essas referências estão quebradas na `main`.

**Recomendação: mesclar em partes, mas trazendo arquivos, não commits.**

1. **Agora, só documentação:** trazer para a `main` o `estudo-extensao.md`, a seção E4 do `plano-mvp.md` e a linha do `estudo-mihon.md`. Isso conserta as referências do roteiro e não mexe em nenhuma regra.
2. **Nas fundações, a `Network` refeita:**
   - **O que vem do PR:** `src/platform/network.ts`, `bridge.ts` e o teste.
   - **O protocolo da ponte** vai para um lugar neutro (por exemplo, `src/platform/bridge/protocol.ts`), para o `src/` não importar de `extension/`.
   - **A interface fica menor:**
     - o núcleo é `request()`;
     - o que é só da ponte (`bridge`, `requestAccess`, `imageHeaders`) vira um complemento opcional;
     - os tipos de método e cabeçalho deixam de vir da lista da ponte.
   - **Ganha leitura por intervalos** (range), e o `src/sources/http.ts` passa a usá-la. Assim o "buscar" vira de verdade a costura da plataforma: na web agora e com o `CapacitorHttp` depois.
   - **Um falso para os testes**, como o `memoryStorage`.
3. **Fica no branch até Catálogos e a D2:**
   - `extension/` (sem o protocolo) e o userscript;
   - `scripts/build-extension.mjs`;
   - os e2e `bridge*`;
   - os painéis `LabBridge*` do `#/lab`.

   O PR continua em rascunho, renomeado para "extensão".

**Por que não mesclar a `Network` como está:** não quebraria nada, porque só o `#/lab` a usa. Mas fixaria o formato da interface antes de desenhar abrir, guardar e buscar juntos, e traria junto a dependência de `extension/`.

**Riscos:**

- **O branch se afasta da `main`:** o conflito no `Lab.tsx` só cresce.
- **A ponte no `?file=` antes da D2:** usá-la como alternativa automática ali amplia em silêncio o que a regra 2 cobre.
- **Antes de assinar no AMO:** é preciso fechar o endereço fixo do site na extensão e o `gecko.id`.

**Limpeza:** o worktree da extensão tem um `node_modules` inteiro. Depois que os documentos chegarem à `main`, dá para remover o worktree e guardar só o branch.

**Perguntas abertas no estudo da extensão, que vão para a D2:**

- o texto novo da regra 2;
- uma nota na regra 8 sobre a `Network`;
- publicar ou não nas lojas;
- um "usar os cookies do navegador" opcional, site a site;
- limites de requisição e cache por site.

**No iPad, o Safari não manda `Referer`:** as capas de alguns sites voltam 403. É mais um motivo para as capas virem de um catálogo de metadados, como o AniList (pergunta 3 da D2).
