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
