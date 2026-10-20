# Folheia — Plano do MVP

> Resultado da entrevista de escopo (19/10/2026). Cada item abaixo foi decidido explicitamente; o que não está aqui não entra no MVP.

## 1. Produto

Leitor de **PDF e CBZ** em formato de livro (flipbook), 100% gratuito, estático, hospedado no GitHub Pages. Todo o processamento roda no navegador; **o arquivo do usuário nunca sai do aparelho**. Licença **MIT**.

- Nome: **Folheia** (livre no npm e no GitHub; sem marca conhecida com esse nome).
- Repositório: `artursantiago/folheia` (público). Site: `https://artursantiago.github.io/folheia/`.

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
- Páginas fora da tela guardadas como imagem comprimida (WebP onde houver _encoder_; JPEG no Safari, que não codifica WebP).
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

### A. Correções vistas no teste (prioridade alta)

1. **Barra de status do iPad por cima do app (PWA).** No modo instalado, a barra do sistema (hora, bateria) fica sobre o conteúdo, com blur.
   - _Pista:_ o `index.html` usa `apple-mobile-web-app-status-bar-style: black-translucent` com `viewport-fit=cover`, e o topo das telas (início e leitor) não reserva `env(safe-area-inset-top)`.
   - _Decidir:_ reservar o espaço (padding no topo) ou trocar o estilo da barra para `default`.
2. **"Piscada" quando a página fica nítida.** Ao virar, aparece a imagem, e depois ela pisca quando a versão melhor chega.
   - _Pista:_ a troca de prévia para nítida muda o `src` da mesma `<img>`, e o navegador mostra um quadro vazio enquanto decodifica.
   - _Ideia:_ decodificar a nova imagem fora da tela (`img.decode()`) e fazer um crossfade curto por cima da prévia.
3. **Lentidão e "folha de caderno" ao virar.** A sequência visível é: pauta de caderno (o placeholder de carregamento) → texto em baixa qualidade → nítida, depois de um tempo.
   - _Pistas:_ o placeholder com pautas (`.fx-page[data-loading]`) parece conteúdo errado. Hoje só 1 spread à frente é preparado em nitidez. Cada página nítida passa por canvas → WebP/JPEG → `<img>`, e esse ciclo de codificar/decodificar custa caro no iPad.
   - _Ideias:_
     - preparar 2 spreads à frente;
     - manter prévias de ±6 páginas;
     - mostrar a página visível direto como `ImageBitmap`;
     - codificar em um worker (`OffscreenCanvas`);
     - trocar o placeholder por papel liso.
   - _Medir antes e depois:_ no iPad real, com o Web Inspector.
4. **Ponta e sombra aparecem secas.** A ponta levantada no hover e as sombras da dobra surgem de uma vez, sem transição.
   - _Ideia:_ animar a ponta até a posição de "espiada" com easing e fazer as sombras crescerem conforme o tamanho da dobra.

### B. Leitura imersiva (prioridade alta)

5. **Modo "só o livro", em todos os dispositivos.** Além da tela cheia atual, um modo em que o livro ocupa a tela inteira: sem título, sem barra e sem as margens do palco. Num iPad na horizontal ou num notebook, as duas páginas usam todo o espaço e não é preciso ficar dando zoom.
   - Os controles saem de um **botão flutuante** (uma "bolinha"), que pode ser **arrastado** para um canto e abre todas as opções.
   - _Decidir:_
     - se é um ajuste persistente ou um botão;
     - como sair do modo;
     - se a bolinha some sozinha;
     - como combina com a API de tela cheia e com o PWA instalado.

### C. Tela inicial (prioridade média)

6. **"Recentes" como conteúdo principal do início.** Os livros abertos ficam guardados no aparelho e aparecem primeiro. Isso substitui o antigo item "biblioteca local + estante de lombadas"; a estante continua uma opção de visual.
   - **Capas:**
     - gerar a capa a partir da 1ª página do próprio arquivo, guardada localmente;
     - sem página utilizável, usar a capa tipográfica de hoje (título, ornamento, autor), que o Artur aprovou;
     - _Decidir:_ buscar capa na internet (ex.: Open Library) ou não. Isso faz requisições externas e conflita com a privacidade, então precisa de decisão explícita.
   - _Decidir:_
     - o que guardar (só metadados e a capa, ou o arquivo inteiro para reabrir sem escolher de novo);
     - quanto espaço usar;
     - como remover um livro;
     - o que fazer quando o arquivo original não existe mais.
   - _Técnica:_ IndexedDB/OPFS na web, atrás da camada `platform/` (ver item 19).
7. **Exemplos com menos destaque.** O carrossel "Do acervo · obras em domínio público" está grande demais para o papel dele. A ideia é um acesso secundário, como um link ou botão "Ver exemplos" que abre só essa parte. O visual do carrossel em si ficou bom.
8. **Menos menções a "PDF e CBZ".** O texto aparece no cabeçalho, na frase de abertura e na área de soltar, além do README e da descrição do repositório. O certo é dizer uma vez, num lugar discreto, principalmente o "CBZ".
9. **Carimbos com menos ênfase.** O estilo do carimbo (`Stamp`) agradou e combina com a identidade, mas "Seu arquivo não sai deste aparelho" e "Domínio público" estão em destaque demais; privacidade não é o foco do app.
   - Manter o componente.
   - Rever onde ele aparece. Por exemplo: privacidade só no "Sobre" ou numa linha pequena; "domínio público" só na ficha do livro.

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

### F. App nativo (mais para frente)

19. **App com Capacitor** (APK Android primeiro, depois iOS); ver §6.
    - A tela inicial precisa virar a **biblioteca pessoal** ("meus livros"), não só um site para abrir um arquivo.
    - Os dados do app (biblioteca, progresso) provavelmente vão para **SQLite** no aparelho (ex.: `@capacitor-community/sqlite`, MIT) e os arquivos para o Filesystem. A camada `src/platform/` já isola armazenamento, abrir arquivo e compartilhar.
    - Inclui splash e ícones nativos (itens 10 e 11).

### G. Se houver demanda

20. GoatCounter (métricas sem cookies).
21. CBR/CB7 com build própria do libarchive (BSD-2).
22. Exemplo de HQ em CBZ no acervo.

## 9. Ações externas depois da aprovação

- Criar o repositório **público** `artursantiago/folheia` com `gh` e fazer o push.
- Ativar o GitHub Pages com a fonte "GitHub Actions".
