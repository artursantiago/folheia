# Ponte de rede do Folheia (POC)

Extensão (Chrome, Edge, Firefox) e userscript (Safari com o app Userscripts, Violentmonkey) que deixam o site do Folheia buscar em outros sites sem as limitações de CORS, com `Referer` e `User-Agent` próprios. Ela só atende páginas do Folheia, só os sites que você aprovar, e nunca envia seus cookies.

Estudo completo, modelo de segurança e testes manuais: [`docs/estudo-extensao.md`](../docs/estudo-extensao.md).

## Gerar

```bash
npm run build:extension          # extension/dist/{chrome,firefox}/ e folheia-bridge.user.js
npm run build:extension -- --dev # também em localhost/127.0.0.1 (npm run dev)
```

## Peças

- `src/protocol.ts`: o protocolo de mensagens, compartilhado com o site (`src/platform/bridge.ts`).
- `src/content.ts`: roda nas páginas do Folheia e repassa as mensagens ao background.
- `src/background.ts`: faz o fetch (isento de CORS para os sites aprovados), põe `Referer`/`User-Agent` via declarativeNetRequest e devolve o corpo em pedaços.
- `src/options.ts` + `static/options.html`: lista de sites aprovados e a tela de aprovação.
- `src/userscript.ts`: a mesma ponte sobre `GM.xmlHttpRequest`; a lista de sites fica em `ALLOWED_HOSTS`.
