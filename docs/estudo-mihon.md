# Folheia — Estudo do Mihon

> 20/10/2026. O Artur usa o Mihon, um leitor de mangá open source para Android, e pediu um estudo do leitor, das telas, do sistema de fontes/extensões e do desempenho. Este documento é a referência completa. O `estudo-referencias.md` §13 traz só um resumo.

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
| Internet Archive: `download/`                   | Sem CORS.                                                                                                          |
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
