# Folheia — Estudo da ponte de rede (extensão e userscript)

> 20/10/2026. Estudo de viabilidade e prova de conceito (POC) de uma **ponte de rede**: uma extensão de navegador ou um userscript que faz requisições entre origens **a pedido do site do Folheia**, sem CORS e com `Referer`/`User-Agent` próprios, para servir às futuras fontes de catálogo. Continua o `estudo-mihon.md` §5.1, §5.5, §5.6 e §8.4 (F6).
>
> **Como foi feito:** documentação oficial (links em cada seção e no §13), issues e READMEs dos próprios projetos, e testes de verdade: a extensão carregada no Chromium pelo Playwright e requisições reais à API do MangaDex, ao Internet Archive e a outras fontes (§9). Nada de código de terceiros entrou no repositório; o código das extensões do Mihon (keiyoushi, Apache-2.0) foi lido por um agente separado só para saber quais URLs e cabeçalhos cada site usa.

## 1. Resumo

- **Funciona.** A POC, no Chrome e no Firefox, lê sites que bloqueiam o Folheia por CORS. Também põe `Referer` e `User-Agent` (inclusive nas `<img>` da própria página), transmite binários grandes em pedaços, cancela e recusa destinos não aprovados. Os testes automatizados (e2e) cobrem tudo isso nos dois navegadores.
- **Com fontes de verdade:** testamos 12 das fontes mais conhecidas do repositório do Mihon, entre elas MangaDex, MANGA Plus, Webtoons, Weeb Central e Asura. **9 funcionam pela ponte**, catálogo e capa. Duas param no desafio do Cloudflare, e uma exige assinatura própria (§9). Sem a ponte, a página não lê quase nenhuma.
- **iPad:** o único caminho gratuito é um **userscript nosso no app Userscripts** (grátis, App Store). Ele fura o CORS, mas com três limites:
  - **não define `Referer`** (o `User-Agent`, sim);
  - os **binários custam mais**, porque o app serializa cada byte como um número. No simulador deu ~7 MB/s, aceitável para páginas de quadrinho;
  - o usuário precisa liberar a extensão em **"Todos os sites"**.
- **Testado no simulador do iPad** (Safari do iPadOS 26.2, §9.1):
  - o userscript no Userscripts funciona;
  - **o `User-Agent` muda, o `Referer` não**;
  - o `Referer` não muda nem pela extensão Safari, nem nas `<img>` da página: o Safari só deixa apagar esse cabeçalho;
  - por isso as capas de Webtoons, MangaPill e MangaK não abrem no iPad.
- **Capas em qualquer ambiente:** um catálogo de metadados (AniList, que libera CORS, ou a própria MangaDex), com a capa tipográfica do Folheia como reserva (§9.2).
- **Desktop e Android:** uma **extensão MV3 nossa** (Chrome/Edge e Firefox, o mesmo código) faz tudo, inclusive `Referer`/`User-Agent` e binários rápidos.
  - **Distribuição grátis:** Firefox (assinatura "unlisted" no AMO, instala no Android por arquivo) e Edge Add-ons.
  - **Chrome:** modo desenvolvedor, ou a taxa única da Chrome Web Store.
- **Extensão Safari de verdade:** exige o Xcode, e no iPad só funciona com o time pessoal grátis, reinstalando a cada 7 dias. Não vale.
- **Recomendação:**
  1. Seguir com a extensão (Firefox primeiro, pelo Android) e o userscript para o iPad, a partir desta POC.
  2. Antes de usar de verdade, o Artur decide a mudança da regra 2 do `CLAUDE.md` (§11).

## 2. O problema, em uma linha

O site do Folheia não consegue **ler** respostas de sites sem CORS nem definir `Referer`/`User-Agent` (detalhes no `estudo-mihon.md` §5.1 e §5.5). Uma extensão consegue: o fetch do contexto privilegiado dela (background) é isento de CORS para os hosts que o usuário concedeu. A ponte é só isso: **a página pede, a extensão busca e devolve.**

## 3. Safari (iPad, iPhone, Mac)

### 3.1 App Userscripts (quoid)

- **O que é:** um app gratuito da App Store que instala uma extensão no Safari e roda os scripts `.user.js` que você coloca numa pasta.
  - **Licença:** GPL-3.0. Não importa para nós: é só o "hospedeiro", instalado pelo usuário. Nosso script é MIT e escrito do zero, e não copiamos nada dele.
  - Fonte: [README](https://github.com/quoid/userscripts), [App Store](https://apps.apple.com/br/app/userscripts/id1463298887).
- **Requisições:** tem `GM.xmlHttpRequest`, que devolve uma promise com `.abort()`, e `GM_xmlhttpRequest`.
  - **Opções:** `url`, `method`, `headers`, `data`, `responseType` (como no XHR, inclusive `arraybuffer` e `blob`), `timeout` e os handlers `on*`.
  - **A resposta:** traz `status`, `responseHeaders` (texto), `response` e **`responseURL`** (nos outros gerenciadores é `finalUrl`).
  - Fonte: README, seção API.
- **`@connect` é ignorado.** O app não usa essa chave ([issue #260](https://github.com/quoid/userscripts/issues/260)), então a lista de hosts permitidos tem que estar no próprio script. A POC faz isso.
- **`@inject-into content` é obrigatório:** as APIs GM só existem no contexto de content script, e não há `unsafeWindow` ([#252](https://github.com/quoid/userscripts/issues/252), [#783](https://github.com/quoid/userscripts/issues/783)). A conversa com a página tem que ser por `window.postMessage`, que é o que o nosso protocolo usa.
- **Permissão de host:** desde o Safari 26.2, a requisição só fura o CORS se a extensão tiver permissão **no site de destino**. Sem isso ela sai com `Origin: safari-web-extension://…` e falha com status 0 ([#897](https://github.com/quoid/userscripts/issues/897)).
  - Na prática: Ajustes → Safari → Extensões → Userscripts → **Todos os sites → Permitir**.
- **Cabeçalhos:**
  - O background usa XHR, então valem os [cabeçalhos proibidos](https://developer.mozilla.org/en-US/docs/Glossary/Forbidden_request_header): **`Referer`, `Origin` e `Cookie` são descartados em silêncio** ([#420](https://github.com/quoid/userscripts/issues/420)).
  - **`User-Agent`: muda.** Confirmado no simulador do iPad (§9.1), com um servidor de eco local.
  - **`Referer`: não muda.** Também confirmado no simulador: a requisição sai sem `Referer`.
  - `Range` funciona, porque não é proibido.
- **Cookies do Safari:** o servidor de eco não recebeu cookie nenhum no teste do simulador, mas ele também não tinha cookies para enviar. Continua não confirmado se o Safari mandaria os cookies de um site em que você está logado. O app não tem opção `anonymous`.
- **Binários:** o app converte a resposta em `Array.from(new Uint8Array(buf))`, um array JSON de números, para passar do background ao content script ([código](https://github.com/quoid/userscripts/blob/main/src/ext/background/main.js), [#212](https://github.com/quoid/userscripts/issues/212)).
  - Isso custa várias vezes o tamanho do arquivo em memória e CPU.
  - **Para imagens de 200 KB a 1 MB, deve servir. Para arquivos grandes, só em pedaços com `Range`.** O tempo real precisa ser medido no iPad (§10.4).
- **Sem streaming:** o mantenedor recusa ([#465](https://github.com/quoid/userscripts/issues/465)). A resposta chega inteira.

**Conclusão:** serve para APIs JSON, HTML de catálogo e imagens de sites que **não exigem `Referer`**. Não serve para CDNs com proteção de hotlink. Alternativas parecidas, ainda não investigadas: **Stay for Safari** (grátis) e o **Tampermonkey para Safari** (pago).

### 3.2 Extensão Safari própria

- **Empacotar:** `xcrun safari-web-extension-packager <pasta>` gera um projeto Xcode com um app "contêiner" para o Mac e/ou o iOS ([doc](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari)). O código da nossa extensão MV3 serviria quase igual.
- **Mac, sem conta paga:** Safari → Ajustes → Avançado → "Mostrar recursos para desenvolvedores", depois Desenvolvedor → **"Permitir extensões não assinadas"**. Essa opção **volta ao padrão sempre que o Safari fecha**.
  - Também há "Adicionar extensão temporária", que some em 24 h ([doc](https://developer.apple.com/documentation/safariservices/running-your-safari-web-extension)).
- **iPad, sem conta paga:**
  - A doc de Safari diz que testar num aparelho exige o Apple Developer Program.
  - A doc de contas diz que o time pessoal grátis instala apps no aparelho, com perfil que **expira em 7 dias** ([doc](https://developer.apple.com/help/account/basics/about-your-developer-account)). Que isso funcione para uma extensão Safari não está confirmado.
  - Não há distribuição sem conta paga.
- **Ganhos sobre o userscript:**
  - binários sem a serialização em números;
  - DNR `modifyHeaders` em requisições, desde o Safari 16.4 (`Referer`). Mas o Safari não aceita `tabIds` no DNR, e não está confirmado se ele aplica as regras às requisições da própria extensão ([BCD](https://github.com/mdn/browser-compat-data/blob/main/webextensions/api/declarativeNetRequest.json)).
- **Testado no simulador do iPad** (§9.1): empacotada com `safari-web-extension-packager` e assinada "ad hoc" (sem conta Apple; só vale no simulador).
  - **Funciona:** a ponte é detectada, o pedido de acesso abre a tela da extensão e o Safari mostra o próprio prompt de permissão por site, com "Permitir por um dia" e "Sempre permitir".
  - **`User-Agent` muda. `Referer`, não:** a regra do declarativeNetRequest é aceita, mas o Safari não aplica o `Referer` às requisições da extensão.
  - **Nem nas imagens da própria página (`<img>`):**
    - com a condição `initiatorDomains`, a regra é aceita mas não casa;
    - sem ela, casa, mas o Safari **remove** o `Referer` em vez de trocar o valor.
    - Ou seja: no Safari, uma extensão só consegue apagar o `Referer`, nunca escrever outro. As CDNs que exigem `Referer` recusam a requisição sem ele (§9).
  - **Ajuste necessário:** o Safari precisa de `background.persistent: false` no manifesto. O build da POC já gera assim.
- **Conclusão:** com o Artur sem pagar a Apple, **não vale** no iPad. Fica registrado como caminho se um dia houver a conta paga.

## 4. Chrome e Edge (MV3)

- **CORS:** um fetch no **service worker** da extensão, para hosts com permissão, não tem restrição de origem. No **content script**, tem: ele segue o CORS da página, mesmo com permissão de host ([doc](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests)). Por isso a ponte é content script → service worker.
- **Como a página fala com a extensão:**
  - **Content script + `window.postMessage`** (o que a POC usa): funciona em todos os navegadores e não precisa saber o ID da extensão.
  - **`externally_connectable`**: a página chama `chrome.runtime.sendMessage(ID, …)` direto. Mas exige o ID fixo, e o **Firefox não suporta** ([BCD](https://github.com/mdn/browser-compat-data/blob/main/webextensions/manifest/externally_connectable.json)). Descartado.
- **Mensagens:** o Chrome serializa em **JSON**, com limite de 64 MiB por mensagem ([doc](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)). Um ArrayBuffer não passa, então o corpo vai em **pedaços de 1 MiB em base64**. O content script decodifica e transfere o ArrayBuffer para a página sem cópia.
- **`Referer` e `User-Agent`:**
  - O fetch não aceita `Referer`.
  - O Chrome **descarta `User-Agent` em silêncio** ([MDN](https://developer.mozilla.org/en-US/docs/Glossary/Forbidden_request_header)).
  - A solução é o **declarativeNetRequest** (`modifyHeaders`), que "afeta chamadas a `fetch()` feitas no service worker" ([doc](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)).
  - A POC cria uma regra de sessão por requisição, presa à **URL exata** e a `tabIds: [-1]` (só requisições fora de abas, ou seja, as da extensão), e a apaga no fim. **O teste e2e confirma que os dois cabeçalhos chegam.**
- **Instalação:**
  - **Descompactada:** chrome://extensions → Modo do desenvolvedor → "Carregar sem compactação". Grátis, mas o Chrome mostra um aviso e ela é fácil de desativar sem querer.
  - **Chrome Web Store:** taxa de registro única ([doc](https://developer.chrome.com/docs/webstore/register)).
  - **Edge Add-ons:** grátis ([doc](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account)).
- **Service worker que dorme:** o Chrome para o service worker ocioso. Cada mensagem de pedaço reinicia o relógio. Se ele cair no meio, o content script devolve erro `network` às requisições pendentes e reconecta na próxima.

## 5. Firefox (desktop e Android)

- **Background:** o MV3 do Firefox usa **event page** (`background.scripts`), não service worker. Ele exige `browser_specific_settings.gecko.id` ([guia MV3](https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/)). O build gera um manifesto por navegador; o código é o mesmo.
- **CORS:** a permissão de host dá fetch "sem restrições de origem", menos no content script ([MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/host_permissions)).
- **Permissões:** desde o Firefox 127, as permissões de host aparecem na instalação. O usuário pode concedê-las ou revogá-las depois, uma a uma. A POC confere com `permissions.contains` a cada requisição.
- **Mensagens:** usam **structured clone**, então o ArrayBuffer passa direto, sem base64 ([MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Chrome_incompatibilities)). A POC aproveita isso no Firefox.
- **Cabeçalhos:**
  - O Firefox aceita `User-Agent` no fetch. Mesmo assim, a POC usa o DNR para os dois cabeçalhos, por uniformidade.
  - O DNR existe desde o 113, com `tabIds`.
  - O Firefox ainda tem `webRequestBlocking`, se o DNR falhar.
- **Distribuição grátis e permanente:**
  - Assinatura **unlisted** no AMO (auto-distribuição): validação automática, gera um `.xpi` assinado ([doc](https://extensionworkshop.com/documentation/publish/self-distribution/)). Nenhuma taxa é mencionada.
  - **Firefox para Android (versão normal):** Configurações → Sobre o Firefox → tocar 5× no logo → volta em Configurações → **"Instalar extensão a partir de arquivo"** → escolher o `.xpi` assinado ([doc](https://extensionworkshop.com/documentation/publish/install-self-distributed/#install-addon-from-file-android)).
  - Também dá para publicar listada no AMO, marcada como compatível com Android.
  - **Formulário do AMO:** o manifesto da POC já declara `data_collection_permissions: none`, que o AMO exige para extensões novas.

## 6. Gerenciadores de userscript no lugar de uma extensão

|                        | Userscripts (Safari)                | Violentmonkey                                                | Tampermonkey                                                |
| ---------------------- | ----------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| Licença                | GPL-3.0 (só hospedeiro)             | **MIT**                                                      | Proprietária                                                |
| Onde                   | Safari iOS/iPadOS/macOS, **grátis** | Chrome, Edge, Firefox (inclusive Android). Sem Safari        | Todos; **pago no iOS**                                      |
| `Referer`/`User-Agent` | Não                                 | Sim (a doc lista Cookie, Host, Origin, Referer e User-Agent) | Sim, com ressalvas no Safari e no Android                   |
| Binários               | Array de números (lento)            | `arraybuffer`/`blob`                                         | `arraybuffer`/`blob`/`stream`                               |
| Sem cookies            | Não confirmado                      | `anonymous: true`                                            | `anonymous: true`                                           |
| `@connect`             | Ignorado                            | Não documentado                                              | Aplicado (pergunta ao usuário)                              |
| Chrome 138+            | —                                   | —                                                            | Exige "Permitir scripts de usuário" ou o modo desenvolvedor |

Fontes: [Violentmonkey API](https://violentmonkey.github.io/api/gm/), [Tampermonkey GM_xmlhttpRequest](https://www.tampermonkey.net/documentation.php?locale=en&q=GM_xmlhttpRequest), [@connect](https://www.tampermonkey.net/documentation.php?locale=en&q=connect), [FAQ Q209](https://www.tampermonkey.net/faq.php?locale=en&q=Q209).

**Leitura:**

- Fora do Safari, a **extensão própria é melhor que um gerenciador**:
  - a aprovação por site é a do próprio navegador;
  - não depende de terceiros;
  - tem streaming.
- O userscript existe **pelo iPad**, e de quebra roda no Violentmonkey (MIT), o que é útil para testar.
- **Nenhuma dependência nova entrou no `package.json`.** Os gerenciadores são programas que o usuário instala; não fazem parte do Folheia.

## 7. Modelo de segurança (implementado na POC)

O risco de uma ponte é virar um **proxy aberto**: qualquer página usando a extensão para ler sites com a rede do usuário. As defesas, em camadas:

1. **Só páginas do Folheia.**
   - O content script só é injetado em `https://folheia-app.github.io/folheia/*`.
   - O build de desenvolvimento (`--dev`) acrescenta `localhost` e `127.0.0.1`. No build normal eles ficam de fora, porque qualquer servidor local contaria como Folheia.
   - O background confere de novo a URL de quem conecta (`isFolheiaPage`) e aceita só o frame principal.
   - Outra implantação (outro domínio ou caminho base) se acrescenta em `FOLHEIA_MATCHES` e `isFolheiaPage`. As duas listas estão juntas no código.
2. **Só mensagens da própria página.** O content script ignora mensagens de outros frames ou janelas (`event.source === window` e `event.origin === location.origin`) e repassa à extensão só os campos conhecidos.
3. **Só destinos aprovados pelo usuário.**
   - A lista de sites permitidos é a **permissão de host do navegador** (`optional_host_permissions`). Nada vem concedido na instalação.
   - A página **não consegue se aprovar**. Ela pode pedir `request-access`, que abre a tela da extensão com a lista pedida, e só um clique do usuário ali dispara o pedido de permissão do navegador.
   - O redirecionamento para um host não aprovado também é recusado.
   - **No userscript,** a lista é a constante `ALLOWED_HOSTS` no topo do arquivo.
4. **Nunca com a identidade do usuário.**
   - `credentials: 'omit'`, ou `anonymous: true` no userscript.
   - `Cookie`, `Authorization` e `Origin` ficam fora da lista de cabeçalhos aceitos.
   - O `Referer` da extensão nunca vaza (`referrerPolicy: 'no-referrer'`); só vai o que a página pedir.
5. **Limites:**
   - só `http(s)`;
   - só GET, HEAD e POST;
   - corpo de envio até 1 MiB;
   - resposta até 200 MiB;
   - timeout padrão de 30 s, máximo de 5 min;
   - até 8 requisições simultâneas por página;
   - as regras de cabeçalho valem só para a URL exata e somem no fim da requisição.
6. **Protocolo:**
   - **handshake** (`hello`/`ready`) com versão do protocolo; a página recusa uma ponte de outra versão maior;
   - **IDs por requisição**, `abort` e timeout dos dois lados;
   - resposta como `ArrayBuffer`, em pedaços com progresso.

**O que fica de fora:** um script malicioso **dentro** do site do Folheia poderia usar a ponte. A regra 2 já proíbe scripts de terceiros, e o site é estático e nosso, então o risco é o mesmo de hoje.

## 8. A POC

**Arquivos:**

- `extension/src/protocol.ts`: o protocolo tipado (mensagens, limites, cabeçalhos aceitos, `isFolheiaPage`, validação), compartilhado pelo site, pela extensão e pelo userscript.
- `extension/src/background.ts`, `content.ts`, `options.ts` e `static/`: a extensão MV3, com textos em `_locales` (en, pt_BR).
- `extension/src/userscript.ts`: a variante userscript.
- `scripts/build-extension.mjs`: gera `extension/dist/chrome/`, `extension/dist/firefox/` e `extension/dist/folheia-bridge.user.js` (`npm run build:extension`, com `-- --dev` para localhost).
- `src/platform/bridge.ts`: o cliente da ponte no site.
- `src/platform/network.ts`: a interface de rede. Usa `fetch` quando o CORS deixa, e a ponte quando não deixa ou quando a requisição pede `Referer`/`User-Agent`. Lembra por origem quais precisaram da ponte. O app nativo terá outra implementação da mesma interface.
- `#/lab`: o painel **"Ponte de rede"** busca uma URL e mostra o caminho (fetch ou ponte), status, cabeçalhos, bytes e tempos, além de desenhar a imagem ou mostrar o texto. Tem atalhos para a MangaDex e o Internet Archive.
  - **"Rodar lote"** lê uma lista local (`fixtures/personal/bridge-probes.json`, fora do git, no formato `[{ name, url, headers? }]`) e testa cada URL pela página e pela ponte, uma por vez, com 1 s de pausa. Serve para repetir o §9 no iPad de verdade.

**Testes:**

- **Unitários:** protocolo, padrões de permissão, base64, e cliente + rede com uma ponte falsa.
- **e2e (`e2e/bridge.spec.ts`, Chromium e Firefox):** um servidor local em `127.0.0.1` sem CORS faz o papel do site de fora.
  - **Chromium:** carrega a extensão descompactada (`--load-extension`).
  - **Firefox:** o Playwright não instala extensões, então o teste instala a extensão como "temporária" pelo protocolo de depuração remota do Firefox, o mesmo que o `web-ext` da Mozilla usa (`e2e/bridge-harness.ts`, código nosso). O CI roda só Chromium e WebKit; localmente: `npx playwright test e2e/bridge.spec.ts --project=chromium --project=firefox`.
  - **Cobre:**
  - o fetch direto bloqueado e a leitura pela ponte;
  - `Referer` e `User-Agent` conferidos pelo eco do servidor, sem cookie;
  - 8 MB em pedaços;
  - o `Referer` nas `<img>` da própria página (§9.2);
  - a recusa de destino não aprovado;
  - o cancelamento;
  - a ponte que responde em `folheia-app.github.io/folheia/` e fica muda em `…/outro-projeto/` e em outro domínio.
- **Ao vivo (`e2e/bridge-live.spec.ts`, desligado por padrão):** `FOLHEIA_E2E_LIVE=1 npx playwright test e2e/bridge-live.spec.ts --project=chromium`. Com `FOLHEIA_BRIDGE_PROBES=arquivo.json`, testa uma lista de URLs guardada fora do repositório (§9).
- **Firefox:**
  - os mesmos 7 testes passam;
  - os 8 MB chegam em ~33 ms, mais rápido que no Chrome, porque o Firefox passa os bytes direto, sem base64;
  - ao vivo, MangaDex, a capa da Webtoons e a da MangaPill (com `Referer`) deram 200;
  - o pacote também passa no `web-ext lint` da Mozilla (rodado avulso com `npx`, sem entrar no `package.json`): 0 erros, 0 avisos;
  - falta testar o Firefox de verdade (o do Playwright é uma versão modificada) e o Firefox para Android (§10.3).

**Medido no Chromium (Mac, 20/10/2026):**

| Teste                                             | Caminho                     | Resultado                                                                                                |
| ------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------- |
| 8 MB de um servidor local                         | ponte                       | ~50 ms medidos na página, com base64 e transferência incluídos (~160 MB/s)                               |
| API MangaDex `manga?limit=1` (origem `127.0.0.1`) | fetch: **bloqueado**; ponte | 200, 5,8 KB, 340 ms                                                                                      |
| Internet Archive, capa (1,2 MB)                   | **fetch direto**            | 200, ~4,3 s. O `download/` respondeu **com CORS** hoje, ao contrário do que o `estudo-mihon` §5.1 anotou |
| Internet Archive, PDF (17 MB)                     | ponte                       | 200, 17,4 MB, ~22 s (velocidade do servidor do IA)                                                       |

## 9. Fontes reais (as do repositório de extensões do Mihon)

**O que foi feito:**

- **Escolha das fontes:** saíram do índice atual do keiyoushi, o repositório comunitário que o Mihon usa (`extensions/repo/index.json`, 1.444 extensões). Foram 12 das mais conhecidas, entre elas as duas **oficiais**: MANGA Plus (Shueisha) e Webtoons (LINE).
- **O que se aproveitou do código deles:** um agente separado leu o código das extensões (`keiyoushi/extensions-source`, Apache-2.0) só para saber a URL de catálogo, a URL de capa e os cabeçalhos de cada site. Nada disso entrou no repositório.
- **Como cada site foi testado:** duas formas, pelo `e2e/bridge-live.spec.ts` (modo "probes", com a lista guardada fora do repositório):
  - **"página"**: um `fetch` comum do Folheia, com origem `127.0.0.1`;
  - **"ponte"**: a extensão no Chromium do Playwright, com o IP de casa.
- **Volume:** só a página 1 de cada catálogo e uma capa, no máximo 3 requisições por site, com pausa entre elas. Nenhuma página de capítulo foi baixada.
  - **Total no dia:** umas 3 rodadas por site (Mac, curl e simulador). Bem abaixo de qualquer limite: a MangaDex aceita 5 por segundo e o Weeb Central pede 1 a cada 2 s.
  - **Daqui para a frente:** as fontes de verdade vão precisar de limite por site (fila e intervalo mínimo) e cache, como o Mihon faz. Isso protege o IP de casa de bloqueio.

**Achado geral:** as extensões do Mihon mandam `Referer: <site>/` em tudo, inclusive nas imagens. Algumas tiram o `Origin`. Todas contam com o resolvedor de Cloudflare do app, que roda num WebView.

| Fonte                      | Catálogo testado           | Página (fetch)  | Ponte                                                      | Capa                                                 |
| -------------------------- | -------------------------- | --------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| **MangaDex**               | API JSON (populares)       | bloqueada       | **200**, 98 KB, 0,4 s                                      | 200, sem Referer. A página lê direto (tem CORS)      |
| **MANGA Plus** (oficial)   | API protobuf (ranking)     | bloqueada       | **200**, 4,8 KB, 0,9 s                                     | 200 pela ponte                                       |
| **Webtoons** (oficial)     | HTML (ranking)             | bloqueada       | **200**, 56 KB, 0,9 s                                      | **403 sem Referer**, 200 com Referer (só pela ponte) |
| Weeb Central (ex-MangaSee) | HTML (busca por populares) | bloqueada       | **200**, 290 KB, 1 s                                       | 200                                                  |
| Asura Scans                | API JSON                   | lida (tem CORS) | **200**, 16 KB, 0,4 s                                      | 200 pela ponte; a página não lê                      |
| MangaPill                  | HTML (home)                | bloqueada       | **200**, 74 KB, 0,4 s                                      | **403 (Cloudflare) sem Referer**, 200 com Referer    |
| MangaK (ex-MangaBuddy)     | API JSON                   | bloqueada       | **200**, 73 KB, 0,4 s                                      | **403 (Cloudflare) sem Referer**, 200 com Referer    |
| Toonily                    | HTML (lista)               | bloqueada       | **200**, 110 KB, 0,8 s (o `curl` levou desafio)            | —                                                    |
| Mangago                    | HTML (lista)               | bloqueada       | **200**, 83 KB, 0,7 s (o `curl` levou desafio)             | —                                                    |
| MangaFire                  | API JSON                   | 403             | **403 "Missing token"**: a API exige um parâmetro assinado | —                                                    |
| Natomanga (ex-Manganato)   | HTML (lista)               | bloqueada       | **403, desafio do Cloudflare** ("Just a moment…")          | —                                                    |
| Mangakakalot               | HTML (lista)               | bloqueada       | **403, desafio do Cloudflare**                             | —                                                    |

**Fora do ar ou fora do índice:**

- **Bato.to:** redireciona para um aviso antipirataria. O MangaPark saiu do índice junto.
- **Comick:** saiu em set/2025. O domínio novo dá desafio do Cloudflare.
- **Reaper Scans:** saiu do índice em mai/2025.

**Leitura:**

- **9 de 12 funcionam pela ponte** (catálogo e capa). Das 9, só a MangaDex e a Asura deixariam a página ler alguma coisa direto, e só em parte. **Sem a ponte, o site do Folheia não lê quase nada dessas fontes.**
- **O `Referer` é decisivo para as imagens:**
  - Webtoons, MangaPill e MangaK recusam a capa sem ele.
  - **No iPad, com o userscript, essas imagens não abrem**, porque o Userscripts não define `Referer` (§3.1). Isso só mudaria se o recurso não documentado de regras DNR do app funcionar, o que fica para o teste do §10.4.
  - Na extensão (Chrome/Firefox), funciona.
- **O Cloudflare às vezes ajuda o navegador:** Toonily e Mangago desafiaram o `curl`, mas deixaram a ponte passar. O fetch da extensão tem a "impressão digital" de um navegador de verdade. Os 2 que desafiaram a ponte também (Natomanga e Mangakakalot) só funcionariam com o cookie `cf_clearance` de uma aba aberta no site.
  - Isso exigiria uma opção, por site, de **usar os cookies do navegador**. A POC não envia cookies, de propósito. Fica como decisão futura: opt-in por site, com aviso.
- **MangaFire** exige uma assinatura calculada por um algoritmo do próprio site. Imitar isso é engenharia reversa de código de terceiros: fora de questão.
- **Ressalvas:**
  - foi um Chromium automatizado no Mac, com o IP de casa;
  - o resultado no navegador do dia a dia pode ser igual ou melhor (cookies e histórico);
  - os sites mudam toda semana (`estudo-mihon` §5.4).
- **Jurídico:** o mecanismo funciona; o conteúdo e os termos de uso continuam sendo dos sites. O repositório público fica só com o mecanismo e fontes legítimas (§11).

### 9.1 No simulador do iPad (Safari de verdade)

**Montagem:**

- **Aparelho:** iPad Pro 11" no simulador do Xcode 26.3, iPadOS 26.2. O Safari do simulador é o mesmo WebKit do iPad, com extensões.
- **Site:** o Folheia rodou do servidor de dev do Mac (`127.0.0.1`), acessado pelo Safari do simulador.
- **Os dois caminhos testados, um de cada vez:**
  1. **A nossa extensão como extensão Safari:** empacotada com `safari-web-extension-packager` e assinada "ad hoc", sem conta Apple; isso só funciona no simulador.
  2. **O app Userscripts (quoid)** com o nosso `folheia-bridge.user.js`. O app foi compilado a partir do código aberto dele (v5.0.0-beta.23), porque o simulador não instala apps da App Store. O código ficou numa pasta temporária, fora do repositório. O iPad real usa a versão da App Store (1.8.6), que pode se comportar um pouco diferente.
- **Cabeçalhos:** conferidos com um servidor de eco local, que mostra o que chegou.
- **Sites:** depois, uma amostra pequena das fontes do §9, uma requisição por URL, com pausa entre elas.

**Resultados:**

| Teste                                                    | Extensão Safari                                      | Userscripts                                         |
| -------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| Ponte detectada no `#/lab`                               | sim (`extension · safari`)                           | sim (`userscript · Userscripts`)                    |
| Aprovação de site                                        | tela da extensão + prompt nativo do Safari, por site | "Todos os sites" nos Ajustes (sem lista própria)    |
| `User-Agent` próprio                                     | **chega**                                            | **chega**                                           |
| `Referer` próprio                                        | **não chega**                                        | **não chega**                                       |
| Cookies enviados                                         | nenhum (o eco não recebeu cookie)                    | nenhum (o eco não recebeu cookie)                   |
| MangaDex (API), MANGA Plus, Weeb Central (capa)          | 200                                                  | 200                                                 |
| Capas que exigem `Referer` (Webtoons, MangaPill, MangaK) | 403                                                  | 403                                                 |
| Velocidade de binários (servidor local)                  | —                                                    | 1 MB: 0,15 s · 5 MB: 0,7 s · 17 MB: 2,3 s (~7 MB/s) |

**Leitura:**

- **No iPad, a ponte funciona para APIs e imagens sem proteção de hotlink:** MangaDex, MANGA Plus, Weeb Central, Asura e os catálogos em HTML.
- **As fontes que exigem `Referer` nas imagens não funcionam no iPad, por nenhum dos dois caminhos.** O Safari não deixa a extensão definir esse cabeçalho, nem por fetch nem pelo declarativeNetRequest.
  - Isso só se resolveria com um intermediário: um proxy (estudo-mihon §5.5, item 3) ou o Suwayomi no Mac.
- **A serialização em números do Userscripts custa menos do que se temia:** cerca de 7 MB/s no simulador de um Mac. Uma página de quadrinho (0,3 a 1 MB) leva de 50 a 150 ms a mais.
  - O iPad Air M1 deve ser umas 2 a 3 vezes mais lento; precisa de medição no aparelho (§10.4).
  - O PDF de 17 MB do Internet Archive estourou o limite de 40 s, mas por causa do servidor do IA, que já levava 22 s no Chromium.
- **A extensão Safari própria não ganha nada no `Referer`.** A vantagem dela seria só a velocidade. Sem a conta paga da Apple, o Userscripts continua sendo o caminho do iPad.

### 9.2 Capas: como pegar em cada ambiente

As capas são o caso mais comum de imagem com proteção de hotlink. O pedido `image-headers` do protocolo põe o `Referer` certo nas `<img>` que a **própria página** pede a um host aprovado. A imagem é só exibida; os bytes não passam pela ponte e o cache do navegador funciona normalmente.

- **Como a regra é feita:** só imagens, só aquele host, e só quando quem pede é a página do Folheia (`initiatorDomains`).
- **Permissão necessária:** no Chrome, a permissão de host também precisa cobrir quem pede, então o manifesto lista as páginas do Folheia em `host_permissions`.

| Ambiente                        | Capa da fonte com `Referer`                                  | Outras saídas                           |
| ------------------------------- | ------------------------------------------------------------ | --------------------------------------- |
| Chrome / Edge + extensão        | **sim**, por `<img>` (regra de imagem) ou pela ponte (bytes) | —                                       |
| Firefox (desktop) + extensão    | **sim**, pelos dois                                          | —                                       |
| Firefox Android + extensão      | provavelmente sim (mesmo motor); falta testar no aparelho    | —                                       |
| Safari (iPad) + extensão Safari | **não**: o Safari só apaga o `Referer`                       | catálogo de metadados, capa tipográfica |
| Safari (iPad) + Userscripts     | **não**                                                      | catálogo de metadados, capa tipográfica |
| App Android (Capacitor)         | **sim**: HTTP nativo                                         | —                                       |
| Qualquer um, sem nada instalado | não                                                          | catálogo de metadados, capa tipográfica |

**Saídas que valem em todo lugar:**

- **Catálogo de metadados:**
  - o **AniList** libera CORS na API e nas imagens das capas; testado com uma requisição de cada, inclusive com o `Referer` do Folheia;
  - a **MangaDex** também libera as capas direto;
  - é só casar a série pelo título ou pelo ID, como fazem os rastreadores do Mihon;
  - é mais um host externo, entra na decisão da regra 2 (§11).
- **Capa tipográfica:** o `BookCover` do Folheia já desenha uma capa no nosso estilo, sem rede. Fica como último recurso.
- **No iPad, um intermediário** (proxy próprio ou Suwayomi no Mac) seria a única forma de mostrar as capas da fonte que exigem `Referer`.

**Ordem sugerida:** capa do catálogo de metadados, depois a da fonte (onde o ambiente permitir) e por fim a tipográfica.

## 10. Teste manual (passo a passo para o Artur)

Primeiro, gerar os arquivos: `npm run build:extension`. Para testar com o `npm run dev` (localhost), use `npm run build:extension -- --dev`. Abrir `#/lab` e ir ao painel **"Ponte de rede"**.

### 10.1 Chrome ou Edge (Mac)

1. `chrome://extensions` (ou `edge://extensions`) → **Modo do desenvolvedor** → **Carregar sem compactação** → escolher `extension/dist/chrome`.
2. Abrir o Folheia → `#/lab`. A linha **"Ponte"** deve mostrar `extension · chrome · v0.1.0 · protocolo 1`.
3. Clicar em **MangaDex API** → **Buscar**. Deve aparecer `not-allowed` e o botão **"Pedir acesso a https://api.mangadex.org"**.
4. Clicar no botão. Abre a tela da extensão com o pedido → **Permitir** → o Chrome pergunta → **Permitir**.
5. Voltar e **Buscar** de novo: `via bridge`, status 200 e o JSON.
6. Testar os atalhos do Internet Archive (pedir acesso a `*.archive.org`). Com "só fetch", a capa deve vir direto (tem CORS).

### 10.2 Firefox (desktop)

1. `about:debugging#/runtime/this-firefox` → **Carregar extensão temporária** → escolher `extension/dist/firefox/manifest.json`. Some ao fechar o Firefox.
2. Em `about:addons` → Ponte do Folheia → **Permissões**, conferir se o site do Folheia está liberado.
3. Repetir os passos 2 a 6 do Chrome. A linha deve mostrar `extension · firefox`.
4. **Para ficar instalada:** assinar como unlisted no AMO e instalar o `.xpi` (§5).

### 10.3 Firefox para Android

1. Assinar o `extension/dist/firefox` como unlisted no AMO e passar o `.xpi` para o celular.
2. Firefox → Configurações → Sobre o Firefox → tocar 5× no logo → voltar → **Instalar extensão a partir de arquivo** → escolher o `.xpi`.
3. Abrir o Folheia publicado → `#/lab` e repetir os passos do Chrome. O botão "Pedir acesso" abre a tela da extensão numa aba.
4. **Anotar:** a ponte foi detectada? A permissão foi pedida? Status e tempo da MangaDex e do PDF de 17 MB.

### 10.4 Safari com o app Userscripts (iPad e Mac)

1. Instalar o **Userscripts** (App Store, grátis) e abrir o app uma vez.
2. **iPad:** Ajustes → Apps → Safari → Extensões → Userscripts → ativar e **Todos os sites → Permitir**. **Mac:** Safari → Ajustes → Extensões → Userscripts → ativar e permitir em todos os sites. Sem o "todos os sites", o CORS não é furado (§3.1).
3. Passar `extension/dist/folheia-bridge.user.js` para a pasta do Userscripts (no iPad, pelo app Arquivos; no Mac, a pasta escolhida no app). Também dá para abrir a URL `.user.js` no Safari e instalar pelo popup da extensão.
4. Abrir `https://folheia-app.github.io/folheia/#/lab` (o build `--dev` também roda em `localhost`). A linha **"Ponte"** deve mostrar `userscript · Userscripts · …`.
5. **Buscar** (ou "Rodar lote" com a lista local):
   - **MangaDex API** → esperado: `via bridge`, 200.
   - **Capa do Internet Archive** → a imagem aparece.
   - **PDF de 17 MB** → **anotar o tempo** e se a aba aguentou. É o teste da serialização em números (§3.1).
6. **Cabeçalhos:**
   - Pôr `User-Agent: FolheiaTeste/1` e buscar `https://httpbin.org/headers`. Antes, acrescentar `httpbin.org` em `ALLOWED_HOSTS` no topo do script.
   - Anotar se o `User-Agent` mudou e se apareceram cookies. O `Referer` não deve mudar.
7. Mandar os resultados para entrarem neste documento.

## 11. Recomendação, esforço e decisões pendentes

**Ordem sugerida:**

1. **Extensão para o Firefox** (desktop + Android), assinada como unlisted. É a que roda em mais lugares sem pagar nada e com tudo funcionando. Esforço: **P**. A POC já é quase o produto; falta assinar, testar no Android e polir a tela de opções.
2. **Userscript para o iPad**, porque o iPad é o aparelho principal. Esforço: **P** para a ponte. Mas o valor real depende do teste do §10.4 (`User-Agent`, velocidade dos binários). As fontes que exigem `Referer` **não funcionam no iPad** por esse caminho.
3. **Chrome/Edge:** o mesmo pacote. Edge Add-ons grátis; Chrome descompactado ou com a taxa da loja.
4. **Depois:** a interface `CatalogSource` (F1 do `estudo-mihon` §8.4) usando `Network` desta POC, com o OPDS e o Internet Archive primeiro.

**Decisões pendentes (do Artur; o `CLAUDE.md` não foi alterado):**

- **Regra 2 (privacidade).** Hoje: "As únicas requisições externas permitidas são a URL `?file=` fornecida pelo usuário e os livros de exemplo (Wikimedia Commons)". Sugestão de texto novo:
  > As requisições externas permitidas são: a URL `?file=` e os livros de exemplo, quando o usuário os abre; e os **catálogos que o usuário adicionar ou aprovar**, feitos direto ou por uma **ponte de rede opcional** (extensão ou userscript do próprio Folheia, código no repositório). A ponte só atende páginas do Folheia, só os sites que o usuário aprovou, nunca envia cookies, e nada do arquivo ou da biblioteca do usuário sai do aparelho.
- **Regra 8:** `src/platform/` ganha uma interface `Network`. Vale registrar que, no app nativo, ela vira HTTP nativo (CapacitorHttp).
- **Monorepo:** a extensão está em `extension/` na raiz. Quando vierem os workspaces (`apps/web`, `apps/extension`, `packages/bridge-protocol`), `extension/src/protocol.ts` vira o pacote compartilhado sem mudar de forma.
- **Publicar** na Edge Add-ons, no AMO listado ou na Chrome Web Store: isso expõe o nome do projeto numa loja. Decisão do Artur.
- **Fontes de scan** (§9): o mecanismo funciona, mas o conteúdo e os termos de uso são dos sites (`estudo-mihon` §5.4). O repositório público deve continuar só com o mecanismo e fontes legítimas.

## 12. Estado em 20/10/2026 e próximos passos

**Testado:**

| Ambiente                                | Como                                   | Leitura de sites sem CORS | `User-Agent` | `Referer`                    |
| --------------------------------------- | -------------------------------------- | ------------------------- | ------------ | ---------------------------- |
| Chrome (Mac)                            | e2e automático + 12 fontes ao vivo     | sim                       | sim          | sim (ponte e `<img>`)        |
| Firefox (Mac, o do Playwright)          | e2e automático + 3 URLs ao vivo        | sim                       | sim          | sim (ponte e `<img>`)        |
| Safari do iPad (simulador), extensão    | `#/lab`, eco local + amostra de fontes | sim                       | sim          | **não** (só consegue apagar) |
| Safari do iPad (simulador), Userscripts | `#/lab`, eco local + amostra de fontes | sim (~7 MB/s)             | sim          | **não**                      |

**Ainda não testado:**

- Edge;
- o Firefox de verdade (o do Playwright é modificado);
- o Firefox para Android;
- o iPad Air real, com o Userscripts 1.8.6 da App Store;
- se o Safari envia os cookies de um site em que você está logado.

**Próximos passos:** estão no `plano-mvp.md` §8, seção E4, que é onde fica o backlog. Lá também está o que muda na migração do repositório para uma organização.

## 13. Fontes

- Userscripts (quoid): [README](https://github.com/quoid/userscripts) · [#212](https://github.com/quoid/userscripts/issues/212) · [#252](https://github.com/quoid/userscripts/issues/252) · [#260](https://github.com/quoid/userscripts/issues/260) · [#420](https://github.com/quoid/userscripts/issues/420) · [#465](https://github.com/quoid/userscripts/issues/465) · [#897](https://github.com/quoid/userscripts/issues/897)
- Apple: [Packaging](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari) · [Running](https://developer.apple.com/documentation/safariservices/running-your-safari-web-extension) · [Distributing](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension) · [Contas](https://developer.apple.com/help/account/basics/about-your-developer-account)
- Chrome: [Network requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests) · [Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/messaging) · [declarativeNetRequest](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest) · [userScripts](https://developer.chrome.com/docs/extensions/reference/api/userScripts) · [Web Store](https://developer.chrome.com/docs/webstore/register) · [Edge](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account)
- Firefox: [MV3](https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/) · [Auto-distribuição](https://extensionworkshop.com/documentation/publish/self-distribution/) · [Instalar no Android](https://extensionworkshop.com/documentation/publish/install-self-distributed/#install-addon-from-file-android) · [host_permissions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/host_permissions) · [Incompatibilidades com o Chrome](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Chrome_incompatibilities)
- Geral: [Cabeçalhos proibidos (MDN)](https://developer.mozilla.org/en-US/docs/Glossary/Forbidden_request_header) · [MDN BCD (DNR, externally_connectable)](https://github.com/mdn/browser-compat-data/tree/main/webextensions)
- Gerenciadores: [Violentmonkey](https://violentmonkey.github.io/api/gm/) · [Tampermonkey](https://www.tampermonkey.net/documentation.php?locale=en)
