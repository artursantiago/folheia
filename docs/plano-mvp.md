# Folheia — Plano do MVP

> Resultado da entrevista de escopo (19/10/2026). Cada item abaixo foi decidido explicitamente; o que não está aqui não entra no MVP.

## 1. Produto

**Leia livros, HQs e mangás folheando, como no papel.**

O Folheia é um **acervo de leitura pessoal**: livros, quadrinhos, mangás e revistas num lugar só, lidos folheando, página a página. Virar a página é o jeito Folheia de ler, não o produto em si. A partir de 20/10/2026 o app deixa de ser "um leitor de PDF e CBZ em flipbook" e passa a ser esse acervo (ver `estudo-interface.md` e `roteiro.md`).

100% gratuito, estático, hospedado no GitHub Pages. Todo o processamento roda no navegador; **o arquivo do usuário nunca sai do aparelho**. Licença **MIT**. Formatos hoje: PDF e CBZ (ou ZIP de imagens).

- Nome: **Folheia** (livre no npm e no GitHub; sem marca conhecida com esse nome).
- Repositório: `folheia-app/folheia` (público, na organização `folheia-app` desde 20/10/2026; antes `artursantiago/folheia`). Site: `https://folheia-app.github.io/folheia/`.

## 2. Decisões de escopo e design

| #   | Tema                   | Decisão                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Efeito de página       | **2D** no MVP (dobra de canto com recorte + sombras em gradiente). Motor isolado atrás de uma interface para um **3D (three.js)** entrar depois.                                                                                                                                                                                                                                                                                                                                                                   |
| 2   | Identidade visual      | Tema padrão **"Ex-libris"**: linguagem de biblioteca (fichas catalográficas, números de tombo, bordas picotadas de cartão de empréstimo, números e metadados em fonte de máquina de escrever, títulos em serifa). **Claro** com a paleta Ateliê (papel, tinta, terracota) e **escuro** com a paleta Sebo à noite (azul-noite, "luz de abajur" atrás do livro, latão). Escuro como padrão; segue o sistema; alternável. Sem logo ou ícone por enquanto. Tudo via _design tokens_ (variáveis CSS) para outros temas. |
| 3   | Idiomas                | Interface em **PT-BR e EN** (i18n próprio tipado; detecção pelo navegador; seletor). README em português + `README.en.md` curto.                                                                                                                                                                                                                                                                                                                                                                                   |
| 4   | Página única/dupla     | Automático **pelo espaço disponível** + botão para forçar (lembrado). **Capa isolada** por padrão, desligável. Parâmetros `?layout=single\|double` e `?cover=0`.                                                                                                                                                                                                                                                                                                                                                   |
| 5   | Barra de controles     | Anterior/próxima, primeira/última, "12–13 / 240" clicável (ir para página), zoom, tela cheia, abrir arquivo, **miniaturas**, **sumário do PDF**, menu **Ajustes** (layout, capa, tema, idioma, direção). Barra inferior que some após ~3 s; no celular, itens extras num menu "⋯".                                                                                                                                                                                                                                 |
| 6   | Exportar .zip          | **Fora do MVP** (backlog). A fonte de páginas é separada do motor de exibição, o que deixa o export barato no futuro.                                                                                                                                                                                                                                                                                                                                                                                              |
| 7   | Memória entre visitas  | **Lembrar onde parei** por arquivo (impressão digital do PDF / hash do CBZ) + ajustes globais. A oferta "Continuar da página 87?" aparece como uma ficha de empréstimo.                                                                                                                                                                                                                                                                                                                                            |
| 8   | Navegadores            | **Safari 18+ / iPadOS 18+** e as duas últimas versões de Chrome, Edge e Firefox. PDF.js 6.x (build _legacy_) isolado num único módulo. Navegador antigo vê a mensagem "navegador não suportado".                                                                                                                                                                                                                                                                                                                   |
| 9   | Interação de virada    | Clique/toque na borda, teclado, swipe e botões disparam a animação; **arrastar o canto** acompanha o dedo; hover no canto levanta a ponta (desligável). Uma única geometria, dirigida por um ponto de controle. `prefers-reduced-motion` troca a dobra por um fade.                                                                                                                                                                                                                                                |
| 10  | Zoom                   | Botões, Ctrl/⌘ + rolagem, **pinça**, duplo toque/clique. Até **4x**. Nitidez por re-renderização **só da área visível** (um tile do tamanho da tela no MVP). Com zoom, arrastar move a página.                                                                                                                                                                                                                                                                                                                     |
| 11  | Tela inicial           | Área de soltar arquivo + botão + campo de URL + **carrossel horizontal de capas de exemplo**.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 12  | Exemplos               | 4 obras em domínio público (BR e EUA), carregadas do **Wikimedia Commons** (CORS ok), **nada no repositório**: _A Menina do Narizinho Arrebitado_ (1920), _O Mágico de Oz_ (1900), _Peter Pan_ ilustrado por Rackham (1912), _Alice_ ilustrada por Rackham (1907). A lista fica num único arquivo de configuração. Capas geradas no navegador a partir da 1ª página e guardadas em cache.                                                                                                                          |
| 13  | PWA                    | Instalável e offline para arquivos locais: manifesto, cache só dos arquivos do build, aviso de "nova versão disponível", `file_handlers` onde houver suporte (Chrome/Edge desktop). Exemplos não são pré-carregados.                                                                                                                                                                                                                                                                                               |
| 14  | Texto e acessibilidade | **Camada de texto invisível** nas páginas paradas: seleção, cópia, VoiceOver e **links do PDF clicáveis**. Navegação por teclado, ARIA, foco visível.                                                                                                                                                                                                                                                                                                                                                              |
| 15  | Métricas               | **Nenhuma.** Zero requisições externas além dos exemplos (e só quando você clica em um). Botão "Copiar diagnóstico" para abrir issues.                                                                                                                                                                                                                                                                                                                                                                             |
| 16  | Convenções             | Código, comentários e commits em **inglês** (Conventional Commits). Commits direto na `main`; o CI (lint, tipos, testes, build) bloqueia o deploy se falhar.                                                                                                                                                                                                                                                                                                                                                       |
| 17  | Página única: virada   | Dobra de canto revelando a próxima página por baixo; o verso da parte dobrada é **cor de papel**.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 18  | Spreads em PDF         | **Detecção automática** de páginas duplas (miolo ≥ ~1,5× mais largo que a capa) com divisão em duas páginas lógicas, mais um aviso discreto.                                                                                                                                                                                                                                                                                                                                                                       |
| 19  | RTL                    | Leitura da direita para a esquerda pelos Ajustes, por `?dir=rtl`, pelo campo `Direction` do PDF e pelo `Manga=YesAndRightToLeft` do CBZ.                                                                                                                                                                                                                                                                                                                                                                           |
| 20  | Deep link              | Página no hash (`#p=42`) sem poluir o histórico + botão **Compartilhar** (Web Share / copiar link), visível só para arquivos vindos de URL.                                                                                                                                                                                                                                                                                                                                                                        |
| 21  | Senha                  | Diálogo de senha para PDF protegido (a senha fica só na memória). Mensagens próprias para arquivo corrompido, arquivo que não é PDF/CBZ, arquivo vazio e falta de memória.                                                                                                                                                                                                                                                                                                                                         |
| 22  | Formatos               | **PDF + CBZ** no MVP. **CBR/CB7**: detectados e respondidos com a mensagem "ainda não suportado, converta para CBZ", com instruções (ver §5).                                                                                                                                                                                                                                                                                                                                                                      |
| 23  | URL                    | Um único parâmetro: **`?file=https://...`** (formato detectado pelo conteúdo do arquivo).                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 24  | Spreads em CBZ         | Respeitar `DoublePage`/`FrontCover` do `ComicInfo.xml`; senão, usar a heurística de proporção. Spread desalinhado → **página em branco virtual** para realinhar.                                                                                                                                                                                                                                                                                                                                                   |
| 25  | Metadados              | Título no topo do leitor + **ficha catalográfica** no menu (título, autor, ano, páginas, formato, tamanho; no CBZ, série, número, volume e direção; nos exemplos, fonte e licença).                                                                                                                                                                                                                                                                                                                                |

### Identidade visual (requisito)

A identidade é um **ponto forte do produto**: bater o olho e reconhecer "isso é o Folheia". Para isso não depender de disciplina, ela vira regra de engenharia:

- **Design system antes das telas.** Primeiro os _tokens_ (cor, tipografia, espaçamento, raio, borda, sombra, movimento) e um conjunto pequeno de **componentes próprios** (botão, botão de ícone, campo, alternador, menu, diálogo, ficha catalográfica, carimbo/selo de texto, aviso, barra). Toda tela é montada **só** com esses componentes.
- **Uma assinatura que se repete:** bordas picotadas, ficha catalográfica, números em máquina de escrever, carimbos de data e página, "luz de abajur" no escuro. O mesmo vocabulário aparece em todo lugar: início, leitor, diálogos, erros, carregamento.
- **Voz própria nos textos** (PT e EN), coerente com a biblioteca: "Devolver à estante" em vez de "Fechar", "Ficha do livro" em vez de "Informações". Sempre claro antes de criativo.
- **Guardas automáticas:** o lint de CSS proíbe cores, fontes e tamanhos "soltos" fora do arquivo de tokens; uma página **`#/estilo`** (guia de estilo vivo) mostra todos os componentes nos temas claro e escuro.
- **Temas futuros** (Cordel, HQ, mangá) trocam só os _tokens_ e as texturas da assinatura. A estrutura dos componentes é a mesma.
- **Ponto de aprovação:** antes de implementar a UI, apresento o guia de estilo e protótipos navegáveis em HTML das telas-chave (início com carrossel, leitor em página dupla, leitor no celular, ficha e diálogos) para você aprovar.
- Registro em `docs/identidade-visual.md`: princípios, vocabulário visual, voz e o que não fazer.

### Desempenho (requisito)

- Renderização preguiçosa: spread atual + 1–2 vizinhos; o resto é descartado (LRU com orçamento em pixels).
- Fila única de renderização com prioridade (atual > próxima > anterior > miniaturas), cancelável e **pausada durante a animação**.
- Prévia em baixa resolução primeiro, depois a nítida.
- DPR limitado a 2; ~5 MP por canvas no iOS; canvas zerado e liberado depois de convertido.
- Páginas fora da tela guardadas como imagem comprimida, em JPEG em todos os navegadores. O WebP saiu no P11 (20/10/2026): no Chromium ele custava 10–13× mais que o JPEG e quase não economizava espaço.
- PDF.js em Web Worker; PDFs por URL com _range requests_ (só baixa os bytes necessários).
- CBZ com leitura de acesso aleatório: só a imagem pedida é lida do arquivo, sem carregar o ZIP inteiro.
- **Metas:** 1ª página (prévia) em menos de 1,5 s e nítida em menos de 3 s; virada a ~60 fps; no máximo ~6 páginas nítidas mais as miniaturas vivas ao mesmo tempo; nenhum recarregamento forçado no iPad ao folhear 300 páginas pesadas com zoom de 4x. Régua de memória: iPads de 3–4 GB. Teste final no **iPad Air M1** do Artur.

## 3. Stack

| Peça            | Escolha                                                                                                                                                                                                                                                                       | Licença          | Motivo                                                                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build           | **Vite 8** + **TypeScript 6.0**, Node 24                                                                                                                                                                                                                                      | MIT / Apache-2.0 | TS fica na 6.0 porque o typescript-eslint ainda não suporta a 7.                                                                                         |
| UI              | **React 19** só na camada de interface (componentes do design system, telas, painéis), com **CSS Modules** lendo os tokens. O core (fontes, renderização, layout, virada, zoom, gestos) é **TypeScript puro**, sem React, e a UI se inscreve nele via `useSyncExternalStore`. | MIT              | Design system com muitos componentes, dois idiomas e dois temas; familiar para contribuidores. Animação e canvas ficam fora do ciclo de render do React. |
| PDF             | **pdfjs-dist 6.x** (build _legacy_, worker)                                                                                                                                                                                                                                   | Apache-2.0       | Referência do setor; _range requests_; texto, links e sumário.                                                                                           |
| CBZ             | **unzipit**                                                                                                                                                                                                                                                                   | MIT              | ~5 KB, acesso aleatório em Blob e por HTTP Range, entradas sem compressão sem cópia. Plano B: `@zip.js/zip.js` (BSD-3).                                  |
| Virada 2D       | **Implementação própria**                                                                                                                                                                                                                                                     | MIT (nosso)      | O StPageFlip (`page-flip`) está abandonado desde 2021 e tem bug de vazamento conhecido.                                                                  |
| PWA             | **vite-plugin-pwa** (Workbox)                                                                                                                                                                                                                                                 | MIT              | Service worker com aviso de atualização.                                                                                                                 |
| Fontes          | **Young Serif** (títulos) + **IBM Plex Mono** (números e metadados) + **Atkinson Hyperlegible Next** (textos de interface), **hospedadas no próprio site** via `@fontsource`                                                                                                  | OFL / MIT        | Nenhuma requisição ao Google Fonts.                                                                                                                      |
| Qualidade       | ESLint (typescript-eslint), Stylelint (proíbe valores fora dos tokens), Prettier, **Vitest**, **Playwright** (Chromium/Firefox/WebKit)                                                                                                                                        | MIT / Apache-2.0 | CI bloqueante.                                                                                                                                           |
| Testes de carga | Gerador de PDF e CBZ sintéticos pesados (script de desenvolvimento, fora do bundle)                                                                                                                                                                                           | —                | 300 páginas com "fotos", sem arquivos pesados no Git.                                                                                                    |

Removidos da sugestão inicial: **page-flip** (abandonado) e **JSZip** (o export saiu do MVP; para leitura, o unzipit é melhor).

## 4. Arquitetura

```
src/
  sources/     PageSource (interface) → PdfSource (pdf.js), CbzSource (unzipit + ComicInfo)
  render/      fila priorizada, cache LRU com orçamento, níveis de resolução, tile de zoom
  layout/      modelo de spreads: única/dupla, capa, RTL, spreads detectados, páginas em branco virtuais
  flip/        FlipEngine (interface) → Flip2D (dobra de canto por ponto de controle)
  viewer/      palco, zoom/pan, camada de texto e links, gestos
  ui/          início + carrossel, barra, miniaturas, sumário, ajustes, ficha, diálogos
  i18n/        dicionários pt-BR / en tipados
  theme/       tokens do tema Ex-libris (claro/escuro)
  storage/     preferências e posição de leitura (localStorage)
  examples.ts  lista de exemplos (título, autor, ano, idioma, URL, fonte, licença)
```

Fronteiras-chave: **fonte de páginas ↔ renderização ↔ layout ↔ efeito de virada ↔ UI**. Elas permitem plugar depois o 3D, o export, a biblioteca local, a rolagem vertical (webtoon) e novos formatos sem reescrever o core.

## 5. CBZ: detalhes adotados

- Ordem das páginas por **ordenação natural** do caminho completo (`Intl.Collator` numérico). O `ComicInfo.xml` serve só para atributos.
- Ignorar `__MACOSX/`, `._*`, `.DS_Store`, `Thumbs.db`, `desktop.ini` e arquivos que não são imagem. Formato identificado pelos _magic bytes_, não pela extensão.
- `ComicInfo.xml`: `Manga=YesAndRightToLeft` → RTL; `Pages/Page` com `FrontCover`, `DoublePage` e `Deleted` (excluídas ficam ocultas).
- Páginas de tamanhos diferentes: encaixadas num palco com a proporção da mediana, sem esticar.
- Formato de imagem sem suporte no navegador (ex.: JPEG XL no Edge): aviso **naquela página**, sem derrubar o livro.
- Tiras de webtoon (proporção > ~3:1): aviso "modo rolagem vertical ainda não disponível".
- ZIP com senha: mensagem de não suportado.
- **CBR/CB7:** fora do MVP. A única biblioteca com licença compatível está parada, tem falhas de segurança conhecidas e carrega o arquivo inteiro na memória (incompatível com o iPad). O unRAR não é open source e o 7-Zip é LGPL. Detectamos pelos _magic bytes_ e mostramos instruções para converter em CBZ.

## 6. Preparação para app nativo (Capacitor), sem instalá-lo agora

O empacotamento como app (APK Android primeiro, depois iOS) com **Capacitor** (MIT) fica no backlog. O MVP já nasce compatível, para essa etapa ser só configuração:

- **Caminho base configurável:** `/folheia/` no GitHub Pages e `./` no app. Nenhum caminho absoluto fixo no código.
- **Navegação só por hash e estado local:** nada depende de servidor (já é assim).
- **Camadas de plataforma isoladas:** abrir arquivo (hoje input/arrastar; no app, seletor nativo e "Abrir com" do Android), compartilhar (Web Share → plugin Share), armazenamento (localStorage → Preferences/Filesystem), buscar por URL (no app, HTTP nativo, que contorna CORS) e tela cheia. Cada uma atrás de uma interface pequena, com a versão web no MVP.
- **Service worker só na web:** o build do app desliga o PWA (os arquivos já vêm no pacote).
- **Pronto para telas de celular:** `env(safe-area-inset-*)` para entalhes, alvos de toque de pelo menos 44 px, e o botão Voltar do Android tratado como "fechar painel ou diálogo" antes de sair.
- **Atenção registrada:** o pdf.js 6 exige um WebView Android recente (equivalente ao Chrome 125+). Aparelhos com WebView desatualizado verão a mensagem "navegador não suportado".

## 7. Etapas (commits pequenos, deploy a cada push na `main`)

> **Status (20/10/2026):** etapas 1 a 11 concluídas e publicadas. Falta a 12: o teste no iPad Air M1 real (os testes automatizados com WebKit e iPad/iPhone emulados passam). Ajustes feitos durante a implementação estão logo abaixo.

1. **Fundação:** Vite + TS, lint, testes, LICENSE MIT, README PT + EN, `docs/`, CI + deploy no GitHub Pages via Actions → criar o repositório público, push, confirmar o site no ar.
2. **Identidade e design system:** tokens, fontes, componentes base, guia de estilo `#/estilo`, `docs/identidade-visual.md` e protótipos das telas-chave → **sua aprovação** antes de seguir para a UI.
3. **Motor de páginas PDF:** PdfSource em worker, fila, cache, prévia → nítida, orçamento de memória e geradores de PDF de teste.
4. **Layout:** única/dupla, capa, spreads detectados, RTL, páginas em branco virtuais.
5. **Flip2D:** animação, arraste, ponta no hover, página única com verso cor de papel, movimento reduzido.
6. **Navegação e UI:** barra, teclado, swipe, ir para página, primeira/última, tela cheia, miniaturas (lista virtual), sumário, ajustes, i18n e tema Ex-libris claro/escuro.
7. **Zoom:** gestos + tile da área visível + pan.
8. **Texto e links:** camada de texto e links internos/externos.
9. **Início e fluxo de arquivos:** soltar/abrir, `?file=` com tratamento de CORS, carrossel de exemplos, senha, erros, diagnóstico, hash `#p=`, compartilhar, "continuar de onde parei", ficha catalográfica.
10. **CBZ:** CbzSource + ComicInfo + detecção de CBR/CB7.
11. **PWA.**
12. **Verificação de desempenho:** Playwright nos 3 motores + teste no iPad Air M1 (Web Inspector) contra as metas.

### Ajustes feitos durante a implementação

- **Capas do carrossel tipográficas** (cor, título, autor, ornamento desenhados por nós), em vez de geradas a partir do PDF: assim a tela inicial não faz nenhuma requisição externa. O PDF do Commons só é baixado quando o livro é aberto.
- **Toque e clique viram a página só nas bordas** (30% de cada lado); o meio fica para duplo toque (zoom) e para selecionar texto com o mouse. Com o mouse, o arraste de virada começa perto das bordas; no toque, em qualquer lugar.
- **Ícone do app provisório** (uma ficha catalográfica em branco, sem letra nem símbolo), até existir um logo.
- **Fontes Liberation do PDF.js não são publicadas** (licença GPL); o PDF.js usa as fontes do sistema para fontes padrão não embutidas.
- **Range requests próprios para URLs**: servidores como o Wikimedia não expõem `Accept-Ranges` via CORS; sem isso, o PDF.js baixava o arquivo inteiro (Peter Pan: ~2 MB baixados para abrir, em vez de 30 MB).
- **Viradas rápidas se acumulam**: três toques seguidos viram três páginas.

## 8. Backlog

> Reescrito em 20/10/2026 depois do primeiro teste do Artur no iPad Air M1 (PWA instalado) e no navegador. Cada item é para ser **sabatinado numa sessão própria** antes de implementar. As notas técnicas são pistas do que provavelmente causa cada problema, não decisões.
>
> **A ordem entre as seções está em `roteiro.md`** (frentes, ondas e as decisões que destravam cada uma).

### A. Correções vistas no teste (feito em 20/10/2026)

Sabatinadas e implementadas na mesma sessão. O que foi decidido:

1. **Barra de status do iPad por cima do app (PWA).** Feito.
   - **iOS:** o estilo da barra passou de `black-translucent` para `default`. Com `black-translucent`, o texto da barra é sempre branco e some no tema claro.
   - **Android:** a barra pega a cor do `theme-color`, que já acompanha o tema escolhido no app (claro ou escuro forçado).
   - **Safe areas:** início, telas de status e gaveta do índice respeitam as safe areas (o leitor já respeitava). Continua `viewport-fit=cover`, por causa do notch do iPhone e da barra de gestos do Android.
   - Com o tema forçado diferente do sistema, a barra do iOS segue o sistema. Não há como controlar.
2. **"Piscada" ao virar e ao ficar nítida.** Feito.
   - **Causa principal:** o Flip2D recriava todos os `<img>` no começo e no fim de cada virada, e cada imagem nova decodificava de novo, mostrando um quadro vazio.
   - **Agora:** as imagens são decodificadas fora da tela (`img.decode()`) e o **mesmo elemento** passa de um nó para outro (página parada → virando → parada).
   - **Troca de versão:** uma imagem melhor só substitui a atual depois de decodificada.
   - **Vizinhos:** o spread anterior e os dois seguintes ficam decodificados de antemão (a lição do Internet Archive).
3. **Lentidão e "folha de caderno" ao virar.** Feito.
   - **Placeholder:** papel liso; o número da página aparece em fade só se a espera passar de 300 ms (`--delay-waiting`).
   - **Janela:** nítidas no spread atual, nos **dois** seguintes e no anterior; prévias de ±6 páginas.
   - **Prévia derivada da nítida:** numa HQ, a prévia custa quase o mesmo que a nítida (~400 ms cada), porque o caro é o PDF.js decodificar a imagem da página, não o tamanho da saída. O renderer mede o custo das duas. Quando a prévia não compensa, cada página da janela nítida é renderizada **uma vez**, e a prévia sai da própria nítida, reduzida (~5 ms). Em PDFs de texto continua prévia primeiro.
   - **Degraus de escala:** as nítidas usam degraus fixos (×1,25, constante `SCALE_STEP`) com a regra "nunca piorar". Uma versão igual ou maior que a necessária é reaproveitada, e uma menor fica na tela até a nova chegar. Comparado com potências de 2 (como no Internet Archive), o ×2 não economizou nenhuma renderização e usou até ~80% mais pixels:

     | Situação (iPad horizontal emulado, DPR 2) | ×1,25             | ×2                |
     | ----------------------------------------- | ----------------- | ----------------- |
     | Abrir                                     | 6 render., 8,8 MP | 6 render., 9,7 MP |
     | Entrar no imersivo                        | 2, 2,9 MP         | 2, 3,2 MP         |
     | Sair do imersivo                          | 0                 | 0                 |
     | Girar para vertical                       | 4, 14,3 MP        | 4, 25,8 MP        |

   - **Folha que vira:** saiu o `filter: drop-shadow` (recalculado a cada quadro).
   - **Codificação:** custa 10–40 ms por página no Chromium, então `ImageBitmap` e o worker de codificação (opções b e c da sabatina) **ficaram de fora**. Só voltam se a medição no iPad real mostrar que a codificação pesa.
   - **Linha de base de abertura (20/10/2026)**, com `fixtures/personal/invincible-vol-1.pdf` (HQ real, 100 MB) no `e2e/engine.spec.ts` (`FOLHEIA_FIXTURE=...`). A HQ real é 2 a 3 vezes mais lenta que o PDF sintético.

     | Navegador    | 1ª prévia (antes → depois) | 1ª nítida (antes → depois) |
     | ------------ | -------------------------- | -------------------------- |
     | Chromium     | 1190 → 1041 ms             | 2008 → 1821 ms             |
     | WebKit       | 886 → 842 ms               | 1620 → 1548 ms             |
     | iPad emulado | 858 → 864 ms               | 1574 → 1586 ms             |

   - **Métrica de virada**, mesma HQ, `e2e/flip.spec.ts`. Ela usa o leitor de verdade e vira páginas pelo teclado em dois ritmos:
     - **leitura:** 12 viradas, uma a cada 1,8 s;
     - **apressado:** 10 viradas, uma a cada 0,45 s.

     A cada quadro, o teste anota o que cada página mostra (nítida, prévia ou nada). "Fim" é o estado quando a virada termina. "Vazio na virada" conta os quadros em que alguma página em movimento estava sem imagem.

     | Navegador    | Ritmo     | Fim: nítida / prévia / nada | Até ficar nítida (mediana) | Vazio na virada        |
     | ------------ | --------- | --------------------------- | -------------------------- | ---------------------- |
     | Chromium     | leitura   | 6/4/2 → **12/0/0**          | 300 → **0 ms**             | 108 → **0** (de ~457)  |
     | Chromium     | apressado | 0/2/8 → 1/1/8               | 1383 → 900 ms (a última)   | 199 → 198 (de 312)     |
     | WebKit       | leitura   | 12/0/0 → 12/0/0             | 0 → 0 ms                   | 0 → 0                  |
     | WebKit       | apressado | 0/2/8 → 1/1/8               | 1200 → 799 ms              | 168 → 168 (de 263)     |
     | iPad emulado | leitura   | 12/0/0 → 12/0/0             | 0 → 0 ms                   | 0 → 0                  |
     | iPad emulado | apressado | 0/3/7 → **3/4/3**           | 701 → **0 ms**             | 148 → **44** (de ~255) |
     - O WebKit headless não mostra o quadro vazio de decodificação que aparece no iPad real: lá, `img.complete` já é verdadeiro antes da pintura. O Chromium mostra, e foi onde a piscada sumiu.
     - A fluidez não dá para comparar no WebKit headless, que já fica em ~20 ms por quadro parado.
     - **Apressado em página dupla:** fica limitado pela regra de pausar a fila durante a virada. Com viradas emendadas, quase não sobra tempo de renderizar, e ~400 ms por página não cabem.
4. **Ponta e sombra secas.** Feito.
   - A ponta sobe até a espiada em 180 ms com desaceleração e desce do mesmo jeito.
   - **No toque**, um dedo perto do canto levanta a ponta do mesmo modo. Arrastar ou tocar continua dali, sem voltar a ficar plana.
   - As sombras da dobra crescem com a dobra e voltam a zero quando a folha assenta.
   - A espiada na capa sozinha não desliza mais o livro inteiro para o lado.

### A2. Desempenho: próximos passos (ordem decidida depois do P0, 20/10/2026)

O P0 mediu onde o tempo vai (`estudo-mihon.md` §6.5). Numa HQ em PDF, 90–99% do render é o PDF.js decodificar as imagens embutidas (~170 ms por página); pintar e guardar custa pouco. A ordem abaixo segue a recomendação do P0, e cada passo é uma melhoria separada, com medição antes e depois (`e2e/flip.spec.ts` e `e2e/engine.spec.ts` com a Invincible):

**Como foi medido (20/10/2026):** `e2e/engine.spec.ts` e `e2e/flip.spec.ts` com a Invincible em PDF (`FOLHEIA_FIXTURE=...`), mesma máquina do P0, um projeto por vez (`--workers=1`), e cada "antes" rodado do commit anterior numa cópia separada do repositório. Para o CBZ, as primeiras 160 páginas da mesma HQ exportadas em JPEG 0,9 a 1988×3058 (`fixtures/personal/`, fora do git). "Apressado" é o ritmo de 10 viradas a cada 0,45 s; "nítida depois" é quanto a última página leva para ficar nítida depois que a virada acaba.

1. **P11: JPEG também no Chromium.** Feito. As páginas guardadas são JPEG em todos os navegadores; o WebP saiu.
   - No Chrome de tela comum (1×) a página é pequena e quase não muda: 1ª nítida 1512 → 1503 ms.
   - No Chrome Retina (2×, 1440×900), onde a página tem o tamanho do P0:

     | Chrome Retina                     | Antes   | Depois  |
     | --------------------------------- | ------- | ------- |
     | 1ª nítida (`engine`)              | 1574 ms | 1450 ms |
     | Apressado: nítida depois (última) | 967 ms  | 683 ms  |

   - Não muda nada no iPad, que já usava JPEG.

2. **P1 + P5: menos página em branco ao virar rápido.** Feito.
   - **P1:** o motor da virada avisa da página nova **antes** de dizer que a virada acabou, então a fila volta a andar já com o plano novo. Com viradas enfileiradas, o plano passa para o spread que a próxima virada vai mostrar e segue na direção de onde as viradas vão parar.
   - **P5:** a cache nítida despeja a página mais longe do leitor (a ordem do plano: a da frente conta como mais perto que a de trás), não a usada há mais tempo. As páginas da virada em andamento ficam presas até ela assentar. Com JPEG, a cache quase nunca enche; o P5 protege o PNG do 18b e as páginas grandes.

     | Navegador    | Apressado: fim nítida / prévia / nada | Nítida depois | Vazio na virada      |
     | ------------ | ------------------------------------- | ------------- | -------------------- |
     | Chromium     | 1/1/8 → 1/1/8                         | 717 → 267 ms  | 198 → 198 (de 312)   |
     | WebKit       | 1/1/8 → 1/1/8                         | 652 → 227 ms  | 320 → 318 (de ~500)  |
     | iPad emulado | 3/4/3 → **10/0/0**                    | 0 → 0 ms      | 63 → **0** (de ~460) |

   - Leitura calma continua 12/12 nítidas em todos. Abrir não muda (1ª nítida 1250–1449 ms).
   - **Em página dupla (desktop), o apressado não melhora:** a fila fica pausada durante a virada, e com viradas emendadas só cabe um job entre uma e outra. Cada virada mostra duas páginas novas, então uma fica sempre em branco. Isso não depende do custo do render: no CBZ, com render de 16 ms, dá o mesmo 1/1/8. Quem resolve é o **P8** (deixar trabalhar durante a virada o que não pesa na thread principal); ler a imagem original de um CBZ seria o primeiro candidato.

3. **P3: CBZ sem recompressão.** Feito.
   - A imagem da página dentro do CBZ **é** a página nítida, sem decodificar, desenhar e comprimir de novo: sem perda, e o único custo que sobra é o navegador decodificar a imagem.
   - Vale para JPEG, PNG, WebP e AVIF de até `maxOriginalPixels`: **8 MP no iOS**, 16 MP no resto (uma HQ escaneada a ~2400 px de largura). Imagens maiores, ou em formatos que nem todo navegador abre (GIF, JXL, BMP), continuam pelo canvas.
   - Não faz mais prévia separada para as páginas nítidas (a original fica pronta antes). As miniaturas preferem a prévia.
   - CBZ da Invincible (1988×3058):

     | Navegador    | 1ª nítida (`engine`) | Apressado: fim nítida / prévia / nada |
     | ------------ | -------------------- | ------------------------------------- |
     | Chromium     | 101 → **16 ms**      | 1/1/8 → 1/1/8                         |
     | WebKit       | 223 → **60 ms**      | 1/1/8 → 1/1/8                         |
     | iPad emulado | 209 → **32 ms**      | 10/0/0 → 10/0/0                       |

   - **Memória:** a imagem original é decodificada inteira na tela. No iPad deitado, uma página dessas tem 6 MP (24 MB decodificada) contra 2,3 MP (9 MB) da nítida de antes. O leitor mantém decodificados até 4 spreads (o visível, 1 atrás e 2 à frente), então o pior caso sobe de ~72 MB para ~190 MB. É memória de imagem, fora do teto de canvas do iOS, mas **precisa ser conferida no iPad** (Web Inspector → Timelines → Memory). Se pesar, basta baixar `maxOriginalPixels` no iOS (abaixo dele, volta o caminho do canvas).

4. **18b: opção "qualidade máxima (sem perda)" em PNG.** Feito. Ver o item 18b, em E.
   - O `#/lab` ganhou o botão **Medir PNG sem perda (18b)** (`e2e/lossless.spec.ts` roda o mesmo no desktop, com `FOLHEIA_18B=1`). Ele mede, nos tamanhos do iPad, quanto o `toBlob` JPEG e o PNG levam, **quanto travam a thread principal**, o tamanho e o tempo de decodificar.
   - No desktop (Invincible, mediana de 5 páginas):

     | Página (iPad)       | Chromium: JPEG / PNG                      | WebKit: JPEG / PNG                         |
     | ------------------- | ----------------------------------------- | ------------------------------------------ |
     | deitada (1221×1877) | 20 / 30 ms (trava 9 / 29), 407 / 1555 KB  | 26 / 70 ms (trava 26 / 70), 656 / 2173 KB  |
     | em pé (1803×2773)   | 39 / 55 ms (trava 22 / 30), 718 / 2374 KB | 45 / 85 ms (trava 45 / 85), 1209 / 2416 KB |

   - **No WebKit, o `toBlob` trava a thread principal o tempo todo** (a codificação não sai dela). O PNG custa +40–45 ms de trava por página nítida, além de 2–3× mais tempo para decodificar.
   - **No iPad Air M1** (Safari do iPadOS, site publicado em HTTPS, Invincible, 20/10/2026):

     | Página              | JPEG                               | PNG                                |
     | ------------------- | ---------------------------------- | ---------------------------------- |
     | deitada (1221×1877) | 32 ms (trava 32), 656 KB, dec. 13  | 68 ms (trava 68), 2173 KB, dec. 32 |
     | em pé (1803×2773)   | 53 ms (trava 53), 1209 KB, dec. 28 | 84 ms (trava 84), 2416 KB, dec. 52 |

     O render do PDF.js, frio, levou **1045 ms** por página no iPad (no Mac, ~160 ms). Perto disso, o PNG soma +31–36 ms de trava e +19–24 ms de decodificação: **3–5% a mais por página**. A trava só acontece com a fila andando, e a fila pausa durante a virada, então a animação não sofre.

   - **Decisão:** entra o PNG na cache nítida, sem o P2. O interruptor **"Qualidade máxima"** fica nos Ajustes, desligado por padrão e lembrado entre livros. O lugar final dele sai do protótipo v2 (`roteiro.md`).
   - **Como ficou:**
     - Ligado, as páginas nítidas do PDF e os tiles de zoom são guardados em PNG; as prévias continuam em JPEG.
     - O CBZ já é sem perda pelo P3.
     - Ao ligar, a página na tela é refeita em PNG, e a versão JPEG fica à vista até a nova chegar. Ao desligar, as páginas em PNG ficam como estão.
     - Nos 48 MB do iOS cabem ~20 páginas nítidas em PNG, e o plano segura 6–8.
   - **Achado do iPad:** o PDF.js leva ~1 s por página da Invincible no aparelho, 6,5× o Mac; no lab, a 1ª nítida saiu em 7,3 s. As emulações do Playwright subestimam bastante o iPad. Isso pesa a favor do **P4** (decodificar uma vez a página de HQ) e confirma o ganho do **P6** no zoom.

5. **P6: manter a página visível decodificada durante o zoom.** Feito.
   - Com zoom, as páginas do spread na tela ficam analisadas e decodificadas no PDF.js, e cada tile novo só pinta. Ao sair do zoom, virar ou fechar, elas são liberadas.
   - Só o spread visível e só enquanto há zoom: nessa hora os vizinhos já devolveram as imagens deles.
   - `e2e/zoom-tiles.spec.ts`: depois de cada arraste com zoom de 200%, quanto até todos os tiles novos chegarem (inclui os 220 ms que o zoom espera o gesto parar):

     | Navegador    | Antes  | Depois     |
     | ------------ | ------ | ---------- |
     | Chromium     | 890 ms | **270 ms** |
     | WebKit       | 767 ms | **276 ms** |
     | iPad emulado | 492 ms | **258 ms** |

     Tirando a espera fixa, o trabalho cai de 270–670 ms para 40–55 ms.

   - **Memória:** ~25–30 MB por página segurada (estimativa do P0), até 2 páginas. **A conferir no iPad.**

6. **Depois, só se ainda fizer falta:** P7 (`enableHWA` A/B), P2 (janela quente em bitmap), P8, P9, P10, na ordem do §6.5.
7. **Backlog: buscar adiantado os bytes das próximas páginas em PDF por URL** (visto no iPad em 20/10/2026, com os exemplos do Wikimedia). Hoje o app só pede os bytes de uma página quando vai desenhá-la, uma por vez. Assim rede e desenho nunca se sobrepõem.
   - **Medido:** cada pedaço de 256 KB do Wikimedia leva ~0,45 s; desenhar a página com os bytes já no aparelho leva ~150–250 ms (WebKit no Mac). No Simulator do iPad, cada página do Mágico de Oz ficou pronta em 1,2–1,8 s, e um spread inteiro em ~3 s. Quem vira antes disso vê o verso já pronto e a página da direita ainda em branco.
   - **Proposta (A, preferida):** pedir em paralelo, enquanto a fila desenha, os bytes das páginas que o plano já quer (~6 à frente). Baixa só o que está para ser lido.
   - **Alternativa (B):** baixar o arquivo inteiro em segundo plano depois de abrir. Mais simples, mas gasta dados: 17 MB no Mágico de Oz, 100 MB ou mais numa HQ.
   - Arquivos locais não têm esse custo.

**A confirmar no iPad Air M1** (PWA, em HTTPS):

- **18b:** no site publicado, abrir a Invincible no `#/lab`, avançar alguns spreads e tocar em **Medir PNG sem perda (18b)**. Mandar as linhas que aparecem (uma foto basta). Elas decidem se o PNG entra.
- **P3:** a memória com um CBZ grande no iPad deitado, virando páginas (Web Inspector → Timelines → Memory). Esperado: até ~190 MB de imagens.
- **P6:** a memória com zoom numa HQ em PDF, e se o zoom continua sem derrubar a página.
- **P1 + P5:** virar rápido (toques seguidos) numa HQ em pé deve terminar nítido quase sempre.
- **Correção das prévias repetidas (`515a522`, na `/next/`):** em livros escaneados vindos da rede, as próximas páginas devem ficar prontas um pouco antes.

- O zoom por pinça não derruba mais a página (corrigido em 20/10/2026; parecia ok no primeiro teste). Se cair de novo, conectar no Mac e ver o motivo no Web Inspector.
- O modo imersivo, depois de atualizar o PWA: barra do sistema some, barra fixa com slider, opção "some sozinha" nos Ajustes.
- A barra de status legível nos dois temas (talvez seja preciso reinstalar o PWA).
- No console: `typeof ImageDecoder` (se o Safari do iPadOS tem, PDFs com JPEG abrem 4–5× mais rápido).

### B. Leitura imersiva (feito em 20/10/2026)

5. **Modo imersivo, "só o livro".** Feito.
   - **Um botão só**, no lugar do de tela cheia. Ele tira o cabeçalho e as margens do palco e pede a Fullscreen API onde existe (iPad, Android, desktop). No iPhone, que não tem a API para páginas, fica só o layout. Sair da tela cheia pelo sistema também sai do modo.
   - **Lembrado** entre livros. Na reabertura não volta a tela cheia, porque o navegador exige um gesto.
   - **Barra:** a bolinha flutuante foi descartada, porque ficaria por cima do livro. No lugar dela, uma **faixa embaixo** com: sair, anterior, contador, **slider de páginas**, próxima, zoom (telas largas), índice e ajustes.
     - **Fixa** (padrão): reserva o espaço dela.
     - **"Some sozinha"** (opção nos Ajustes): o livro ocupa 100% e a barra flutua por cima. Some depois de 3 s; um toque no meio da página (que espera 250 ms para não confundir com o toque duplo do zoom) ou o mouse perto da borda de baixo traz de volta.
   - **Slider:** enquanto arrasta, só o rótulo muda; o salto acontece ao soltar. O marcador é uma fita de marcar página, e o slider inverte em livros da direita para a esquerda.
   - **Teclado:** `F` alterna, `Esc` sai. A ficha do livro fica nos Ajustes enquanto o cabeçalho está escondido.
   - Medido: num iPad na horizontal (1180 × 820), o spread de HQ passa de ~650 para ~750 px de altura (+15%).

### B2. Próximos passos da leitura imersiva

- **Controles na sobra lateral.** Depois de encaixar o livro, colocar os controles onde sobra espaço. Numa HQ em página dupla com o iPad na horizontal sobram ~57 pt de cada lado, e um trilho vertical ali não tira nada do livro. Quando não houver sobra lateral, a barra volta para baixo. Ficou para uma próxima fase.
- **Slider também na barra normal**, junto com uma revisão da barra do modo normal.
- Marcadores de capítulos (sumário do PDF) e de resultados de busca no trilho do slider (ver `estudo-referencias.md` §12.4).

### C. Tela inicial (prioridade média)

6. ~~**"Recentes" como conteúdo principal do início.**~~ **Substituído em 20/10/2026** pela biblioteca pessoal (seção C2, abaixo). As perguntas que estavam abertas aqui foram respondidas na sabatina do `estudo-interface.md`: copiar o arquivo por padrão, sem cota fixa; remover com desfazer; o livro sem arquivo fica no acervo como "exemplar ausente"; a capa sai da 1ª página e, sem ela, usa a capa tipográfica.
   - _Ainda aberto:_ buscar capa na internet (ex.: Open Library). Isso faz requisições externas e conflita com a privacidade, então precisa de decisão explícita.
7. **Exemplos com menos destaque.** O carrossel "Do acervo · obras em domínio público" está grande demais para o papel dele. A ideia é um acesso secundário, como um link ou botão "Ver exemplos" que abre só essa parte. O visual do carrossel em si ficou bom.
   - **Decidido (20/10/2026):** os exemplos vão para a seção **Catálogos** na etapa 2 da biblioteca (C2).
8. **Menos menções a "PDF e CBZ".** O texto aparece no cabeçalho, na frase de abertura e na área de soltar, além do README e da descrição do repositório. O certo é dizer uma vez, num lugar discreto, principalmente o "CBZ".
9. **Carimbos com menos ênfase.** O estilo do carimbo (`Stamp`) agradou e combina com a identidade, mas "Seu arquivo não sai deste aparelho" e "Domínio público" estão em destaque demais; privacidade não é o foco do app.
   - Manter o componente.
   - Rever onde ele aparece. Por exemplo: privacidade só no "Sobre" ou numa linha pequena; "domínio público" só na ficha do livro.
   - **Decidido (20/10/2026):** os carimbos vão para o "Sobre", em Mais, na etapa 2 da biblioteca (C2).

### C2. Biblioteca pessoal (decidida em 20/10/2026)

O app deixa de ser só "abrir um arquivo" e vira um acervo pessoal, na linha do Mihon. O estudo e todas as decisões estão em **`estudo-interface.md`** (seções Acervo, Leituras, Catálogos e Mais). **Nada começa antes da revisão conjunta dos estudos que o Artur vai fazer.** Cada etapa passa por sabatina própria antes de ser implementada.

- **Etapa 0, protótipo v2:** as telas novas na linguagem Ex-libris (`estudo-interface.md` §8). Nenhum código. Anda em paralelo com a etapa 1.
- **Etapa 1, fundações:**
  - armazenamento assíncrono (IndexedDB) + migração do `localStorage`;
  - cópia dos arquivos no OPFS;
  - identidade do livro (CBZ pelo diretório central do ZIP) e tombo;
  - rotas com histórico (Voltar);
  - interfaces de abrir, guardar e buscar em `platform/`;
  - tokens de corte de tela (600px e 1024px);
  - exportar/importar o acervo em JSON.

  A mudança para a organização `folheia-app` vem **antes** desta etapa ir para a `main` (§9).

- **Etapa 2, acervo mínimo:** o Acervo como tela inicial, com Catálogos (exemplos) e Mais. Tocar na capa retoma direto e mostra o aviso "Do início"; o cartão "Continuar?" sai. Entram também os selos, o exemplar ausente, "Guardar no acervo" para URL, a ficha como página, remover com desfazer e o "⋯" do leitor no celular. Substitui o item 6 e resolve os itens 7 e 9. Só começa com o protótipo v2 aprovado.
- **Etapa 3, organização:** estantes, seleção em lote, as três exibições (capas é o padrão), ordenar (última leitura é o padrão), filtrar, buscar, série, notas e capa escolhida.
- **Etapa 4, Leituras e marcadores:** a seção Leituras (sem tempo de leitura), os marcadores de página (fita + `B`) e a leitura sem registro (modo global). Independente da etapa 3.
- **Etapa 5, tablet:** dois painéis (acervo + ficha) a partir de 1024px.
- **Fora das etapas, se houver vontade:**
  - estatísticas ("relatório da biblioteca");
  - pilha de volumes de uma série na grade;
  - busca com campos (`autor:`, `serie:`);
  - seção própria para marcadores;
  - OPDS e fontes, como itens próprios (`estudo-mihon.md` §8.4).

### D. Identidade (prioridade média)

10. **Ícone e logo do app.** O ícone atual (ficha em branco) é provisório.
11. **Splash screen.**
    - No PWA do iOS, o splash vem de `apple-touch-startup-image`, uma imagem por tamanho de tela. No Android, vem das cores do manifesto.
    - O Capacitor também vai precisar de um (`@capacitor/splash-screen`).

### E. Recursos de leitura (prioridade normal)

12. Busca de texto no PDF (a camada de texto já existe).
13. Som de virar página (asset próprio).
14. Painel **Paginação**: interruptor manual de spreads + "deslocar uma página".
15. Modo **rolagem vertical** (webtoon e PDF).
16. Efeito **3D** (three.js, carregado sob demanda).
17. Temas alternativos: **Cordel**, HQ, mangá.
18. Exportar flipbook autônomo (.zip).
    18b. **Opção "qualidade máxima (sem perda)"**, desligada por padrão; o padrão continua o de hoje (JPEG). Pedida pelo Artur em 20/10/2026, depois da comparação de qualidade com a Invincible: a diferença é pequena, mas visível nos traços.
    - **Feito em 20/10/2026, em PNG** (medição do iPad e decisão em A2, item 4). O texto abaixo é o estudo que levou a ela.
    - **Como fazer sem perda:** não recomprimir. JPEG 1,0 ainda perde um pouco e ocupa 2–3× mais no cache. A saída é o **P2** do `estudo-mihon.md` §6.5: a janela quente (spread visível + vizinhos) fica como bitmap descomprimido, exibido num canvas `bitmaprenderer`, e só o que sai da janela é comprimido. No CBZ, o **P3**: o arquivo original é o cache, sem nenhuma recompressão.
    - **Memória:** uma página decodificada custa o mesmo num `<img>` ou num bitmap (largura × altura × 4 bytes: na Invincible no iPad, 8,7 MB por página do spread deitado e 19,1 MB em pé, medido no P0). O risco é segurar páginas demais, não o formato. As defesas:
      - orçamento explícito de pixels descomprimidos (no iPad, cerca de 3 spreads), com despejo por distância (**P5**) e as páginas da virada presas;
      - durante o zoom, só o spread visível (já é assim);
      - zerar o canvas de toda página que sai;
      - se o navegador recusar um canvas (o `getContext` volta nulo no iOS quando o teto de memória de canvas estoura), voltar sozinho para o modo comprimido e avisar.
    - **Como os outros fazem:**
      - o **Mihon** decodifica direto do arquivo, já reduzido para a tela, sem recomprimir. Mantém 1 página decodificada de cada lado e despeja a mais distante;
      - o **BookReader** recebe do servidor imagens prontas em escalas fixas e não despeja nada: deixa a memória por conta do navegador, o que não serve para o iPad (`estudo-referencias.md` §12.2).
    - **O P0 mudou a recomendação (20/10/2026, `estudo-mihon.md` §6.5):** no PDF, o caminho mais seguro é **PNG na cache nítida**, sem o P2. A memória fica no modelo de hoje. Custa +56 ms de codificação e +20 ms de decodificação por página no WebKit, e 3–4× mais bytes (~22 páginas nítidas nos 48 MB do iOS, mais do que as 6–8 de hoje). No CBZ, o P3. O P2 só volta se o PNG ficar lento no iPad de verdade.
    - **Depende de:** triagem do Artur dos candidatos de desempenho do Mihon (§8 E3) e de medir o `toBlob` PNG no iPad real, em HTTPS. P3 e P5 também melhoram o modo padrão.

### F. App nativo (mais para frente)

19. **App com Capacitor**; ver §6.
    - **Tendência (20/10/2026): só Android**, com o APK instalado à mão (GitHub Releases, sem loja). O iPad continua no site/PWA. No iOS, sem a conta paga da Apple, o app expira a cada 7 dias (ver `estudo-mihon.md` §5.6).
    - A tela inicial precisa virar a **biblioteca pessoal** ("meus livros"), não só um site para abrir um arquivo.
    - Os dados do app (biblioteca, progresso) provavelmente vão para **SQLite** no aparelho (ex.: `@capacitor-community/sqlite`, MIT) e os arquivos para o Filesystem. A camada `src/platform/` já isola armazenamento, abrir arquivo e compartilhar.
    - Inclui splash e ícones nativos (itens 10 e 11).
    - **Biblioteca no Android (20/10/2026, `estudo-interface.md`):** a tendência é uma **pasta da biblioteca**, que o app lê sem copiar, como a fonte local do Mihon. O empacotamento (Capacitor ou TWA) e onde ficam os dados se decidem na fase do app.

### E2. Ideias vindas do Internet Archive

- **Leitura em voz alta** com a Web Speech API, que roda no aparelho, a partir da camada de texto do PDF.
- **Grade de miniaturas como modo de visualização** do livro, além da gaveta atual.

### E3. Ideias vindas do Mihon

Os candidatos estão em **`estudo-mihon.md` §8**, aguardando a triagem do Artur, que decide **se** e **como** cada um entra:

- leitor: L1–L12;
- desempenho: P0–P11. **P0 medido em 20/10/2026**, e a ordem dos próximos passos está na seção A2;
- interface e biblioteca: I0–I16. **Triados em 20/10/2026** e virados na seção C2;
- fontes e catálogos: F1–F8;
- plataforma e repositórios: O1–O2.

O que for aprovado entra nas seções certas deste backlog.

### G. Se houver demanda

20. GoatCounter (métricas sem cookies).
21. CBR/CB7 com build própria do libarchive (BSD-2).
22. Exemplo de HQ no acervo, **somente em domínio público** (ex.: _Little Nemo in Slumberland_, de Winsor McCay, falecido em 1934). Uma HQ protegida por direito autoral não pode entrar, mesmo que esteja num site público.

## 9. Ações externas depois da aprovação

- Criar o repositório **público** `artursantiago/folheia` com `gh` e fazer o push.
- Ativar o GitHub Pages com a fonte "GitHub Actions".
- ✅ **Feito em 20/10/2026:** o repositório foi para a organização `folheia-app` (o site agora está em `https://folheia-app.github.io/folheia/`). O endereço antigo **não redireciona** (dá 404), então o PWA do iPad precisa ser reinstalado pelo endereço novo. O PR #1 (extensão) veio junto e já responde no endereço novo. A organização ganhou o repositório `.github` com a página de apresentação. O que estava previsto:
- **Mudar o repositório para a organização `folheia-app`** (decidido em 20/10/2026, `estudo-interface.md`): depois da revisão conjunta dos estudos e **antes** de a etapa 1 da biblioteca (C2) ir para a `main`, para o acervo já nascer na origem nova. Só com nenhuma outra sessão trabalhando no repositório. Na hora:
  - conferir se o GitHub Pages redireciona o endereço antigo;
  - reinstalar o PWA do iPad. O endereço novo é outra origem, então preferências, progresso de leitura e o PWA instalado ficam na antiga e não passam para a nova;
  - trocar os links do site no `README.md` e no `README.en.md` (hoje `artursantiago.github.io/folheia`), atualizar o `git remote` das cópias locais e a descrição do repositório;
  - o caminho base já é relativo (`base: './'`), então o build não precisa mudar.
