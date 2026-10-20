# Folheia — Estudo do Mihon

> 20/10/2026. O §8 traz a lista de candidatos para triagem. O Artur usa o Mihon, um leitor de mangá open source para Android, e pediu um estudo do leitor, das telas, do sistema de fontes/extensões e do desempenho. Este documento é a referência completa. O `estudo-referencias.md` §13 traz só um resumo.

**Como foi feito (clean room):**

- O repositório `mihonapp/mihon` tem licença **Apache-2.0**. Agentes de estudo leram clones rasos e temporários, já apagados, sem rodar o build. Eles também leram:
  - o repositório comunitário de extensões (keiyoushi);
  - os leitores para iOS Paperback e Aidoku;
  - o Suwayomi.
- Os testes de CORS foram feitos com `curl` só nos cabeçalhos, com poucas requisições.
- Tudo aqui está nas nossas palavras. Nenhum código, nome interno ou asset desses projetos entra no Folheia. Os caminhos de arquivo servem só como evidência.

## 1. O que é o Mihon e como o projeto se organiza

O Mihon é o sucessor do **Tachiyomi**, que encerrou o desenvolvimento em janeiro de 2024 depois de pressão jurídica da Kakao Entertainment.

- É um app Android em Kotlin (Jetpack Compose).
- **Não lê PDF**: não há nenhuma menção a PDF no código.
- Lê pastas de imagens, ZIP/CBZ, RAR/CBR, 7z, TAR e as imagens de EPUB.

**A organização `mihonapp` no GitHub** tem 9 repositórios:

| Repositório                    | O que é                                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `mihon`                        | O app (Apache-2.0).                                                                                                                   |
| `mihon-preview`                | Só builds de teste. Uma Action diária clona o `mihon`, conta os commits e publica um APK como release `r<número>`.                    |
| `website`                      | O site mihon.app (VitePress, hospedado no Netlify). Uma Action do `mihon` avisa o site a cada nova versão, e ele se reconstrói.       |
| `.github`                      | O README que aparece na página da organização.                                                                                        |
| `subsampling-scale-image-view` | Fork da biblioteca Java que mostra imagens enormes em tiles, com zoom.                                                                |
| `image-decoder`                | Fork de um decodificador nativo em C (JPEG, JPEG XL, PNG, WebP, AVIF, HEIF) que já corta as bordas durante a decodificação (MPL-2.0). |
| `bitmap.kt`                    | Biblioteca própria para manipular imagens (MPL-2.0).                                                                                  |
| `tachiyomix`                   | O "molde" das extensões: só as interfaces, sem implementação, contra as quais os autores compilam.                                    |
| `injekt`                       | Injeção de dependências antiga, arquivada.                                                                                            |

**O que não está ali: nenhuma extensão.** A organização publica o app e o contrato das extensões. As fontes ficam em repositórios da comunidade. É a separação jurídica do projeto depois do caso Tachiyomi.

## 2. O leitor

### 2.1 Modos de leitura

São cinco modos:

- paginado da esquerda para a direita;
- paginado da direita para a esquerda (o **padrão**, porque o foco é mangá);
- paginado vertical;
- **webtoon**: uma tira contínua sem espaço entre as páginas;
- contínuo vertical com espaço entre as páginas.

Cada modo é a combinação de duas propriedades independentes: a direção (horizontal ou vertical) e o tipo (paginado ou contínuo).

- **Global e por obra.** Há um padrão global e um valor por obra, que pode ser "Padrão". Trocar o modo pelo leitor muda só a obra atual. Ao abrir, um aviso curto mostra o modo que está valendo.
- **Visualizador experimental.** Uma versão nova do leitor traz página dupla (nunca, sempre, ou só na horizontal) e transições escolhíveis (virar página, cubo, fade...).

### 2.2 Zonas de toque: ações lógicas e físicas

A ideia mais útil do leitor.

**Dois tipos de ação.**

- **Lógicas:** "próxima" e "anterior", que seguem a direção de leitura.
- **Físicas:** "esquerda" e "direita", que não mudam com a direção.

No modo paginado, as zonas são físicas. Por isso o mesmo desenho funciona em LTR e em RTL sem nenhuma inversão manual. No teclado, as setas são físicas.

**Layouts.** Cada layout é uma lista de retângulos numa grade 3×3, em coordenadas de 0 a 1. Tocar fora deles abre o menu.

- **Em "L"**, o padrão no vertical.
- **Estilo Kindle.**
- **Bordas**, para usar com uma mão.
- **Esquerda/direita**, o padrão no paginado.
- **Desligado.**

Todos podem ser espelhados na horizontal ou na vertical.

**Dica visual.**

- Na primeira leitura, e sempre que o layout muda, uma camada pinta cada zona com uma cor translúcida e escreve "Anterior", "Próxima" ou "Menu".
- O primeiro toque faz a camada sumir num fade.
- Uma opção a mostra de novo ao abrir.

O Folheia já segue a regra das setas físicas (`ReaderScreen.tsx`). Falta a dica visual.

### 2.3 Páginas

- **Spread em tela de uma página.** Três opções:
  - dividir em duas páginas;
  - girar 90°;
  - **"zoom e percorrer"**: a página anima até caber na altura, começando pelo lado da direção de leitura, e o toque de "próxima" **anda pela imagem** antes de virar.

  O Folheia já divide. O "zoom e percorrer" seria uma alternativa melhor para o iPad em pé.

- **Pareamento da página dupla:**
  - a capa fica sozinha;
  - uma página larga (proporção acima de ~1,2) fica sozinha, e a **paridade recomeça** logo depois dela;
  - duas páginas só formam par se tiverem proporções parecidas;
  - para o progresso, conta a última página do spread.

  Reforça a regra do branco virtual que já temos.

- **Cortar bordas** brancas ou pretas, com um botão próprio na barra. É desligado no modo duplo, para não desalinhar a dobra.
- **Fundo automático.** Amostra os cantos e as bordas da página e escolhe entre a cor sólida da borda, preto ou branco, para a página "sangrar" no fundo.
- **Memória.**
  - O leitor paginado clássico guarda 1 página de cada lado.
  - O experimental guarda 3 à frente e 2 atrás, e na hora de liberar espaço tira primeiro a página **mais distante** da atual.
  - A imagem **no meio de uma virada fica protegida** e só é liberada no fim da animação.
- **Tiras longas (webtoon).**
  - A imagem é decodificada uma vez, em escala reduzida, e cortada em faixas horizontais de alguns MB.
  - Só as faixas visíveis são desenhadas.
  - Uma página pesada que sai da tela libera as faixas mas mantém a altura, para o layout não pular.
  - Só uma decodificação pesada roda por vez.
  - É a mesma regra do nosso limite de ~5 MP por canvas: nunca uma textura gigante.
- **Fim de capítulo.** Uma "página" de transição, "Terminado: X / Próximo: Y", que avisa quando há capítulos faltando.

### 2.4 Controles e progresso

- **Barras de cima e de baixo** entram em ~150–200 ms. A de baixo tem só quatro ícones e um **slider de páginas que se inverte em RTL**.
- **Indicador "10 / 69"** discreto quando o menu está fechado.
- **Ajustes rápidos** numa folha com abas. Na aba de filtros (brilho, sobreposição de cor, cinza, inverter), **o escurecimento some** para a pessoa ver o efeito ao vivo.
- **Toque longo na página:** usar como capa, copiar, compartilhar e salvar.
- **Progresso.**
  - É gravado **só quando a leitura para numa página**, com um pequeno atraso, e não a cada virada.
  - Chegar à última página marca como lido na hora.
  - O que estiver pendente é gravado ao sair.
  - O histórico guarda também o tempo de leitura.
- **Modo anônimo:** não registra nada no histórico.

## 3. As telas do app

No Mihon, a "entry" é uma **série** e o "chapter" é um **capítulo**, uma unidade de leitura separada. Algumas funções que se costuma atribuir ao Mihon são de forks (TachiyomiSY, J2K) e **não existem nele**:

- categorias ocultas;
- edição de metadados;
- marcadores de página.

### 3.1 Navegação

- **Cinco abas fixas:** Biblioteca, Atualizações, Histórico, Navegar e Mais.
  - Não dá para esconder nem reordenar.
  - O app abre sempre na Biblioteca, e o "voltar" das outras abas leva para lá.
- **Selos nas abas:** Atualizações mostra os capítulos novos; Navegar mostra as extensões com atualização.
- **Tocar de novo na aba ativa** abre um atalho diferente em cada uma: filtros da biblioteca, fila de downloads, retomar o último capítulo, busca global e configurações.
- **Telas largas:** a barra inferior vira um **trilho lateral** (navigation rail). A preferência "Tablet UI" tem as opções automático, sempre, só em paisagem e nunca.
- **Faixas fixas no topo** avisam quando um modo global está ligado: "só baixados" e "modo anônimo".

### 3.2 Biblioteca

- **Categorias em abas roláveis**, com contador opcional.
  - Desliza-se entre elas, e só a aba atual e as vizinhas são montadas.
  - Uma série pode estar em várias categorias.
  - Uma categoria de sistema, "Default", guarda o que não tem categoria e só aparece quando tem itens.
- **Modos de exibição:** grade compacta (título sobre a capa), grade confortável (título embaixo), só capas e lista.
  - A capa é sempre 2:3.
  - O número de colunas é guardado **separado para retrato e paisagem**.
- **Selos na capa:** não lidos, baixados, local e idioma.
  - Um botão "continuar lendo" opcional abre o próximo capítulo sem passar pela ficha.
- **Filtros de três estados** (ignorar, incluir, excluir): baixados, não lidos, começados, com marcador, completos e rastreados.
- **Ordenação:** título, total, última leitura, última atualização, não lidos, data de adição, nota e aleatória.
  - Tocar no critério ativo inverte a direção.
  - A ordenação pode ser por categoria.
- **Busca com mini-linguagem:**
  - Texto solto procura em título, autor, descrição, gêneros, fonte e **notas**.
  - Aceita campos (`author:`, `genre:`, `notes:`...), comparações numéricas (`unread>3`), negação, "e/ou" e parênteses.
  - Sem resultado, oferece buscar nas fontes.
- **Seleção:**
  - Segurar seleciona.
  - Segurar outro item seleciona a **faixa entre os dois**.
  - Há "selecionar tudo" e "inverter".
  - Ações: mudar categoria, marcar lido, baixar, migrar e apagar.
  - Os botões são só ícones, e segurar um deles mostra o rótulo por um segundo.
- **Atualização automática:**
  - Frequência e restrições (Wi-Fi, carregando).
  - Categorias incluídas e excluídas.
  - Uma "atualização esperta" pula séries completas, não começadas ou fora da previsão de lançamento.
- **Gestão de categorias:** criar, renomear, reordenar arrastando e apagar com confirmação.
  - Ao adicionar uma série, o app usa uma categoria padrão ou pergunta.
  - O diálogo de categorias para várias séries usa **caixas de três estados**: em todas, em algumas ou em nenhuma.
- **Estados vazios:** um kaomoji sorteado, uma mensagem e um botão de ajuda.

### 3.3 Ficha da série

- **Celular:** uma coluna rolável.
- **Tablet: dois painéis.** À esquerda, cabeçalho e descrição, com no máximo 450dp. À direita, os capítulos.
- **Cabeçalho:** a capa desfocada no fundo e a capa pequena, que abre em tela cheia para compartilhar, salvar ou trocar.
  - Título e autor: tocar busca, segurar copia.
  - Tocar na fonte filtra a biblioteca por ela.
- **Ações:** "na biblioteca" (segurar abre as categorias), previsão da próxima atualização, rastreadores e WebView.
- **Descrição:** em Markdown, recolhida em 3 linhas. As tags viram chips que buscam ou copiam.
- **Notas pessoais:** editor simples (negrito, listas), salvo em Markdown. As notas entram na busca da biblioteca.
- **Lista de capítulos:**
  - Ponto de "não lido", marcador, data, "Página N" quando está pela metade e indicador de download.
  - Uma linha "faltam N capítulos" aparece quando a numeração pula.
  - **Deslizar para os lados** marca lido ou alterna o marcador; é configurável.
  - Seleção com "marcar anteriores como lidos".
  - Filtros, ordenação e exibição próprios, com "definir como padrão para toda a biblioteca".
- **Ao adicionar:** procura **duplicatas** pelo nome e oferece "adicionar mesmo assim". Ao remover, oferece apagar os downloads.

### 3.4 Atualizações, Histórico, Navegar e Mais

- **Atualizações:**
  - Capítulos novos agrupados por dia, com filtros e "última atualização em...".
  - Um **calendário de próximos lançamentos**; no tablet, calendário e lista ficam lado a lado.
- **Histórico:**
  - **Uma linha por série** (a última leitura), agrupada por dia, com busca.
  - Tocar retoma a leitura. Há apagar item e limpar tudo.
  - Cada registro guarda o **tempo de leitura**, que alimenta as estatísticas.
- **Navegar:**
  - **Fontes**: fixadas, "usadas por último" e o resto por idioma.
  - Dentro de uma fonte: abas Popular, Recentes e Filtros. As séries que já estão na biblioteca aparecem esmaecidas, e segurar uma série adiciona direto.
  - **Busca global**: uma fileira de resultados por fonte.
  - **Extensões**: instalar, atualizar e confiar.
  - **Migração** de séries de uma fonte para outra.
- **Fila de downloads:** agrupada por série, reordenável, com pausar e retomar.
- **Mais:** "só baixados", modo anônimo, downloads, categorias, estatísticas, dados e armazenamento, configurações e sobre.
- **Configurações:**
  - **Busca** que mostra o caminho ("Biblioteca > Atualização") e destaca o item ao abrir.
  - No tablet, dois painéis.
  - 15 paletas de cor e "preto puro".
- **Dados:**
  - Backup granular: escolhe-se biblioteca, categorias, capítulos, histórico e ajustes.
  - Backup automático e exportação da lista em CSV.
- **Estatísticas:** só números (séries, tempo total de leitura, concluídas, capítulos lidos). Não há gráficos, períodos nem metas.
- **Boas-vindas:** quatro passos: tema, pasta de armazenamento, permissões e guias.

### 3.5 Marcadores: o que existe e o que falta

- **Existe:** um marcador **por capítulo**. Ele é filtrável, pode ser baixado em lote e protege o capítulo da limpeza automática.
- **Não existe:**
  - marcador de **página**;
  - lista central de "salvos";
  - destaques;
  - notas por capítulo.
- O único estado dentro do capítulo é a última página lida.

Marcadores de página são uma lacuna real que o Folheia pode preencher.

### 3.6 Acabamento

- Vibração ao segurar.
- Snackbars com ação. O "desfazer" quase sumiu na reescrita para Compose, e isso é um defeito deles.
- Puxar para atualizar.
- Botão flutuante que encolhe ao rolar.
- Rolagem rápida nas listas longas.
- Folhas inferiores que viram diálogos no tablet.

## 4. Fontes e extensões: como funcionam

### 4.1 O contrato de uma fonte

Uma fonte tem nome, idioma e um ID estável, que é um hash de nome, idioma e versão. As operações são:

- listar populares e recentes, por página;
- buscar com filtros. Os filtros são **dados** (texto, caixa, três estados, seleção, ordenação, grupo): a fonte declara, o app desenha a UI e devolve os valores;
- obter os detalhes da obra e a lista de capítulos;
- obter a lista de páginas de um capítulo e, se preciso, a URL final de cada imagem.

**Como uma fonte web é escrita:**

- Cada operação é um par: "montar a requisição" e "ler a resposta".
- A fonte define a URL base, os cabeçalhos (principalmente o `Referer`, que muitas CDNs exigem) e um limite de requisições por host.
- Para sites em HTML, basta informar seletores CSS: o app faz o parsing.
- As URLs são guardadas sem o domínio, para sobreviver à troca de espelho.
- Cada fonte pode ter uma tela de ajustes própria (espelho, qualidade, login).

**Temas:** a maioria das extensões quase não tem código. Um "tema" cobre um CMS comum (por exemplo, sites WordPress com o mesmo plugin de mangá), e a extensão só informa nome, URL e alguns ajustes.

Nas 418 extensões em inglês do keiyoushi:

- **56% usam tema**, com mediana de **11 linhas**;
- cerca de **14% precisam de algo difícil**: WebView, executar JS do site, AES, desembaralhar imagem.

### 4.2 Extensões: distribuição e confiança

- **O que é uma extensão:** um **APK Android em Kotlin**. O app carrega o código em tempo de execução, **sem isolamento**: ela roda no mesmo processo e com as mesmas permissões do app.
- **Como chegam ao usuário:** o app vem **sem nenhum repositório**. O usuário cola a URL de um **índice JSON**. O índice traz a impressão digital da chave de assinatura e, para cada extensão, o link do APK, o ícone, a versão, o aviso de conteúdo e as fontes.
- **Confiança:** uma extensão só carrega se a assinatura bater com a chave do índice. Se não bater, o usuário confia à mão naquela versão exata, e cada versão nova pede confiança de novo.
- **Publicação, toda gratuita:** uma GitHub Action compila só o que mudou, assina, publica os APKs como Releases e grava o índice num branch servido de graça. Hoje são **~1.440 extensões e ~2.430 fontes**.
- **Quem faz:** a **comunidade, não a equipe do Mihon**. Quase tudo é de sites de scanlation. Há repositórios paralelos para o que o principal recusa por direito autoral.

### 4.3 Rede, WebView e Cloudflare

- **Cookies compartilhados:** o cliente HTTP usa os **mesmos cookies do WebView do sistema**.
- **"Abrir no WebView"** serve para:
  - fazer login;
  - passar à mão por um desafio do Cloudflare;
  - ver a página original.

  O que se ganha ali vale na hora para a extensão.

- **Cloudflare:** o app detecta o desafio e tenta resolver sozinho com um WebView invisível, usando o mesmo User-Agent. Se o desafio pede interação, o usuário abre o WebView.

### 4.4 Downloads, rastreadores e servidores pessoais

- **Downloads:** cada capítulo vira uma pasta ou um **CBZ** com `ComicInfo.xml`. O arquivo é escrito com nome temporário e renomeado no fim, e depois é lido pela fonte local.
- **Rastreadores:** AniList, MyAnimeList e outros só sincronizam o progresso. Os "rastreadores avançados" (Komga, Kavita) devolvem o progresso ao servidor pessoal.
- **Servidores pessoais:** o Mihon **não tem OPDS nativo**. Komga e Kavita entram por extensão.
- **Suwayomi:** um servidor que **roda as próprias extensões do Mihon** e expõe GraphQL, REST e **OPDS**, com "explorar fontes" e busca. Ver §5.

### 4.5 Outros leitores, que resolveram plugins de outro jeito

No iOS não se carrega código nativo. Os leitores de lá rodam código interpretado e **deixam a rede com o app**:

- **Paperback** (app fechado; tipos MIT):
  - **Linguagem:** fontes em TypeScript, empacotadas num único JS e executadas num motor sem DOM.
  - **O que a fonte acessa:** nada de `fetch`. Só um objeto do app que faz a requisição nativa (sem CORS), guarda estado, abre WebView para o Cloudflare e decodifica dados.
  - **Parsing de HTML:** vai dentro do bundle.
  - **Repositório:** gerado por uma ferramenta e publicado no GitHub Pages, **sem assinatura**.
- **Aidoku** (app GPL-3.0; bindings e fontes MIT/Apache):
  - **Linguagem:** fontes em Rust compiladas para **WebAssembly**, rodando num interpretador (o iOS não permite JIT).
  - **O que a fonte acessa:** só as funções que o app expõe (rede, seletores HTML, JS/WebView, imagem, ajustes). O isolamento é bom para memória e arquivos, mas a rede não tem lista de domínios.
  - **Repositório:** também no GitHub Pages, sem assinatura.
- **Kotatsu:** os parsers são compilados junto com o app, e o repositório foi arquivado em 11/2025. É só referência do modelo "fontes embutidas".

## 5. Fontes no Folheia: o que dá para fazer

O Artur quer algo parecido para estudo e uso pessoal: **site estático e custo zero**. O ponto central é **por onde passa a rede**.

### 5.1 O bloqueio da web pura

**O problema do navegador:**

- Os sites de scan não mandam CORS, então o navegador bloqueia a leitura da resposta.
- Muitas CDNs exigem `Referer` e `User-Agent`, que o JS não pode definir.
- **Service worker não resolve:** ele segue as mesmas regras, e uma resposta "opaca" não pode ser lida.

**O que respondeu com CORS** para a origem `github.io`, em 20/10/2026:

| Destino                                         | Resultado                                                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| API MangaDex                                    | **Bloqueada.** Só libera `mangadex.org` e `localhost`. A documentação manda clientes de outros sites usarem proxy. |
| Imagens MangaDex@Home                           | Liberadas, mas só se chega a elas pela API.                                                                        |
| Internet Archive: busca, metadados e **IIIF**   | Liberados. O IIIF entrega páginas de livros escaneados como imagens, em vários tamanhos.                           |
| Internet Archive: `download/`                   | Sem CORS. Num teste posterior no mesmo dia, respondeu com CORS (`estudo-extensao.md` §8).                          |
| Wikimedia, Gutenberg OPDS                       | Liberados (Gutenberg é EPUB de texto).                                                                             |
| GitHub Pages, `raw.githubusercontent`, jsDelivr | Liberados: um índice de fontes no GitHub pode ser lido do navegador.                                               |
| Komga                                           | Fechado por padrão; libera com `KOMGA_CORS_ALLOWEDORIGINS`.                                                        |
| Kavita                                          | Fechado na prática.                                                                                                |
| Suwayomi                                        | Aberto para qualquer origem.                                                                                       |
| Sites de scan e Digital Comic Museum            | Sem CORS ou com desafio do Cloudflare.                                                                             |

**Servidor em casa, por HTTP:** um Komga ou Suwayomi em `http://192.168.x.x` é bloqueado no site em HTTPS (conteúdo misto). Funciona com `http://localhost` na mesma máquina, ou com HTTPS de verdade. O **Tailscale Serve** (plano pessoal gratuito) dá um certificado válido em `*.ts.net`, acessível do iPad em qualquer lugar.

### 5.2 Os caminhos para a rede

| Caminho                                    | Custo                                         | Como funciona                                                                                                                                                                  | Contras                                                                                                                                                            |
| ------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Suwayomi no Mac + Tailscale**            | 0 (Mac ligado)                                | O Suwayomi roda as ~2.400 fontes do Mihon com o IP de casa e entrega tudo por OPDS. O Folheia só precisa ser um cliente OPDS.                                                  | Depende do Mac ligado. O jurídico continua o mesmo (é o conteúdo das fontes).                                                                                      |
| **Capacitor (app nativo)**                 | 0 no Android; 0 (7 dias) ou US$ 99/ano no iOS | O HTTP nativo ignora CORS e aceita qualquer cabeçalho. Os cookies do WebView passam para o HTTP nativo. Um navegador interno com WKWebView resolve o Cloudflare como no Mihon. | Só vale no app. No iOS, a conta gratuita expira em 7 dias.                                                                                                         |
| **Userscript no Safari (app Userscripts)** | 0                                             | Um script de ~40 linhas, ativo só no site do Folheia, faz requisições entre origens a pedido da página. É o jeito mais barato de testar fontes no iPad sem Capacitor.          | Dependência fora do site. Ainda não testado se envia os cookies do Safari.                                                                                         |
| **Proxy próprio (Cloudflare Worker)**      | 0 (100 mil req/dia)                           | Código nosso, fechado por token, origem e lista de domínios. Pode pôr `Referer` e `User-Agent`.                                                                                | É um servidor. Sites atrás da Cloudflare podem bloquear Workers, e IPs de datacenter costumam receber desafio. As consultas passam por um intermediário (o nosso). |
| **Proxy local (script no Mac)**            | 0                                             | ~50 linhas em Deno/Node, IP de casa.                                                                                                                                           | Do iPad, só com Tailscale.                                                                                                                                         |
| **Web pura**                               | 0                                             | Só hosts com CORS.                                                                                                                                                             | Quase nenhum site de mangá.                                                                                                                                        |

### 5.3 Formato das fontes

- **Declarativas (JSON):**
  - **O que são:** templates de URL e seletores CSS ou JSONPath, além de cabeçalhos e filtros.
  - **Cobertura:** cerca de 60–75% dos sites.
  - **Vantagem:** são seguras, porque dado não executa nada.
  - **Risco:** o formato crescer até virar uma linguagem ruim.
- **Código JS isolado (o modelo do Paperback, com mais proteção):**
  - **Onde roda:** o código da fonte roda num **QuickJS compilado para WASM** (MIT) dentro de um Worker. Ele não enxerga `fetch`, DOM nem o armazenamento do app; só as funções que o Folheia oferece.
  - **O que o Folheia oferece:** requisição (conferida contra os domínios declarados pela fonte), parsing de HTML, armazenamento por fonte e log.
  - **Limites:** dá para impor limite de memória e de tempo.
  - **Por que não um Worker comum:** ele enxergaria o IndexedDB da biblioteca.
- **WASM em Rust (o modelo do Aidoku):** exagero para um projeto pessoal em TypeScript.
- **Índice e confiança:**
  - um `index.json` com a chave pública, a lista de fontes, os domínios de cada uma e o `sha256` de cada bundle, mais uma assinatura **Ed25519** (WebCrypto ou `@noble/ed25519`, MIT);
  - o app fixa a chave ao adicionar o repositório, como o Mihon fixa a impressão digital;
  - um domínio novo numa atualização pede confirmação.
- **Separação jurídica, como no Mihon:**
  - o repositório público do Folheia traz **o mecanismo** e só fontes legítimas (OPDS, Internet Archive via IIIF, Wikimedia);
  - as fontes pessoais ficam fora, num repositório só de índice ou importadas de um arquivo local guardado no IndexedDB;
  - o GitHub Pages de repositório privado exige plano pago.

### 5.4 Caminho em etapas

1. **Interface de catálogo + OPDS (o site continua estático).**
   - Uma interface `CatalogSource` (listar, buscar, detalhes, capítulos, páginas) separada da `PageSource`. Um capítulo vira uma `PageSource` de imagens.
   - Implementações: OPDS 1.2 com streaming de páginas (OPDS-PSE) e Internet Archive via IIIF, com curadoria de domínio público.
   - Com o **Suwayomi no Mac + Tailscale**, isso já dá acesso a todas as fontes do Mihon sem escrever nenhuma.
   - **Entrega 80% do valor com quase nenhum código de fonte para manter.**
2. **Fontes JS isoladas + repositório próprio.**
   - QuickJS-WASM, índice assinado e importação de arquivo.
   - Na web, a rede ainda depende de CORS ou do userscript.
3. **Rede de verdade.**
   - No app Capacitor: HTTP nativo e WebView para o Cloudflare.
   - Na web, opcionalmente, um Worker próprio.

**Regras do CLAUDE.md que cada etapa mexe (decisão do Artur):**

- **Etapa 1:** a regra 2 passa a aceitar "servidores **adicionados pelo usuário** e catálogos de domínio público listados".
- **Etapa 2:** a regra 2 passa a aceitar "código de fontes instaladas pelo usuário, isolado e sem acesso ao armazenamento". A regra "sem scripts de terceiros" ganha a ressalva de que esse código nunca roda no contexto da página.
- **Etapa 3, com proxy:** "100% estático" vira "site estático + proxy pessoal opcional".

**Em todas as etapas, os arquivos do usuário continuam no aparelho.**

**Riscos que a técnica não muda:**

- **Jurídico:** o conteúdo de scan é dos autores.
- **Termos de uso:** os ToS de cada site continuam valendo.
- **Manutenção:** os sites mudam toda semana, e é por isso que o keiyoushi precisa de CI e comunidade.

### 5.5 Explicado sem jargão: por que o site é difícil e como cada caminho funciona

**O problema (CORS).**

- Quando uma página da web tenta ler dados de **outro site**, o navegador só entrega a resposta se esse outro site disser "pode" (o cabeçalho `Access-Control-Allow-Origin`). É uma proteção: sem ela, qualquer página que você abrisse poderia ler o seu e-mail ou o seu banco usando a sua sessão.
- Os sites de mangá não dizem "pode". Então o Folheia, rodando em `artursantiago.github.io`, até consegue **mostrar** uma imagem deles numa `<img>`, mas não consegue **ler** a página HTML para descobrir quais capítulos e imagens existem.
- Além disso, muitos sites exigem cabeçalhos como `Referer` ("vim do próprio site"), e o navegador proíbe a página de mudar esses cabeçalhos.

**Por que o app não tem esse problema.**

- CORS é regra **do navegador**. Um app nativo faz a requisição como um programa qualquer, igual ao `curl`. O Mihon é um app Android, então lê qualquer site e põe os cabeçalhos que quiser.
- O app Folheia feito com Capacitor tem o mesmo poder: o `CapacitorHttp` troca o `fetch` da página por uma requisição nativa.

**Então todo caminho para o site estático é "alguém de fora do navegador faz a requisição por nós".** Muda só quem é esse alguém.

1. **Suwayomi no Mac (+ Tailscale para o iPad).**
   - **O que é:** um programa (Java) que você roda no Mac. Ele instala as **mesmas extensões do Mihon** e faz o papel do app: visita os sites, lê os capítulos e baixa as imagens.
   - **Como o Folheia conversa com ele:** pelo **OPDS**, um formato padrão de "catálogo de livros" (um feed com listas, busca e links). O Suwayomi já libera o CORS para qualquer origem.
   - **Por que o Tailscale:**
     - O site do Folheia é HTTPS. O navegador não deixa uma página HTTPS falar com `http://192.168.0.10` (conteúdo misto).
     - O Tailscale é uma rede privada entre os seus aparelhos, gratuita no plano pessoal. O recurso **Serve** dá ao Mac um endereço `https://seu-mac.tailnet.ts.net` com certificado válido.
     - Resultado: o iPad acessa o Suwayomi de qualquer lugar, com HTTPS, sem abrir porta no roteador.
   - **Para que serve:** testar e usar todas as fontes **sem escrever nenhuma**. O Folheia só precisa ser um bom cliente OPDS, e esse mesmo cliente serve para Komga e Kavita.
   - **Limites:**
     - o Mac precisa estar ligado;
     - é mais um programa para manter (Java);
     - os sites veem o IP da sua casa, o que é bom, porque o Cloudflare desconfia menos.
2. **Userscript no Safari.**
   - **O que é:** "Userscripts" é um app gratuito que adiciona uma extensão ao Safari e roda pequenos scripts seus em sites escolhidos.
   - **Por que funciona:** o script roda **como extensão**, e extensões têm permissão para ler outros sites. Ele ficaria ativo só no site do Folheia. A página pede por mensagem "busca essa URL com esses cabeçalhos", e o script devolve o conteúdo.
   - **Para que serve:** testar fontes no iPad e no Mac **sem servidor e sem app**, só com um script de ~40 linhas.
   - **Limites:**
     - é um pedaço fora do site, instalado à mão em cada aparelho;
     - ainda não testamos se ele manda os cookies do Safari, o que ajudaria com o Cloudflare;
     - no Chrome do Android existe o equivalente (Tampermonkey e outros), mas lá o app nativo é melhor.
3. **Proxy próprio no Cloudflare Workers.**
   - **O que é:** um pedacinho de código nosso que roda nos servidores da Cloudflare. O Folheia pede "busca essa URL" ao proxy, o proxy busca no site e devolve com o CORS liberado.
   - **Custo:** grátis até 100 mil requisições por dia, bem mais que o uso pessoal.
   - **Fechado só para você:** um token secreto, a conferência de que o pedido vem do site do Folheia e uma lista de domínios permitidos, para não virar proxy aberto.
   - **Limites:**
     - deixa de ser 100% estático: é um servidor, mesmo que gratuito e nosso;
     - as consultas passam pela Cloudflare;
     - muitos sites de mangá ficam atrás da própria Cloudflare e **bloqueiam pedidos vindos de Workers** ou de IPs de datacenter.
4. **Proxy local no Mac.** É a mesma ideia do item 3, mas como um script de ~50 linhas rodando no Mac (Deno ou Node). Usa o IP da sua casa. Do iPad, só pelo Tailscale. Na prática, o Suwayomi é uma versão pronta e muito mais completa disso.

### 5.6 Site estático × app Android

**Direção atual (20/10/2026):** o app nativo será **só Android**, instalado por APK, sem loja. O Artur não pretende pagar a conta de desenvolvedor da Apple.

**Como seria testar no iPhone/iPad sem pagar** (fica registrado):

- Com uma **conta Apple gratuita** no Xcode, dá para instalar o app no próprio aparelho por cabo. Mas ele **expira em 7 dias** (é preciso reinstalar), com no máximo 3 apps.
- O **AltStore** e o **SideStore** automatizam essa reinstalação semanal.
- Funciona, mas é chato. **No iPad, o caminho continua sendo o site/PWA.**

**Consequência importante.** O aparelho principal de leitura e de testes de desempenho é o **iPad**, que vai usar o **site**. Fontes que só funcionam no app Android não aparecem no iPad. No iPad, as fontes dependem dos caminhos de §5.5 (Suwayomi + Tailscale, userscript ou proxy).

|                         | Site estático (iPad, Mac, qualquer navegador)                                                                     | App Android (APK)                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Rede**                | Só hosts com CORS, ou por um intermediário (§5.5)                                                                 | Nativa, sem CORS, com qualquer cabeçalho                                |
| **Cloudflare**          | Só via Suwayomi, que usa o IP de casa (e opcionalmente o FlareSolverr)                                            | WebView interno que compartilha cookies com o HTTP nativo, como o Mihon |
| **Fontes possíveis**    | OPDS (Komga, Kavita, Calibre-web, Suwayomi); Internet Archive (IIIF); fontes JS **se** houver userscript ou proxy | OPDS; fontes JS rodando direto                                          |
| **Instalação**          | Já existe (PWA)                                                                                                   | APK pelo GitHub Releases, instalado à mão                               |
| **Custo**               | 0                                                                                                                 | 0                                                                       |
| **Regras do CLAUDE.md** | Regra 2 (servidores do usuário); "100% estático" só se houver proxy                                               | Regra 2; código de fontes isolado                                       |

**Leitura disso:**

- O **cliente OPDS** é a única peça que funciona igual nos dois mundos. Por isso faz sentido como primeiro passo.
- As **fontes JS** fazem mais sentido quando o app Android existir.
- No iPad, o Suwayomi entrega o equivalente.

**Opção descartada: carregar as extensões do Mihon direto no app Android.** Seria preciso um plugin nativo em Kotlin que imitasse o ambiente do Mihon (é o que o Suwayomi faz no servidor). Seria trabalho grande, preso ao formato deles, e exigiria reproduzir a API deles, o que esbarra na regra de clean room. Se o objetivo é ter essas fontes, o Suwayomi já resolve.

## 6. Desempenho: Mihon × Folheia

Comparação do caminho de uma página até a tela, feita com o código do Folheia depois dos commits `dff57d5` e `c5006e6`.

### 6.1 O Folheia hoje

- **PDF:**
  - O PDF.js (no worker) faz o parse e decodifica o JPEG embutido **em resolução cheia**. A decodificação é nativa se `ImageDecoder` existir, ou em JS puro se não existir.
  - A pintura é na thread principal, num canvas na CPU.
  - O `toBlob` recomprime em WebP (JPEG no Safari).
  - Por fim, Blob URL → `<img>` → `decode()`.
  - O `page.cleanup()` depois de cada render faz qualquer novo render da mesma página (prévia, nítida, tile de zoom) **refazer o parse e a decodificação**.
- **CBZ:**
  - A leitura do ZIP é com acesso aleatório de verdade (melhor que o Mihon).
  - Depois, `createImageBitmap` em resolução cheia → canvas → **recompressão** → `<img>`.
  - Ou seja: o arquivo já traz um JPEG, e o Folheia decodifica, desenha, comprime **outro** JPEG e decodifica esse de novo.
- **Cache, fila e virada:**
  - Cache LRU por bytes comprimidos (48 MB no iOS).
  - Fila única com prioridade e cancelamento, pausada durante a virada.
  - Nítidas para o spread atual, 2 à frente e 1 atrás; prévias até ~6 páginas.

### 6.2 O Mihon

- **Leitor clássico:**
  - Mantém **1 página de cada lado já decodificada e montada** antes do gesto, por isso não aparece página vazia.
  - A página é decodificada **direto do arquivo comprimido**, subamostrada só o bastante para a tela.
  - No zoom, decodifica **tiles por região** do original.
  - **Não recomprime** e não tem prévia: a camada base já é a imagem certa.
- **Recompressão:** só acontece ao dividir ou girar spreads, e é cara lá também.
- **Visualizador experimental (WebGPU):**
  - Thread própria de decodificação, janela de 3 à frente e 2 atrás.
  - O que sai do cache é **a página mais distante**, e a página **em virada fica presa** até a animação acabar.
  - A prévia progressiva **atualiza a mesma textura**, sem trocar de elemento, então não pisca.
  - A virada é um shader sobre texturas que já estão na GPU.
- **Webtoon:** decodifica uma vez, reduzido, corta em faixas e desenha só as visíveis. Só uma decodificação pesada roda por vez.

### 6.3 Limites da web e o que dá para adotar

- **O que a web não tem:**
  - decodificação por região;
  - controle do formato de pixel;
  - garantia de decodificação já reduzida.

  Além disso, o PDF.js pinta na thread principal, o iOS tem tetos de memória de canvas que a página não enxerga, e WebGPU não pode ser requisito no Safari 18.

- **O que dá para adotar:**
  - `createImageBitmap(blob, {resizeWidth, resizeQuality})`, que funciona nos três motores, inclusive em worker;
  - canvas com contexto `bitmaprenderer` para exibir sem cópia;
  - `OffscreenCanvas.convertToBlob` em worker (no WebKit só sai JPEG ou PNG);
  - despejo do cache por distância;
  - planejar o render pelo destino da virada.

### 6.4 Achados no nosso código

1. **Plano velho ao retomar a fila:** no fim da virada, a fila é retomada **antes** de o novo plano ser calculado. Assim, um job do plano anterior roda primeiro. Nas viradas rápidas, essa é quase a única janela de trabalho que existe.
2. **Despejo invertido:** a ordem de acesso faz o LRU despejar a página **da frente antes da de trás**. O critério certo é a distância.
3. **`crossfade` clona o livro:** os `<img>` clonados podem ter que decodificar de novo, e um `<canvas>` clonado vem **em branco**. Isso importa se passarmos a exibir com canvas.
4. **Medir o iPad em HTTPS:** o `ImageDecoder` só existe em contexto seguro. Por `http://192.168…`, o PDF.js cai no decodificador JPEG em JS, e a medição fica pior do que o real.

### 6.5 Experimentos, em ordem

| #   | Experimento                                                                                                                     | Impacto                 | Esforço | Risco                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------- | --------------------------------- |
| P0  | Medir antes no `#/lab`: decodificação cheia × reduzida, `toBlob`, divisão do render do PDF.js, `ImageDecoder` em HTTPS × HTTP   | Decide os demais        | P       | Nenhum                            |
| P1  | Planejar pelo destino das viradas enfileiradas; calcular o plano antes de retomar a fila                                        | Médio (viradas rápidas) | P       | Baixo                             |
| P2  | Janela quente em `ImageBitmap` exibido em canvas `bitmaprenderer`; comprimir só o que sai da janela                             | Alto                    | M       | Médio (memória do iOS)            |
| P3  | CBZ sem recompressão: o Blob original é o cache frio; `createImageBitmap` reduzido num worker                                   | Alto (CBZ)              | M       | Baixo                             |
| P4  | HQ em PDF: se a página for uma imagem só (`getOperatorList`), decodificar uma vez e tirar nítida, prévia e zoom do mesmo bitmap | Alto (HQ em PDF)        | M       | Médio (formato interno do PDF.js) |
| P5  | Despejo por distância e páginas da virada presas                                                                                | Médio                   | P       | Baixo                             |
| P6  | Não limpar a página visível do PDF.js durante o zoom                                                                            | Médio (zoom)            | P       | Médio (memória)                   |
| P7  | Comparar `enableHWA` ligado e desligado (A/B)                                                                                   | Desconhecido            | Mínimo  | Baixo                             |
| P8  | Deixar rodar durante a virada o que roda em worker                                                                              | Médio-alto              | M       | Médio (engasgos)                  |
| P9  | Tiles de zoom em grade, reaproveitados                                                                                          | Médio                   | M-G     | Médio                             |
| P10 | Leitor de PDF próprio que passa o JPEG embutido direto (o PDF de HQ vira um "CBZ")                                              | Muito alto (HQ em PDF)  | G       | Alto                              |

**Ordem sugerida:** P0 → P1 + P5 → P2/P3 juntos → P4 → P6/P7 → P8 → P9 → P10 (só se P0 e P4 mostrarem que a decodificação é o gargalo).

**Como medir:** com `e2e/engine.spec.ts` e `e2e/flip.spec.ts` (`FOLHEIA_FIXTURE=fixtures/personal/invincible-vol-1.pdf`, e um CBZ pessoal gerado das mesmas páginas). Memória e iPad real só aparecem no Web Inspector, **em HTTPS**.

## 7. O que encaixa no Folheia

**Mangá encaixa.** Um volume de mangá em CBZ ou PDF é um livro paginado da direita para a esquerda, e o Folheia já tem:

- RTL por ajuste, URL, PDF e `ComicInfo.xml`;
- spreads e páginas em branco virtuais.

Nisso estamos à frente do Mihon, que não lê `Manga`, `DoublePage` nem `FrontCover`. O que falta vem do §2: dica de zonas, ajustes por livro, pareamento e "zoom e percorrer".

**Webtoon** cabe depois, como o modo de rolagem vertical do backlog, com a técnica das faixas.

**Biblioteca pessoal.** O conceito de "série → capítulos" vira "livro = arquivo", com "série" como agrupamento opcional, vindo do `ComicInfo.xml` (Series + Number) ou criado à mão. Na linguagem Ex-libris:

| Mihon                                         | Folheia                                                                                          | Prioridade |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------- |
| Biblioteca como tela inicial                  | **Acervo** ("Meus livros")                                                                       | alta       |
| Categorias, várias por item                   | **Estantes**; "Default" vira "Por catalogar"                                                     | alta       |
| Diálogo de categorias de três estados em lote | Remanejar vários livros de estante                                                               | alta       |
| Grade, lista, colunas por orientação          | Grade de capas, lista e **fichário**; colunas por orientação no iPad                             | alta       |
| Selos na capa                                 | Progresso, "novo", "concluído", formato                                                          | alta       |
| Ficha da série                                | **Ficha catalográfica** do livro: metadados, nº de tombo, estantes, notas; tocar no autor filtra | alta       |
| (lacuna do Mihon)                             | **Marcadores de página** com miniatura, na ficha, e filtro "com marcadores"                      | alta       |
| Histórico com tempo de leitura                | **Registro de leitura** (empréstimos), agrupado por dia, que retoma ao tocar                     | alta       |
| Desfazer (perdido no Mihon)                   | Desfazer ao remover livro, estante ou marcador                                                   | alta       |
| Estados vazios com kaomoji                    | Mensagens no tom da biblioteca ("Esta estante ainda está vazia")                                 | alta       |
| Trilho lateral e dois painéis no tablet       | Trilho no iPad; acervo e ficha lado a lado                                                       | alta/média |
| "Definir como capa" no leitor                 | Escolher uma página como capa                                                                    | média      |
| Duplicatas ao adicionar                       | "Exemplar repetido" (mesmo arquivo)                                                              | média      |
| Notas por série                               | Notas por livro, que entram na busca                                                             | média      |
| Modo anônimo                                  | Leitura sem registro                                                                             | média      |
| Estatísticas                                  | Relatório da biblioteca (livros, concluídos, páginas, tempo)                                     | média      |
| Backup granular e CSV                         | Exportar e importar o acervo (estantes, progresso, marcadores, notas) em JSON, sem os arquivos   | média      |
| Busca com mini-linguagem                      | Busca simples primeiro; campos depois                                                            | alta/baixa |
| Rótulo só ao segurar                          | **Não**: no iPad, mostrar rótulos sempre (acessibilidade)                                        | não        |
| Atualizações e calendário                     | Só se as fontes (§5) existirem                                                                   | depende    |
| Rastreadores com OAuth                        | Fere a privacidade                                                                               | não        |

## 8. Candidatos para o Folheia (para triagem)

Lista viva dos pontos deste estudo que podem entrar no app. **Nada aqui está decidido.**

- **Triagem:** o Artur dá a nota e decide **se** entra e **como** entra. A coluna "Decisão" fica para isso.
- **Depois de decidido:** o item vai para o backlog do `plano-mvp.md` §8, na seção certa, para ser sabatinado antes de implementar.
- **Novos candidatos** vindos de outros estudos podem entrar aqui também.

**Escalas:**

- **Esforço:** P (pequeno), M (médio), G (grande).
- **Impacto:** baixo, médio, alto. É um palpite; a triagem pode mudar.

### 8.1 Leitor

| ID  | Candidato                                                                                                  | Ref. | Esforço | Impacto | Decisão |
| --- | ---------------------------------------------------------------------------------------------------------- | ---- | ------- | ------- | ------- |
| L1  | Progresso gravado só quando a leitura para numa página, com gravação garantida ao sair                     | §2.4 | P       | médio   |         |
| L2  | Dica visual das zonas de toque na primeira leitura (componente Ex-libris, respeita reduced-motion)         | §2.2 | P       | médio   |         |
| L3  | "Zoom e percorrer" spreads largos em tela de uma página (iPad em pé), como alternativa a dividir           | §2.3 | M       | alto    |         |
| L4  | Pareamento de página dupla: paridade recomeça depois de página sozinha; só parear proporções parecidas     | §2.3 | P       | médio   |         |
| L5  | Ajustes por livro (direção, modo, escala) sobre os globais, com aviso curto ao abrir                       | §2.1 | M       | médio   |         |
| L6  | Fundo automático pela cor da borda da página (modo "só o livro")                                           | §2.3 | P       | baixo   |         |
| L7  | Cortar margens brancas e pretas de PDFs escaneados (desligado no modo duplo)                               | §2.3 | M       | médio   |         |
| L8  | Slider de páginas que se inverte em RTL + indicador "n / total" discreto                                   | §2.4 | P       | médio   |         |
| L9  | Brilho, sépia e inverter com pré-visualização ao vivo (camada própria, sem CSS `filter` no livro ampliado) | §2.4 | M       | baixo   |         |
| L10 | Toque longo na página: usar como capa, salvar, compartilhar (no PDF, fora da camada de texto)              | §2.4 | M       | baixo   |         |
| L11 | Layouts de toque alternativos (L, Kindle, bordas) e inversão                                               | §2.2 | M       | baixo   |         |
| L12 | Modo de rolagem vertical (webtoon) com faixas, só as visíveis desenhadas, altura reservada                 | §2.3 | G       | médio   |         |

O L8 coincide com o slider do item B5, que já está sendo feito em outra sessão (20/10/2026).

### 8.2 Desempenho

Os detalhes e a ordem estão em §6.5. O P0 decide o resto.

| ID  | Candidato                                                                          | Esforço | Impacto                | Decisão |
| --- | ---------------------------------------------------------------------------------- | ------- | ---------------------- | ------- |
| P0  | Medir antes no `#/lab` (e o iPad sempre em HTTPS)                                  | P       | decide os demais       |         |
| P1  | Plano antes de retomar a fila; planejar pelo destino das viradas enfileiradas      | P       | médio                  |         |
| P2  | Janela quente em `ImageBitmap` exibida em canvas; comprimir só o que sai da janela | M       | alto                   |         |
| P3  | CBZ sem recompressão (Blob original + `createImageBitmap` reduzido em worker)      | M       | alto                   |         |
| P4  | HQ em PDF: decodificar uma vez a imagem única da página para nítida, prévia e zoom | M       | alto                   |         |
| P5  | Despejo do cache por distância; páginas da virada presas                           | P       | médio                  |         |
| P6  | Não limpar a página visível do PDF.js durante o zoom                               | P       | médio                  |         |
| P7  | `enableHWA` A/B                                                                    | P       | ?                      |         |
| P8  | Trabalho em worker continua durante a virada                                       | M       | médio-alto             |         |
| P9  | Tiles de zoom em grade, reaproveitados                                             | M-G     | médio                  |         |
| P10 | Leitor de PDF próprio que passa o JPEG embutido direto                             | G       | muito alto (HQ em PDF) |         |

### 8.3 Interface e biblioteca

> **Cuidado: isto é um redesign grande.** Trazer a organização do Mihon (acervo, estantes, ficha, registro) muda a tela inicial, a navegação e o papel do "Recentes". **Antes de qualquer item abaixo**, é preciso um **estudo de interface próprio** (o I0):
>
> - fluxos;
> - protótipo na linguagem Ex-libris, revisando o protótipo aprovado;
> - o que muda no iPad, no celular e no app Android.
>
> Os itens abaixo são entradas para esse estudo, não tarefas.

| ID  | Candidato                                                                                     | Ref.       | Esforço | Impacto | Decisão |
| --- | --------------------------------------------------------------------------------------------- | ---------- | ------- | ------- | ------- |
| I0  | **Estudo de interface e redesign** da biblioteca pessoal (pré-requisito dos demais)           | §3, §7     | M       | alto    |         |
| I1  | Acervo como tela inicial ("Meus livros"), substituindo o papel do "Recentes"                  | §3.2       | G       | alto    |         |
| I2  | Estantes (um livro em várias; "Por catalogar"; remanejar em lote com caixas de três estados)  | §3.2       | M       | alto    |         |
| I3  | Exibição: grade de capas, lista e fichário; colunas por orientação                            | §3.2       | M       | médio   |         |
| I4  | Selos na capa (progresso, novo, concluído, formato)                                           | §3.2       | P       | médio   |         |
| I5  | Ficha catalográfica do livro (metadados, nº de tombo, estantes, notas; tocar no autor filtra) | §3.3       | M       | alto    |         |
| I6  | Marcadores de página com miniatura (lacuna do Mihon) e filtro "com marcadores"                | §3.5       | M       | alto    |         |
| I7  | Registro de leitura (agrupado por dia, retoma ao tocar, tempo de leitura)                     | §3.4       | M       | médio   |         |
| I8  | Desfazer (remover livro, estante, marcador) e estados vazios no tom da biblioteca             | §3.6       | P       | médio   |         |
| I9  | iPad: trilho lateral de navegação e dois painéis (acervo + ficha)                             | §3.1, §3.3 | M       | médio   |         |
| I10 | Busca no acervo (simples primeiro; campos tipo `autor:` depois)                               | §3.2       | P-M     | médio   |         |
| I11 | Série como agrupamento opcional (do `ComicInfo.xml` Series + Number, ou à mão)                | §7         | M       | médio   |         |
| I12 | Escolher uma página como capa                                                                 | §3.3       | P       | baixo   |         |
| I13 | Aviso de exemplar repetido ao adicionar                                                       | §3.3       | P       | baixo   |         |
| I14 | Leitura sem registro (modo anônimo)                                                           | §3.4       | P       | baixo   |         |
| I15 | Estatísticas ("relatório da biblioteca")                                                      | §3.4       | M       | baixo   |         |
| I16 | Exportar e importar o acervo em JSON (sem os arquivos); essencial antes do app                | §3.4       | M       | médio   |         |

### 8.4 Fontes e catálogos

Por onde passa a rede: §5.5 e §5.6. "Web" é o site (iPad); "Android" é o app.

| ID  | Candidato                                                                                                      | Web                                | Android       | Esforço | Decisão |
| --- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------- | ------- | ------- |
| F1  | Interface de catálogo (`CatalogSource`) separada da `PageSource`; um capítulo vira uma `PageSource` de imagens | sim                                | sim           | M       |         |
| F2  | Cliente OPDS 1.2/2.0 + streaming de páginas (OPDS-PSE): Komga, Kavita, Calibre-web, Suwayomi                   | sim (o servidor libera o CORS)     | sim           | M       |         |
| F3  | Guia: Suwayomi no Mac + Tailscale Serve, para ter as fontes do Mihon no iPad                                   | sim                                | sim           | P (doc) |         |
| F4  | Internet Archive via IIIF (só itens de domínio público)                                                        | sim                                | sim           | M       |         |
| F5  | Fontes JS isoladas (QuickJS-WASM), com índice assinado (Ed25519) num repositório próprio                       | só com userscript ou proxy (F6/F7) | sim           | G       |         |
| F6  | Userscript de rede para o Safari                                                                               | sim                                | —             | P       |         |
| F7  | Proxy próprio no Cloudflare Workers (token + lista de domínios)                                                | sim                                | desnecessário | P       |         |
| F8  | No app: `CapacitorHttp` + WebView interno para o Cloudflare (cookies compartilhados)                           | —                                  | sim           | M       |         |

Mudanças de regra no `CLAUDE.md` que esses itens exigem: §5.4.

### 8.5 Plataforma e repositórios

| ID  | Candidato                                                                                 | Esforço | Decisão |
| --- | ----------------------------------------------------------------------------------------- | ------- | ------- |
| O1  | App nativo **só Android** (APK pelo GitHub Releases, sem loja); iPad continua no site/PWA | —       |         |
| O2  | Organização dos repositórios: monorepo × organização com vários repositórios (abaixo)     | P       |         |

**O2: monorepo ou organização?**

- **Hoje:** um repositório, `folheia`, com o site e os motores.
- **O que entra de novo com os planos:**
  - o app Android (Capacitor);
  - talvez um pacote com os tipos e o SDK das fontes;
  - as fontes públicas legítimas (OPDS, Internet Archive);
  - as fontes pessoais.
- **A favor do monorepo**, para tudo que é público:
  - **IA:** um só contexto, um `CLAUDE.md`, mudanças atômicas entre o app, o SDK e as fontes. Uma mudança na interface de fonte e nas fontes que a usam sai num commit só.
  - **Capacitor:** a pasta `android/` normalmente mora **no mesmo repositório** do site, porque o app empacota o mesmo build.
  - **Uma configuração para tudo:** lint, testes, CI e regras.
  - **Quando dividir em pacotes:** quando surgir o segundo pacote (por exemplo, o SDK das fontes), usar **npm workspaces** (`packages/`, `apps/`), sem ferramenta extra.
- **O que precisa ficar separado:** as **fontes pessoais**. Elas não podem morar no repositório público (MIT, com o seu nome) nem ser linkadas pelo site. Pode ser:
  - um repositório à parte, que serve só o índice e os bundles (público mas sem link, porque GitHub Pages de repositório privado exige plano pago);
  - ou um arquivo importado localmente.

  É a mesma separação que o Mihon faz (app oficial, extensões da comunidade).

- **Organização no GitHub:**
  - **O que dá:** um nome mais bonito (`folheia.github.io`) e espaço para os repositórios, sem custo.
  - **Cuidado:** mudar o endereço do site **muda a origem**, e o navegador trata a nova como outro site. O que está guardado localmente (Recentes, progresso, PWA instalado) **fica na origem antiga**.
  - **Se for criar:** antes de a biblioteca ter dados que importam, ou com o exportar/importar (I16) pronto.
  - O base path já é configurável, então o código não precisa mudar.
- **Recomendação:**
  - **monorepo** no repositório atual, com workspaces quando houver o segundo pacote;
  - **um repositório separado só para as fontes pessoais**;
  - organização é opcional e estética. Se quiser, que seja cedo.
