# Folheia — Estudo de referências

> Data do estudo: 19/10/2026. Documento de trabalho: as observações descrevem conceitos e técnicas com palavras próprias. Nada aqui é código, CSS, nome de identificador ou nome de asset das referências.

---

## 1) Objetivo e regras do clean room

**Objetivo.** Entender como leitores de PDF em formato "flipbook" já existentes resolvem cinco problemas: renderização, animação de virar página, memória, layout e controles. A ideia é tomar decisões de arquitetura informadas para o Folheia, que é um leitor estático, só no navegador, publicado no GitHub Pages, feito com Vite + TypeScript e licenciado sob MIT.

**Regras adotadas neste estudo:**

1. **Leitura e observação, sem reaproveitamento.** O DearFlip lite (repositório público) usa a licença **CC BY-NC-ND 4.0**, que proíbe uso comercial e obras derivadas. Ele foi clonado só para leitura. Nenhum script ou build dele foi executado; os arquivos minificados foram apenas reformatados para leitura, fora do diretório do clone. O demo comercial (DearFlip 2.x) e o flipbookpdf.net foram baixados (HTML/JS) só para leitura.
2. **Este documento não contém** trechos de código copiados ou adaptados, nomes de funções/classes/variáveis/opções das referências, CSS das referências nem nomes de arquivos de assets.
3. **O que é permitido citar:** bibliotecas públicas das quais as referências dependem (PDF.js, three.js, jQuery, turn.js, tween.js) e técnicas conhecidas da área (malha segmentada, curvas de Bézier, mapas de sombra, gradientes, clipping, pool de objetos etc.).
4. **Na implementação do Folheia**, quem escrever o código deve trabalhar a partir deste documento e da documentação oficial das bibliotecas, sem abrir o código das referências ao lado. Os clones locais foram apagados ao final do estudo.
   - **Separação aplicada na prática:** o estudo foi feito por um agente separado, que leu as referências e entregou só este documento. Quem implementa o Folheia não leu o código das referências; trabalha apenas com este texto e com a documentação oficial das bibliotecas.
5. As bibliotecas candidatas (pdfjs-dist, page-flip, three, jszip) têm licenças permissivas e podem ser usadas ou estudadas normalmente, respeitando os avisos de licença.

---

## 2) Visão geral de cada referência

### 2.1 DearFlip lite (GitHub, v1.7.x, CC BY-NC-ND 4.0)

- Plugin jQuery que distribui os arquivos já minificados: script principal (~130 KB), uma biblioteca auxiliar própria de "maquete 3D" sobre three.js e cópias empacotadas de **jQuery**, **PDF.js** (versão 4.10.x, Apache-2.0) e **three.js r81** (de 2016, MIT). Traz também cmaps do PDF.js, sons de virada e fontes de ícones.
- Tem **dois motores de exibição**: um **3D em WebGL (three.js)** e um **2D em DOM/CSS**. O 3D é o preferido quando há suporte a WebGL e o navegador passa numa checagem de compatibilidade. Na versão lite, essa checagem desliga o 3D no IE, em Android abaixo de 9 e, curiosamente, no Safari de desktop.
- Aceita como fonte um PDF (via PDF.js) ou uma lista de imagens.
- Oferece embed em página ou modo pop-up (lightbox), deep link pelo hash da URL (prefixo + identificador do livro + número da página), som de virada, autoplay, compartilhamento e download.

### 2.2 DearFlip 2.x (demo comercial em js.dearflip.com)

- Mesma arquitetura geral, com um bundle maior (~250 KB) e versões mais novas das dependências. **Continua usando three.js** (geometria de "caixa fina" para a folha e um renderizador CSS-3D para sobrepor o DOM).
- Traz vários tipos de visualizador: flipbook, leitor com **rolagem vertical**, slider e um visualizador alternativo para celular. Também há variantes do 3D: folha flexível, folha **rígida** (sem dobra) e formato "calendário".
- Diferenças relevantes em relação à lite: **limite explícito do devicePixelRatio em 2**, tamanho máximo de textura padrão maior (~3200 px), checagem de recursos ES2022 antes de ligar o 3D, rótulos de página do PDF e busca.

### 2.3 flipbookpdf.net (exemplo "genesis")

- **Não renderiza o PDF no navegador.** O PDF é convertido **no servidor** em imagens JPEG por página (mais miniaturas). O cliente só exibe imagens; o PDF original fica disponível como link de download.
- O motor de virada é o **turn.js 4.1** (licença comercial do turnjs.com), com **jQuery 1.7**, jQuery UI (slider), Modernizr e um plugin de zoom do próprio turn.js. Também usa um roteador de hash.
- Tecnologia antiga (2012), mas útil como contraponto: mostra o efeito 2D "clássico" de revista e o custo de depender de pré-processamento no servidor. Esse caminho **não serve** para o Folheia, que é estático e processa o PDF no cliente.

---

## 3) Renderização do PDF

### Como as referências fazem

- **PDF.js com worker.** O DearFlip carrega o PDF.js sob demanda: só injeta o script quando o primeiro livro é aberto. Ele configura o worker; quando o worker está em outro domínio, baixa o arquivo e cria um blob URL para contornar CORS.
- **Carregamento por ranges.** O documento é aberto com requisições parciais HTTP em blocos de ~512 KB. A busca automática em segundo plano e o streaming ficam **desligados**: só os bytes necessários para as páginas pedidas são baixados. Para um PDF grande hospedado em servidor que aceita `Range` (o GitHub Pages aceita), isso reduz bastante o tempo até a primeira página.
- **Página → canvas.** Cada página é renderizada num `<canvas>` 2D de tamanho calculado. Daí, duas saídas possíveis:
  - **Modo 3D:** o próprio canvas vira **textura** do WebGL. Na versão lite, o lado maior é arredondado para **potência de 2**, por compatibilidade com WebGL1 e mipmaps.
  - **Modo 2D:** o canvas é inserido direto no DOM ou, opcionalmente, convertido em **JPEG (blob URL)** e usado como imagem de fundo. A versão em JPEG ocupa menos memória e pode ir para cache.
- **Tamanho da renderização** = tamanho da página na tela × zoom × devicePixelRatio, limitado entre um mínimo (~256 px) e um máximo (1600 px por padrão na lite; ~3200 px na 2.x, que também limita o DPR a 2).
- **Miniaturas** são renderizadas numa altura fixa pequena (~128 px), convertidas em JPEG e guardadas em cache próprio.
- **Camadas sobre a página:** os links e anotações usam a camada de anotações do PDF.js. A camada de texto só é criada quando a busca está ligada. No 3D, essas camadas são DOM posicionado por um renderizador CSS-3D sincronizado com a câmera do WebGL, para que fiquem clicáveis sobre a folha.
- **Detecção de "spreads" no PDF.** O DearFlip compara a proporção da página 2 com a da página 1. Se a página 2 é bem mais larga (~1,5×), conclui que o PDF já vem com páginas duplas lado a lado e passa a tratar cada página física como duas lógicas, renderizando cada metade com deslocamento horizontal do viewport. A capa e a contracapa continuam simples.
- **Primeira página como referência.** As dimensões da página 1 definem a proporção do livro inteiro (as demais páginas são ajustadas a ela).

### Lições para o Folheia

- Renderizar com PDF.js em canvas sob demanda e, no 3D, usar o canvas como textura.
- Usar ranges com busca automática desligada para PDFs grandes.
- Converter páginas fora da tela em `ImageBitmap` ou JPEG/WebP comprimido é uma boa forma de manter um cache barato.
- Detectar spreads automaticamente é um diferencial barato de implementar.

---

## 4) Efeito de virar página (2D vs 3D, geometria, sombras)

### 4.1 DearFlip — 3D (three.js / WebGL)

**Sim: o 3D do DearFlip é inteiramente three.js sobre WebGL.** Em linhas gerais:

- **Cena:** câmera em perspectiva olhando o livro de frente, luz ambiente, um holofote (spot light) e um "chão" invisível que só recebe sombra (material de sombra). Os materiais das folhas usam iluminação Phong, com textura opcional de papel e bump.
- **Folha = caixa muito fina** (com espessura), subdividida em **muitos segmentos ao longo da largura** (dezenas a ~150) e um só segmento na altura. As faces frontal e traseira recebem as texturas das duas páginas daquela folha.
- **Como a folha dobra:** a dobra acontece **só em torno de um eixo paralelo à lombada**, ou seja, no plano largura × profundidade. A altura não deforma, então **não há "orelha" diagonal no canto**. A cada quadro, a partir do ângulo de giro e de um parâmetro de **rigidez**, calcula-se uma **curva de Bézier cúbica** que vai da lombada até a borda livre. Os vértices de cada coluna da malha são reposicionados ao longo dessa curva (as faces frontal e traseira seguem curvas paralelas, separadas pela espessura).
- **UV por comprimento de arco:** depois de deformar, as coordenadas de textura de cada coluna são recalculadas proporcionalmente à distância percorrida ao longo da curva. Assim a imagem não estica onde a curva se comprime. Em seguida a folha é reescalada para manter a largura real, e as normais são recalculadas para a iluminação acompanhar a curvatura.
- **Animação:** uma biblioteca de tween interpola, em quatro etapas, o ângulo principal, um ângulo secundário (a ponta "atrasa" em relação à lombada), a rigidez e a opacidade. A rigidez muda ao longo do giro: mais curva no meio e assentando no fim. Easing senoidal; duração padrão de ~800 ms.
- **Páginas rígidas (capa):** com rigidez zero a folha gira plana, como uma tampa de livro. Dá para configurar "só capas", "todas" ou uma lista de páginas.
- **Espessura do livro:** as folhas das pilhas esquerda e direita ganham profundidade proporcional ao número de páginas já lidas/restantes. A pilha cresce de um lado e diminui do outro conforme a leitura avança.
- **Sombras:** mapa de sombra do holofote projetado no chão e nas folhas. **Desligado em celulares e iPads** por custo de GPU.
- **Render sob demanda:** o laço só redesenha quando há tween ativo ou interação, o que economiza bateria.
- **Zoom no 3D:** a câmera se aproxima do livro. O zoom máximo depende da resolução máxima da textura. Com zoom, o arrasto passa a deslocar a câmera (pan) em vez de girar.

### 4.2 DearFlip — 2D (DOM/CSS)

- Cada folha é um conjunto de elementos aninhados: um "invólucro" com recorte (overflow oculto), a face frontal, a traseira e duas camadas de sombra (interna e externa à dobra).
- **Dobra de canto clássica (estilo revista):** a partir do ponto do ponteiro e do canto agarrado, calcula-se a **linha de dobra**, que é a mediatriz entre o canto original e a posição do ponteiro. O invólucro recebe uma **rotação e translação** que alinham sua borda a essa linha. A face visível recebe a transformação inversa, para "ficar parada", e a face de trás é transformada para aparecer espelhada sobre a parte dobrada.
- **Sombras por gradientes lineares** cujo ângulo acompanha a linha de dobra. A opacidade é proporcional à distância arrastada. A face dobrada também ganha uma sombra projetada difusa.
- **Páginas rígidas no 2D:** usam `rotateY` com perspectiva CSS (giro 3D plano), sem dobra de canto.
- **Interação:** zona sensível perto dos cantos (~50 px), arrasto livre com "ímã" (o canto levanta sob o cursor), clique no lado esquerdo/direito para virar e swipe com limiar menor em celular. Ao soltar, a página completa a virada se passou da metade; senão, volta.
- Pool fixo de **4 folhas** no DOM, reaproveitadas.

### 4.3 turn.js 4 (flipbookpdf.net)

- Mesma família da técnica 2D descrita acima: recorte + rotação + gradientes, trajetória do canto animada por Bézier, "elevação" visual da folha e uma "espiada" automática no canto da capa como dica de interação.

### 4.4 StPageFlip (page-flip, MIT) — para comparação

- **Só 2D (pseudo-3D).** Calcula geometricamente a área dobrada e a desenha de dois modos: num **canvas** (só imagens) ou em **HTML** (polígono de recorte + transformações). Tem sombras por gradiente e páginas "duras" com giro plano (só no modo HTML). Não há malha nem curvatura real.

### Comparativo resumido

| Técnica                                                       | Realismo                            | Custo       | Observações                                                                                                    |
| ------------------------------------------------------------- | ----------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------- |
| 2D por recorte + gradiente (turn.js, StPageFlip, DearFlip 2D) | Bom ("orelha" diagonal convincente) | Baixo       | Funciona em qualquer navegador; difícil de ter iluminação real.                                                |
| Giro plano com perspectiva CSS (páginas rígidas)              | Médio                               | Muito baixo | Ótimo para capas e como fallback.                                                                              |
| Malha segmentada curvada em WebGL (DearFlip 3D)               | Alto (curvatura e luz reais)        | Médio/alto  | Dobra só em torno do eixo da lombada; CPU recalcula vértices a cada quadro (dá para mover para vertex shader). |

---

## 5) Gerenciamento de memória e carregamento

### Observado no DearFlip

- **Pool de folhas reciclado:** no 3D existem só **6 folhas** (12 faces de página) na cena; no 2D, 4. Ao avançar, a folha que sai de um extremo é movida para o outro, renomeada para o novo número de página e recebe uma textura placeholder até a nova renderização chegar. A memória de GPU fica, portanto, limitada a ~12 texturas.
- **Descarte explícito:** ao trocar a textura de uma face, a anterior é descartada na GPU e o canvas de origem é removido. Ao destruir o livro, renderer, controles, geometrias, materiais, mapas de sombra e listeners são liberados.
- **Fila de renderização com prioridade e debounce:** uma revisão periódica (debounce de ~50 ms) escolhe **uma** página por vez para renderizar: primeiro o spread atual, depois os vizinhos alternando antes/depois. Quando uma termina, a revisão é reagendada. **Nada é renderizado enquanto há uma virada em andamento**, para não travar a animação. Com zoom ativo, só o spread atual é renderizado.
- **Carimbo de versão por face:** cada face guarda "página + resolução" do que já está desenhado, para não refazer trabalho. Quando a resolução-alvo muda (resize/zoom), as faces ficam "velhas" e são re-renderizadas aos poucos (na prática, a imagem em baixa resolução continua visível até chegar a melhor).
- **Cache por "faixa" de resolução:** o cache é indexado por resolução e depois por página. Na versão lite **não há política visível de expulsão** do cache de JPEG/blob, o que é um risco para PDFs longos. O Folheia deve ter um LRU com teto de bytes.
- **Miniaturas virtualizadas:** a lista de miniaturas é uma lista virtual (só as linhas visíveis existem no DOM). As miniaturas são renderizadas preguiçosamente, e o trabalho é adiado enquanto o usuário está rolando.
- **PDF.js:** limpeza de recursos da página após renderizar e o download por ranges descrito na seção 3.

### Observado no flipbookpdf/turn.js

- O turn.js mantém no DOM só uma janela de páginas próximas da atual e dispara um evento quando faltam páginas, para criá-las sob demanda (imagens JPEG). A imagem de alta resolução para o zoom substitui a normal só quando necessário.

### Recomendações

- Pool fixo de folhas (3D) e de elementos de página (2D).
- Fila única de renderização com prioridade (spread atual > vizinhos > miniaturas), cancelável (renderizações obsoletas devem ser canceladas quando o usuário pula de página).
- Pausar a renderização durante animações.
- Dois níveis de resolução: preview rápido em baixa resolução e depois alta.
- LRU com orçamento de memória (em pixels/bytes).
- Ao liberar um canvas no Safari, **zerar largura e altura** antes de soltar a referência (ver seção 8).

---

## 6) Layout página única/dupla, capa

- **Decisão automática (DearFlip):** página **única** em celular ou quando o documento tem 2 páginas ou menos; **dupla** nos demais casos. O usuário pode alternar pela barra.
- **Dois sabores de página única:**
  1. "Zoom": mostra uma página grande, ocupando o espaço de um spread.
  2. "Livreto": o livro continua com lombada, mas só uma face fica visível, e o verso da folha que gira desaparece com fade no meio da virada. É o padrão em celular no DearFlip.
- **flipbookpdf:** decide pelo **formato da janela**: viewport em retrato → página única; paisagem → dupla.
- **Capa:** a página 1 aparece sozinha do lado direito (livro fechado), e a última, sozinha à esquerda. As folhas de capa/contracapa podem ser rígidas. Com o livro fechado, o conjunto é centralizado (o turn.js centraliza automaticamente; o DearFlip ajusta a sombra e a área para metade da largura).
- **Leitura da direita para a esquerda (RTL)** é suportada nas duas referências: inverte a ordem de pilhas, cantos e teclas.
- **Spreads embutidos no PDF:** ver detecção automática na seção 3.
- **Tamanho do palco:** calcula-se o maior livro que cabe no contêiner, descontando barra de controles, painel lateral aberto (~220 px) e paddings, preservando a proporção da página. Com o painel lateral aberto, o livro desloca para não ficar coberto.

---

## 7) Controles e UX

Conjunto observado (as duas referências convergem bastante):

- **Barra de ferramentas** (em cima, embaixo ou oculta), com: anterior/próxima, primeira/última, campo de número de página (Enter para ir) com "atual/total", miniaturas, sumário, zoom +/−, tela cheia, compartilhar, download, alternar página única/dupla, som e autoplay. Os itens menos usados ficam num menu "mais". Também há botões laterais grandes de anterior/próxima sobre o livro.
- **Miniaturas** em painel lateral (lista virtual). No flipbookpdf, um **slider** de páginas mostra a miniatura enquanto o usuário arrasta.
- **Sumário (outline)** a partir dos marcadores do PDF (via PDF.js), com opção de substituir por um sumário customizado.
- **Links internos/externos** do PDF clicáveis (camada de anotações); busca de texto opcional.
- **Teclado:** setas ←/→ viram a página; Esc sai da tela cheia, do pop-up ou do zoom.
- **Mouse:** clique na metade esquerda/direita vira; arrasto de canto (2D); roda do mouse dá zoom **só em tela cheia/pop-up**, para não sequestrar a rolagem da página hospedeira.
- **Toque:** swipe horizontal vira (limiar menor em celular, ~15 px); **pinça** com dois dedos dá zoom; com zoom, um dedo faz pan. O flipbookpdf usa toque duplo para zoom.
- **Tela cheia:** API de Fullscreen com prefixos e fallback para uma "tela cheia CSS" (contêiner fixo ocupando a janela) quando a API não existe. O DearFlip **esconde o botão de tela cheia no iPhone**.
- **Deep link** por hash (livro + página), atualizado a cada virada.
- **Feedback:** indicador de carregamento por página, porcentagem/MB baixados do PDF, som opcional de virada e uma "espiada" animada no canto para indicar que dá para arrastar.

---

## 8) Limites do Safari iOS/iPadOS e mitigação

| Limite / armadilha                                                                                                                                          | Efeito                                                           | Mitigação no Folheia                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Área máxima de canvas** (~16,7 MP por canvas em iOS) e **orçamento total de memória de canvas** por página (centenas de MB)                               | Canvas fica em branco ou dá erro de memória; a aba recarrega     | Limitar pixels por página. O próprio viewer do PDF.js reduz o limite para **~5,2 MP em iOS/Android**. Também ajuda limitar DPR a 2 e reciclar canvases.                   |
| Canvas descartado não libera memória de imediato no WebKit                                                                                                  | Vazamento progressivo ao folhear                                 | Zerar `width`/`height` do canvas antes de descartar; reusar canvases de um pool.                                                                                          |
| **Tamanho máximo de textura WebGL** (4096 em iPads mais antigos; 8192–16384 nos novos) e perda de contexto WebGL sob pressão de memória ou em segundo plano | Texturas recusadas; tela preta                                   | Consultar o máximo em tempo de execução e usar o menor entre ele e o orçamento; tratar perda/restauração de contexto re-renderizando texturas.                            |
| **Sombras por shadow map** custam muito na GPU móvel                                                                                                        | Queda de FPS, aquecimento                                        | Seguir o DearFlip: desligar shadow map em celular/iPad e usar sombras falsas (gradiente na lombada, escurecimento por normal/ângulo no shader).                           |
| **iPadOS se identifica como Mac** (user agent de desktop)                                                                                                   | Detecção de "mobile" falha                                       | Detectar por suporte a toque (pontos de toque > 1 + plataforma Mac), como as duas referências e o PDF.js fazem. Melhor ainda: decidir pelo tamanho e formato do viewport. |
| **Fullscreen API**: no iPhone não funciona para elementos (só vídeo); no iPad funciona (historicamente com prefixo webkit)                                  | Botão inútil no iPhone                                           | Esconder o botão no iPhone; oferecer "tela cheia CSS" e/ou PWA instalável (standalone).                                                                                   |
| **Altura do viewport** (100vh com barras dinâmicas)                                                                                                         | Livro cortado                                                    | Usar unidades dinâmicas (dvh/svh) e reagir a resize/visualViewport.                                                                                                       |
| **Gestos nativos** (pinça da página, toque duplo, rubber-band)                                                                                              | Conflito com pinça/swipe do leitor                               | `touch-action` adequado no palco e eventos de ponteiro; zoom próprio.                                                                                                     |
| **Kill da aba por memória** (limite por processo do WebKit)                                                                                                 | "Esta página foi recarregada"                                    | Orçamento global (texturas + caches + bitmaps), LRU agressivo, liberar o PDF.js ao fechar e evitar manter o PDF inteiro em ArrayBuffer quando dá para usar ranges.        |
| **Recursos JS modernos do pdfjs-dist** (ver seção 9)                                                                                                        | Erro de sintaxe/método ausente no carregamento → leitor não abre | Escolher a versão/o build do PDF.js de acordo com a versão mínima de iPadOS suportada. Definir `build.target` do Vite compatível e testar em dispositivo real.            |
| `ReadableStream` com iteração assíncrona (`for await`)                                                                                                      | Ausente no Safari por muito tempo                                | Não usar no nosso código; ler com `getReader()`. Esse padrão **não** aparece nos builds do pdfjs-dist 6.4 examinados.                                                     |
| Worker em módulo (o PDF.js atual usa worker ES module)                                                                                                      | Exige Safari 15+                                                 | Coberto se o mínimo for iPadOS 16.                                                                                                                                        |

---

## 9) Avaliação das bibliotecas candidatas

Dados verificados no npm e no GitHub em 19/10/2026.

| Biblioteca                                      | Licença                                                       | Última versão                                    | Publicada em | 2D/3D                                              | Manutenção                                                                                                                                                                                          | Observações                                                                                                                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------ | ------------ | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **pdfjs-dist** (Mozilla)                        | Apache-2.0                                                    | 6.4.299                                          | 03/10/2026   | n/a (renderização)                                 | Muito ativa (release ~mensal)                                                                                                                                                                       | Inclui build **moderno** e **legacy**. Ver compatibilidade abaixo. Pacote grande (~35 MB descompactado, por causa de cmaps, fontes e wasm); só o necessário entra no bundle. |
| **page-flip** (StPageFlip, Nodlik)              | MIT                                                           | 2.0.7                                            | 18/04/2021   | **Só 2D** (canvas ou HTML; páginas "duras" planas) | **Abandonada**: último commit em abr/2021, 48 issues abertas, issue pedindo para marcar como abandonado, bug relatado de `destroy()` que não para o laço de animação (vazamento). Sem dependências. | A licença MIT permite **fork/vendor** com aviso de copyright. Wrapper React (react-pageflip 2.0.3) também parado desde 2021.                                                 |
| **jszip**                                       | **Dupla: MIT OU GPL-3.0-or-later** (o usuário escolhe)        | 3.10.2                                           | 08/09/2026   | n/a                                                | Baixa (3.10.1 era de 2022; release pontual em 2026)                                                                                                                                                 | Escolhendo a opção MIT, é compatível com o Folheia. API simples, mas pesada e lenta em comparação com a alternativa abaixo.                                                  |
| **fflate** (alternativa a jszip)                | MIT                                                           | 0.8.3                                            | 16/05/2026   | n/a                                                | Ativa                                                                                                                                                                                               | Menor e mais rápida, com suporte a worker e streaming; licença única. Preferível se só precisarmos ler/gerar ZIP.                                                            |
| **three** (three.js)                            | MIT                                                           | 0.186.1 (r186)                                   | 24/09/2026   | **3D** (WebGL2; WebGPU em evolução)                | Muito ativa (release ~mensal)                                                                                                                                                                       | Tamanho considerável: carregar o modo 3D por import dinâmico. As versões recentes **exigem WebGL2** (Safari 15+).                                                            |
| **turn.js**                                     | 4ª versão: comercial. 3ª versão (GitHub): "BSD não comercial" | 4.1 (site); npm `turn.js` 1.0.5 (repack de 2022) | —            | 2D                                                 | Parada                                                                                                                                                                                              | **Inadequada** (licença não livre e dependência de jQuery). Citada só porque o flipbookpdf a usa.                                                                            |
| **@openpageflip/core** (fork do StPageFlip)     | MIT                                                           | 0.7.0                                            | 23/09/2026   | 2D                                                 | Nova (repo criado em set/2026, sem adoção)                                                                                                                                                          | Vale acompanhar; arriscado como dependência hoje.                                                                                                                            |
| **@gullabs/flipbook-core** (fork do StPageFlip) | **MPL-2.0**                                                   | 3.2.2                                            | 01/10/2026   | 2D                                                 | Nova (criada em ago/2026, 1 mantenedor)                                                                                                                                                             | MPL é copyleft por arquivo: dá para usar sem modificar, mas complica o modelo "tudo MIT".                                                                                    |
| flipbook-vue                                    | MIT (npm)                                                     | 1.0.0-beta.4                                     | 14/01/2023   | Pseudo-3D (CSS)                                    | Parada                                                                                                                                                                                              | Só para Vue; não serve.                                                                                                                                                      |

### Compatibilidade do pdfjs-dist com Safari / iPadOS 16–17 (ponto crítico)

- O **build moderno** do 6.4.299 usa **nativamente, sem polyfill**, APIs muito recentes: `Promise.withResolvers` (Safari 17.4+), `URL.parse` (Safari 18+), `Map.prototype.getOrInsertComputed` e `Math.sumPrecise` (propostas recém-padronizadas, ausentes em Safari 16/17/18). Também usa `Float16Array`, `ImageDecoder` e `OffscreenCanvas` (estes com checagem). **Conclusão: o build moderno não roda em iPadOS 16/17.**
- Existe **build legacy** (`legacy/build/…`, com polyfills core-js). Mas, a partir do **6.0**, o alvo do legacy subiu para **Safari ≥ 18** (Chrome ≥ 125), e o FAQ oficial classifica Safari 18+ como suporte "na maior parte". Como o alvo é Safari 18, o legacy 6.x **não traz polyfill de `Promise.withResolvers`** (só os de APIs ausentes no Safari 18, como `getOrInsertComputed`, `sumPrecise` e helpers de iteradores/Set).
- **Até a série 5.x (última: 5.7.284, 27/04/2026)** o alvo do legacy era **Safari ≥ 16.4** (Chrome ≥ 110/118). O legacy 5.4.624 que examinei inclui polyfills de `Promise.withResolvers` e `URL.parse`.
- **Opções:**
  - (a) Exigir **iPadOS 18+** e usar **pdfjs-dist 6.x legacy**.
  - (b) Suportar **iPadOS 16.4+** fixando **pdfjs-dist 5.7.x legacy**. Isso trava em uma linha que deixará de receber correções; acompanhar avisos de segurança e manter `isEvalSupported` desligado.
  - (c) Carregar condicionalmente (6.x legacy para Safari 18+, 5.7 legacy para os mais antigos). Dá mais trabalho de build e de teste.
  - **iPadOS 16.0–16.3** fica de fora em todas as opções.
- Em todos os casos, configurar o worker apontando para o arquivo do mesmo build (moderno/legacy da mesma versão) e testar em dispositivo real ou simulador com Safari 16.4/17/18.

---

## 10) Implicações e recomendações para o Folheia

1. **Arquitetura em camadas, motores intercambiáveis.** Separar:
   - (i) fonte de páginas: PDF.js com fila priorizada, cache LRU e níveis de resolução;
   - (ii) layout: página única/dupla, capa, RTL, spreads;
   - (iii) motor de virada: interface comum com implementação **2D** (padrão, leve) e **3D** (opcional, carregada sob demanda);
   - (iv) UI: barra, miniaturas, sumário, teclado, toque.

   É a mesma separação que as referências mostram, mas com fronteiras explícitas em TypeScript.

2. **Motor 2D próprio, em vez de depender do page-flip.** O StPageFlip está abandonado e tem bug de vazamento conhecido. Opções em ordem de preferência:
   - (a) **implementação própria** da dobra de canto por recorte + gradientes, mais giro plano com perspectiva para capas (técnica conhecida e bem documentada; ~algumas centenas de linhas);
   - (b) vendor/fork do StPageFlip (MIT, manter o aviso) corrigindo o laço de animação;
   - (c) acompanhar os forks novos.

   **Sugestão de ajuste no stack:** tirar `page-flip` da lista de dependências ou deixá-lo só como plano B.

3. **3D com three.js como "modo avançado".** Técnica sugerida (genérica):
   - folha como plano subdividido na largura;
   - deformação por uma curva parametrizada por progresso do giro e rigidez, de preferência **no vertex shader** para não recalcular vértices na CPU;
   - UV corrigido por comprimento de arco;
   - pool fixo de ~6 folhas;
   - capas rígidas;
   - espessura simulada nas pilhas.

   **Sem shadow map em dispositivos móveis**: sombras falsas e iluminação simples. Render loop sob demanda. Carregar three.js por import dinâmico só quando o usuário escolher 3D ou quando o dispositivo for capaz.

4. **Orçamento de memória explícito:**
   - DPR limitado a 2;
   - lado máximo da textura = min(limite do WebGL, ~2048–3200);
   - limite de pixels por canvas em iOS (~5 MP);
   - LRU de bitmaps com teto;
   - descarte explícito de texturas e canvases;
   - pausa de renderização durante animações;
   - cancelamento de renderizações obsoletas.
5. **Carregamento:** PDF por ranges com busca automática desligada. Pipeline de renderização: página atual → vizinhas → miniaturas (lista virtual). Preview em baixa resolução antes da alta. Opcional: detecção automática de spreads.
6. **Layout:** automático por viewport (retrato → página única "livreto"; paisagem → dupla), capa sozinha à direita, contracapa à esquerda, RTL como opção, alternância manual.
7. **UX mínima viável:** setas do teclado e Esc, swipe/arrasto/clique lateral, pinça e pan no zoom, barra com página atual/total, miniaturas, sumário do PDF, links clicáveis, tela cheia com fallback CSS (botão oculto no iPhone), deep link por hash (compatível com GitHub Pages) e indicador de progresso de download.
8. **Compatibilidade:** definir **agora** a versão mínima de iPadOS, porque ela decide a versão do pdfjs-dist (6.x legacy ⇒ iPadOS 18+; 5.7.x legacy ⇒ iPadOS 16.4+). Ajustar `build.target` do Vite para o mesmo alvo e testar em Safari real.
9. **ZIP:** se for preciso, preferir **fflate** (MIT, menor e mais rápida). Se ficar com jszip, documentar no NOTICE que o projeto usa a opção **MIT** da licença dupla.
10. **Higiene de clean room:** manter este documento como única ponte entre o estudo e a implementação, registrar no repositório que a implementação foi feita sem consultar o código das referências e não incluir assets (sons, ícones, texturas) delas.

---

## 11) Adendo: leitor do Internet Archive (observado no site, 20/10/2026)

O Artur trouxe o leitor de livros do Internet Archive como referência de tela cheia. Observei **só o comportamento no site**, num livro em domínio público (_The Wonderful Wizard of Oz_). Não li o código: o projeto deles é open source, mas com licença AGPL, incompatível com o nosso modelo MIT; vale a mesma regra do clean room.

**Interface:**

- Em tela cheia, o spread ocupa praticamente toda a área.
- Os controles ficam em duas faixas finas e escuras nas bordas:
  - **embaixo:** rótulo da página (com o número físico entre parênteses), um slider para arrastar até qualquer página, anterior/próxima, uma página / duas páginas / grade de miniaturas, leitura em voz alta, zoom e sair da tela cheia;
  - **na lateral esquerda:** uma coluna de ícones para painéis (conteúdo, busca, mais opções).
- A grade de miniaturas é um **modo de visualização** do livro, e não um painel lateral.
- A **URL guarda a página e o modo** (página e "duas páginas"), como o nosso `#p=`.

**Carregamento:**

- As páginas chegam como imagens prontas, renderizadas no servidor numa **escala discreta** (frações fixas do original, tipo 1/2, 1/4), escolhida pelo tamanho na tela. Escalas fixas evitam re-renderizar a cada pequena mudança e aumentam o reaproveitamento do cache.
- As páginas do **spread vizinho já ficam no DOM como `<img>` carregadas, só que invisíveis**. Quando o leitor vira, a imagem já está decodificada e aparece na hora, sem a "piscada".

**Lições para o Folheia:**

- Manter o próximo spread decodificado e escondido (item A2/A3 do backlog).
- Usar degraus de escala fixos para as versões nítidas.
- Slider de páginas e grade de miniaturas como modo de visualização (item B5).
- Leitura em voz alta como recurso futuro. A Web Speech API roda no próprio aparelho, então combina com a privacidade.

---

## 12) Internet Archive BookReader: leitura do código (20/10/2026)

Desta vez li o código-fonte do BookReader (repositório público, licença AGPL-3.0), num clone raso e temporário, já apagado. Ficaram só os **conceitos**, descritos com as minhas palavras. Nenhum código, CSS, nome interno ou asset deles entra no Folheia. A versão lida foi a série 5.0 (beta). Este estudo confirma e corrige os palpites da seção 11.

### 12.1 Resolução das páginas e troca sem piscar (A2, A3)

**Como funciona lá:**

- Cada página tem um "fator de redução" (o quanto a imagem é menor que o original), calculado assim: largura nativa da página ÷ largura que ela ocupa na tela, já contando o zoom.
- Esse fator é arredondado para baixo até a **potência de 2** mais próxima (1, 2, 4, 8…). Então só existem poucas versões por página, e o cache acerta muito.
- Um registro pequeno guarda, por página, quais fatores já foram pedidos e quais já terminaram de carregar. A regra é **nunca piorar**: se já existe uma versão carregada igual ou mais nítida que a necessária, ela é reaproveitada. Os bytes ficam no cache HTTP do navegador.
- A troca é em **camadas**: a imagem nova entra no mesmo lugar, por cima da antiga. A antiga só sai depois que a nova dispara o evento de carregado e passa uma folga fixa de ~100 ms (o evento pode chegar antes de a imagem estar pintada).
- Se a versão nítida ainda não chegou, mas existe uma versão menor já carregada, ela é posta por baixo como substituta. Sem nenhuma versão, aparece um fundo neutro com um indicador de carregamento discreto.
- Existe uma opção (desligada por padrão) que oferece ao navegador uma lista de versões mais nítidas, para ele escolher conforme a densidade da tela. Sem ela, o cálculo **ignora o devicePixelRatio**.

**Ideia para o Folheia:**

- Degraus discretos de escala de renderização no PDF.js (por exemplo 0,5×, 1×, 2× do "tamanho que cabe"), com uma chave de cache por página e degrau.
- A regra "nunca piorar": se existe um bitmap melhor no cache, ele serve.
- Troca em duas camadas: o bitmap novo entra por cima e o antigo só sai quando o novo estiver **decodificado de verdade**. Em vez da espera fixa deles, usar o término do desenho no canvas ou da decodificação da imagem. Isso resolve o A2.
- Diferente deles, incluir o DPR (com teto de 2) no cálculo do degrau.

### 12.2 Pré-carregamento e memória (A3)

**Como funciona lá:**

- No modo de duas páginas, o leitor mantém no DOM o spread visível **mais 2 páginas antes e 2 depois** (teto de segurança: 10). Essas páginas já têm a imagem pedida e ficam ocultas até a virada.
- No modo de uma página com rolagem, é só 1 página antes e 1 depois. A lista é recalculada com limitação de frequência (~100 ms) durante a rolagem.
- Os contêineres de página são guardados num mapa que **nunca é esvaziado**. Quando saem da janela, eles só deixam a árvore renderizada, e a memória decodificada fica por conta do navegador. Não há LRU nem teto explícito.

**Ideia para o Folheia:**

- Copiar a janela (atual ± 1 spread), mas **com descarte explícito**, porque no iPad o limite de memória de canvas é real:
  - LRU com teto em megapixels;
  - liberar a memória dos canvases que saem da janela (zerar o tamanho deles);
  - cancelar renderizações que ficaram obsoletas.
- O mapa sem limite deles é exatamente o que **não** queremos.

### 12.3 Animação de virada no modo de duas páginas (A4)

**Como funciona lá:**

- É feita com DOM + **Web Animations API**. A folha que sai gira 0→180° em torno da lombada, e a que entra, do outro lado, gira de 180° até 0°.
- A face de trás de cada elemento fica invisível. Assim cada página some ao passar de 90° e a outra aparece: parece uma folha só, com frente e verso.
- Não há perspectiva, então o giro é visualmente um **achatamento horizontal 2D**, sem sombra dinâmica.
- Detalhes do movimento:
  - duração de ~400 ms (mais 1 ms por página pulada), com aceleração no início (sem desaceleração no fim);
  - o livro inteiro é recentralizado ao mesmo tempo (útil na capa, quando o livro muda de largura);
  - camadas de texto e de busca ficam escondidas durante o giro.
- **Cliques rápidos são ignorados** enquanto há uma virada em andamento: não há fila. O estado final só é gravado depois que a animação termina.
- Nas laterais, uma "espessura de páginas" (largura proporcional às folhas restantes) mostra o progresso. Ao passar o mouse, aparece o nome da página sob o cursor, e um clique salta para ela.

**Ideia para o Folheia:**

- O nosso motor 2D já é mais rico (curvatura e sombra). O que vale levar daqui:
  - A4: em vez de cortar a sombra de repente, a sombra e a dobra devem fazer o caminho inverso no fim da animação, voltando à intensidade zero;
  - durante a virada, desligar overlays (texto, links, destaques);
  - tratar cliques repetidos de propósito: **enfileirar no máximo 1** virada pendente, que é melhor que descartar.
- A borda com espessura e o salto ao clicar nela é um extra barato para o B5.

### 12.4 Tela cheia e interface imersiva (B5)

**Como funciona lá:**

- São duas camadas:
  - **tela cheia "de CSS"**: o leitor fica fixo, cobre a janela inteira com fundo preto e trava a rolagem do body. É o padrão no celular;
  - no desktop, um complemento usa a **Fullscreen API** no elemento raiz do leitor e cai no modo CSS se ela não estiver disponível.
- Ao entrar ou sair, o conteúdo some e reaparece com um fade curto, e o livro é recalculado depois que o layout assenta. Esc sai da tela cheia.
- A URL ganha um marcador de "modo teatro".
- O encaixe do livro usa o menor entre a escala por largura e a escala por altura, com uma margem fixa pequena. A área do livro é recortada pela altura real da barra de ferramentas e do rodapé, e um ResizeObserver dispara o reencaixe.
- Abaixo de uma largura de ~800 px, a tela cheia passa para o modo de uma página.
- **Barra inferior:** troca o conjunto de botões conforme a largura do contêiner. Abaixo de ~640 px fica um conjunto mínimo e o slider se recolhe atrás de um botão. Existe uma opção de esconder sozinha, mas ela vem desligada.
- **Trilho lateral de ícones:** é um componente externo. Uma lista ordenada de atalhos (sumário, busca, marcadores, ajustes visuais, compartilhar) abre painéis. Em tela cheia, um atalho extra no topo do trilho sai do modo.
- **Slider:**
  - enquanto se arrasta, **só o rótulo muda**, e o salto acontece ao soltar;
  - no modo de duas páginas, o valor é ajustado para a página da esquerda do spread;
  - o rótulo mostra o número impresso e o índice físico (com travessão quando não há número impresso);
  - resultados de busca e capítulos aparecem como marcadores posicionados em porcentagem ao longo do trilho, com dica ao passar o mouse e salto ao clicar.
- Os ajustes visuais (brilho, contraste, inversão, tons de cinza) são só um filtro aplicado ao contêiner do livro.

**Ideia para o Folheia:**

- Para o B5:
  - Fullscreen API onde existir e modo CSS fixo no iPhone;
  - slider com prévia do rótulo durante o arrasto e salto só no fim;
  - marcadores de busca e de capítulos (sumário do PDF) no trilho;
  - recalcular o encaixe pelo ResizeObserver depois da transição.
- O filtro visual é um recurso quase grátis ("modo noturno" por inversão).

### 12.5 Toque, pinça e iOS

**Como funciona lá:**

- **Não há swipe** no modo de duas páginas: no toque, vira-se tocando na página da esquerda ou da direita.
- A pinça usa uma biblioteca de gestos, com os eventos de gesto do Safari como reforço, e a área de toque permite só pan nativo. As correções para o Safari são:
  - um contador de toques ignora "pinças" falsas com um dedo só;
  - um segundo início de gesto é ignorado (o Safari dispara duas vezes).
- Ctrl + roda trata a pinça do trackpad, com um passo maior no Mac.
- **Não achei nada** sobre safe areas, barra de status ou altura dinâmica da viewport.

**Ideia para o Folheia:**

- Manter o swipe/arrasto do nosso motor.
- Copiar as duas defesas do Safari (contar os toques reais e tolerar o início duplicado de gesto).
- Tratar as safe areas e a altura dinâmica da viewport nós mesmos: é uma lacuna deles, não um modelo.

### 12.6 Zoom nítido

**Como funciona lá:**

- O zoom aplica uma escala por transform no "mundo" do livro (rápido, só GPU). Durante a pinça, as atualizações são agrupadas por quadro de animação e a rolagem é corrigida para manter fixo o ponto entre os dedos.
- Depois que a escala muda, a página é re-renderizada e o fator de redução é recalculado. Então chega uma **imagem inteira maior**, da próxima potência de 2. **Não há tiles.**

**Ideia para o Folheia:**

- O mesmo fluxo: transform durante o gesto e, quando ele termina, renderizar no degrau seguinte com troca em camadas.
- No iPad, imagem inteira tem teto (megapixels por canvas). Acima de ~2–3×, renderizar **só a região visível** num canvas do tamanho da tela, que é mais simples que tiles e respeita o limite.

### 12.7 Grade de miniaturas e URL (E2)

**Como funciona lá:**

- A grade monta as linhas a partir das proporções das páginas e cria elementos **só para as linhas visíveis mais 1 linha de folga**. As linhas que saem da janela são removidas do DOM.
- O fator das miniaturas é derivado da largura delas.
- O "zoom" da grade muda o número de colunas, dentro de um mínimo e um máximo.
- A página atual fica destacada, e um toque abre a página no modo de leitura.
- **URL:** página e modo ficam no caminho (ou no hash), e busca e "teatro" ficam nos parâmetros. A barra de endereço é atualizada **substituindo a entrada** do histórico, sem empilhar. Quando a página não tem número impresso, a URL usa um prefixo que indica índice físico. Um complemento separado lembra a última página num cookie.

**Ideia para o Folheia:**

- Para o E2:
  - grade virtual (linhas visíveis ± 1), miniaturas renderizadas num degrau baixo e fixo, com fila de prioridade;
  - zoom por número de colunas;
  - toque na miniatura volta ao modo anterior.
- No `#p=`, acrescentar o modo e usar a substituição de histórico.
- Guardar a última página por documento no armazenamento local, com chave pelo hash do arquivo.

### 12.8 Leitura em voz alta (E2)

**Como funciona lá:**

- O texto vem do OCR, dividido em trechos de cerca de 25 a 50 palavras (por parágrafo). Cada trecho guarda os retângulos das suas linhas, em coordenadas nativas da página. Um iterador mantém ~3 páginas de texto carregadas à frente.
- Antes de falar cada trecho, o leitor:
  1. vira para a página certa, se ela não estiver visível;
  2. desenha os retângulos numa camada vetorial sobre a página. Essa camada usa as coordenadas nativas e estica junto com a página, então acompanha qualquer zoom;
  3. rola até o destaque.
- A voz é a Web Speech API. Correções para os navegadores:
  - ao trocar de voz ou de velocidade, a fala recomeça do último ponto de fronteira de palavra;
  - pausar e retomar têm tempo-limite e fallback, porque em alguns navegadores elas falham sem avisar;
  - no iOS, às vezes falta a voz padrão na lista, e uma voz "padrão do sistema" é inserida no topo;
  - um áudio silencioso em loop ativa a Media Session (controles na tela de bloqueio).

**Ideia para o Folheia:**

- No PDF, montar os trechos a partir do conteúdo de texto do PDF.js, que já traz as posições.
- Destacar com uma camada vetorial em coordenadas da página, com a mesma escala do resto.
- Virar a página automaticamente pelo nosso motor.
- No CBZ não há texto, então o recurso fica desativado.
- Tudo roda no aparelho e combina com a privacidade.

### 12.9 Outras ideias reaproveitáveis

- Separar três sistemas de coordenadas: "mundo" (polegadas ou pontos do PDF), "renderizado" (px de layout) e "visível" (px × zoom). Isso deixa os cálculos de encaixe, zoom e escolha de degrau limpos.
- Guardar em cache as medidas do contêiner (largura e altura) e atualizá-las só por ResizeObserver, para não forçar recálculo de layout a cada quadro.
- Um único caminho de navegação ("ir para o índice N") usado por slider, miniaturas, busca, URL e voz alta.
- Os atalhos de teclado só funcionam quando o leitor está visível, detectado por IntersectionObserver.

---

## 13) Mihon: leitor de mangá para Android (20/10/2026)

O estudo completo está em **`estudo-mihon.md`**: o leitor, as telas, as fontes e extensões, as opções para ter fontes no Folheia e a comparação de desempenho. Os pontos principais:

- **Leitor:**
  - ações "lógicas" (próxima/anterior) separadas das "físicas" (esquerda/direita);
  - dica visual das zonas de toque;
  - "zoom e percorrer" para spreads largos;
  - páginas em virada protegidas no cache;
  - progresso gravado só quando a leitura para.
- **Telas:**
  - biblioteca com categorias (que no Folheia viram estantes);
  - ficha da obra;
  - histórico com tempo de leitura;
  - trilho lateral e dois painéis no tablet.
  - O Mihon **não tem marcadores de página**, uma lacuna que o Folheia pode preencher.
- **Fontes:**
  - as extensões são APKs da comunidade;
  - o app vem sem repositório e confia pela assinatura.
  - Na web, os sites de scan não mandam CORS. Os caminhos possíveis são:
    - o **Suwayomi** (roda as extensões do Mihon e fala OPDS);
    - o HTTP nativo do Capacitor;
    - um userscript;
    - um proxy próprio.
- **Desempenho:**
  - o Mihon decodifica a imagem original direto no tamanho da tela, sem recomprimir;
  - o Folheia recomprime até no CBZ.
  - A lista de experimentos P0–P10 está no §6 do estudo.
