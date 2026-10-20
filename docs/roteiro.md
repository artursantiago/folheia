# Folheia — Roteiro

> 20/10/2026. **Proposta para o Artur revisar.**
>
> Este roteiro organiza **o backlog inteiro** (`plano-mvp.md` §8) em frentes de trabalho e numa ordem. Ele inclui os estudos do Mihon (`estudo-mihon.md` §8), da interface (`estudo-interface.md`) e da extensão (`estudo-extensao.md`, PR #1).
>
> O backlog continua sendo onde cada item é descrito. Aqui fica só **o que vem antes do quê, e por quê**. Cada item continua passando por sabatina antes de ser implementado.

## 1. As frentes

| Frente                           | O que reúne                                                                                                                                                                                                                                                                         | Estado                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **1. Desempenho**                | A2: P11, P1 + P5, P3, 18b e P6 feitos (20/10/2026). Depois, se fizer falta: P7, P2, P8, P9, P10. As confirmações no iPad.                                                                                                                                                           | **Em andamento** (sessão própria)                          |
| **2. Identidade e apresentação** | **Protótipo v2** (C2, etapa 0). **Ícone e logo** (D10). **Splash** (D11). **Textos** (C8: menos "PDF e CBZ", e o tom). **README** e **README.en**, a **descrição do repositório** e a **página da organização** (`folheia-app/.github`).                                            | A começar                                                  |
| **3. Biblioteca**                | C2, etapas 1 a 5: fundações, acervo mínimo, organização, Leituras e marcadores, tablet. Resolve C6, C7 e C9.                                                                                                                                                                        | Decidida na sabatina; espera o protótipo v2 para a etapa 2 |
| **4. Fontes e catálogos**        | E4 (extensão, PR #1). F1–F8 do Mihon: `CatalogSource`, OPDS, Internet Archive, fontes JS, `CapacitorHttp`. Capas por catálogo de metadados.                                                                                                                                         | POC pronta; depende de decisões (§3)                       |
| **5. Leitor**                    | B2 (controles na sobra lateral, slider na barra normal, marcas de capítulo no slider). E12 (busca no PDF), E14 (painel Paginação), E15 (rolagem vertical/webtoon). E2 (voz alta, grade de miniaturas como modo). L1–L12 do Mihon. E13 (som), E16 (3D), E17 (temas), E18 (exportar). | L1–L12 triados em 20/10/2026                               |
| **6. App Android**               | F19: Capacitor ou TWA, a pasta da biblioteca, SQLite, splash e ícones nativos, HTTP nativo para as fontes (F8).                                                                                                                                                                     | Depois das fundações                                       |
| **7. Se houver demanda**         | G20 (GoatCounter), G21 (CBR/CB7), G22 (HQ de domínio público nos exemplos).                                                                                                                                                                                                         | Sem data                                                   |

## 2. Como as frentes se cruzam

Os pontos que decidem a ordem:

1. **O protótipo v2 é o ponto de encontro.**
   - **A biblioteca:** a etapa 2 só começa com o protótipo aprovado.
   - **O leitor:** tudo que muda a **moldura do leitor** precisa estar no protótipo para não ser desenhado duas vezes. Isso inclui:
     - o "⋯" no celular;
     - o botão e as fitas dos marcadores;
     - o slider na barra normal (B2);
     - a dica das zonas de toque (L2);
     - a grade de miniaturas em pares (E2);
     - a opção de qualidade máxima (18b), que já existe nos Ajustes desde 20/10/2026 (o protótipo decide o lugar final).
   - **As fontes:** o mesmo vale para a seção **Catálogos**, onde as fontes vão aparecer.
   - **A identidade:** o ícone e os textos novos também entram no protótipo.
2. **Separar motor de moldura.**
   - **O que só mexe no motor pode andar já,** porque não depende do protótipo: desempenho, L1 (gravar o progresso quando a leitura para), L4 (regras de pareamento), a parte de motor da E14 e da E15, e a busca da E12 sem a interface.
   - **O que mexe na moldura espera o protótipo.**
3. **A interface `Network` da extensão faz parte das fundações.** A etapa 1 já prevê "interfaces de abrir, guardar e **buscar** em `platform/`". A `Network` do PR #1 (`fetch` quando o CORS deixa, a ponte quando existe e, no futuro, o HTTP nativo do Android) é exatamente a peça de "buscar". Então a primeira parte do PR #1 entra junto com as fundações, e a interface da extensão espera os Catálogos.
4. **As decisões de privacidade andam juntas.** Três itens pedem a mesma conversa sobre a regra 2 do `CLAUDE.md`:
   - as fontes pela extensão (E4.1);
   - as capas buscadas na internet (C6, ainda aberto, e E4.4, capas pelo AniList);
   - o GoatCounter (G20).

   Vale uma sabatina única.

5. **O app Android depende das fundações.** A interface de arquivos já nasce com "cópia interna ou referência a um arquivo de fora" (a pasta da biblioteca). O armazenamento assíncrono troca para SQLite sem mudar o resto. Começar o Android antes da etapa 1 seria refazer trabalho.
6. **O ícone (D10) muda uma regra.** O `CLAUDE.md` diz "não adicionar logo ou ícone até o Artur pedir". Agora ele pediu, então o ícone entra na frente 2 e a regra é atualizada quando a direção do ícone for aprovada.
7. **O desempenho ajuda a biblioteca.** O P3 (CBZ sem recompressão) e o P5 (despejo por distância) deixam as capas e as miniaturas da grade mais baratas. Melhor terminarem antes da etapa 2.

## 3. Decisões que destravam o resto

**Pré-propostas (20/10/2026):** D1, D2, D3 e D5 já têm recomendação em `pauta-decisoes.md`, para o Artur confirmar ou mudar. Também há rascunhos da spec das fundações (`spec-fundacoes.md`) e do pedido do protótipo v2 (`prototipo-v2-pedido.md`).

| #   | Decisão                                                                                                                                                                                                                        | Destrava                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| D1  | ✅ **Revisão conjunta dos estudos** (o "quando começar" da biblioteca). Decidida em 20/10/2026: começar as fundações já                                                                                                        | Etapa 1 da biblioteca                       |
| D2  | **Sabatina de privacidade:** regra 2 (fontes pela extensão), capas da internet, GoatCounter                                                                                                                                    | Frente 4, a parte de capas da etapa 2, G20  |
| D3  | **Triagem dos candidatos L1–L12 (leitor) e F1–F8 (fontes)** do `estudo-mihon.md` §8. ✅ L1–L12 em 20/10/2026; F1–F8 vão com a D2                                                                                               | A frente 5 e o desenho da frente 4          |
| D4  | ✅ **Direção do ícone e do tom dos textos** (início da frente 2). Decidida em 20/10/2026: monograma F e os textos de `identidade-visual.md`                                                                                    | Protótipo v2, README, página da organização |
| D5  | ✅ **O PR #1** (decidida em 20/10/2026: a `Network` refeita nas fundações, a extensão no branch até Catálogos e a D2): mesclar em partes (a `Network` nas fundações, a extensão depois) ou fechar e refazer a partir do estudo | Frente 4                                    |

## 4. A ordem proposta

### Onda 0: agora

- **Versão 0.1.0** (20/10/2026): o leitor de hoje com os ganhos de desempenho, publicada antes do redesign. Dela em diante, a raiz do site é a versão estável e a `main` vai para a prévia em `/next/` (`versionamento.md`).

- **Desempenho (frente 1):** os passos da A2, já em andamento.
- **Decisões:** D1, D2, D3 e D4, cada uma numa conversa curta ou sabatina. A ordem sugerida está em `pauta-decisoes.md`: D3 (leitor), D1 + D5, e por fim D2 com F1–F8.
- **Identidade (frente 2), sem código:**
  - explorar o ícone;
  - revisar os textos (C8);
  - desenhar o **protótipo v2** no Claude Design, com as telas de `estudo-interface.md` §8 e as mudanças de moldura do leitor listadas no §2.

### Onda 1: fundações

- **Biblioteca, etapa 1:**
  - armazenamento assíncrono + migração;
  - cópia no OPFS;
  - identidade do livro e tombo;
  - rotas com histórico;
  - interfaces de `platform/`, **incluindo a `Network` do PR #1**;
  - cortes de tela;
  - exportar/importar em JSON.
- **Leitor, só motor (aprovados na D3):** L1 (gravar o progresso quando a leitura para, que já cai no armazenamento novo) e L4 (pareamento por proporção).
- **Som de virar página (E13):** trilha própria e pequena, que pode andar assim que as fundações começarem (pedido do Artur em 20/10/2026). O motor acompanha a virada; o protótipo v2 só ganha o liga/desliga.
- **Identidade:** o protótipo v2 continua em paralelo até ser aprovado.

### Onda 2: o acervo aparece

- **Biblioteca, etapa 2:**
  - Acervo, Catálogos (exemplos) e Mais;
  - capas e selos;
  - exemplar ausente;
  - ficha como página;
  - remover com desfazer;
  - o aviso "Do início".
- **Moldura do leitor, como no protótipo:** o "⋯" no celular, o slider na barra normal (B2) e a grade de miniaturas em pares.
- **Identidade aplicada:**
  - ícone no PWA e no favicon;
  - splash do iOS (D11);
  - textos novos (C8);
  - os carimbos no "Sobre" (C9);
  - README, README.en, descrição do repositório e página da organização com o ícone e capturas de tela.

### Onda 3: organizar e buscar

São três trilhas que podem andar ao mesmo tempo, cada uma em seu worktree:

- **Biblioteca, etapa 3:** estantes, seleção, exibições, ordenar, filtrar, buscar, série, notas, capa escolhida.
- **Biblioteca, etapa 4:** Leituras, marcadores de página (fita + `B`), leitura sem registro. As marcas de capítulo no slider (B2) entram aqui, porque usam o mesmo trilho das fitas.
- **Fontes (frente 4):**
  - `CatalogSource` + cliente OPDS dentro de Catálogos;
  - a extensão (Chrome/Firefox, Firefox assinado no AMO), o userscript testado no iPad real;
  - limite de requisições e cache por site;
  - capas por catálogo de metadados, se a D2 deixar.

### Onda 4: tablet e Android

- **Biblioteca, etapa 5:** dois painéis a partir de 1024px.
- **App Android (frente 6):**
  - Capacitor ou TWA;
  - a pasta da biblioteca;
  - SQLite;
  - ícones e splash nativos;
  - HTTP nativo para as fontes (F8), sem precisar da extensão.

### Depois, por vontade

Cada item é escolhido quando der vontade, e cada um mexe na moldura de um jeito pequeno, que se encaixa na linguagem já aprovada:

- **Leitor:**
  - busca no PDF (E12);
  - rolagem vertical/webtoon (E15, com a técnica de faixas do Mihon);
  - painel Paginação (E14);
  - voz alta (E2);
  - controles na sobra lateral (B2);
  - os demais L aprovados.
- **Extras:** 3D (E16), temas Cordel/HQ/mangá (E17), exportar flipbook (E18). O som (E13) subiu para a onda 1.
- **Desempenho:** P7, P2 e P8–P10, se as medições pedirem.
- **Se houver demanda:** G20–G22.

## 5. Como trabalhar em paralelo

- **Cada trilha numa sessão própria, em worktree.** Ao terminar, sempre sugerir **limpar o worktree** e o branch (`CLAUDE.md`).
- **Mudanças no repositório inteiro** (renomear, mover, trocar endereço) só quando nenhuma outra sessão estiver ativa.
- **Arquivos com dono:** duas trilhas não mexem nos mesmos arquivos ao mesmo tempo.
  - Na onda 3, as etapas 3 e 4 tocam em telas diferentes (Acervo × Leituras e leitor), mas dividem os componentes novos. Quem cria um componente o publica na `main` primeiro.
  - A trilha de fontes mexe em Catálogos e em `src/sources/catalog/`.
