# Folheia

**Leitor de PDF e HQ (CBZ) em formato de livro, com efeito de virar página.** Gratuito, open source e 100% no navegador: **seu arquivo nunca sai do seu aparelho.**

🔗 **Site:** <https://artursantiago.github.io/folheia/>
🇬🇧 [English summary](README.en.md)

> MVP no ar. Veja o [plano](docs/plano-mvp.md) para o que já existe e o que vem depois.

## O que é

O Folheia abre um PDF ou CBZ e mostra o conteúdo como um livro de verdade: página dupla em telas largas, página única no celular, dobra de canto acompanhando o dedo, zoom, miniaturas, sumário e leitura da direita para a esquerda (mangá). Funciona bem em iPad e tablets, mesmo com arquivos grandes e cheios de imagens.

- **Privado:** sem servidor, sem conta, sem métricas e sem scripts de terceiros. Todo o processamento roda no seu navegador.
- **Leve com arquivos pesados:** só as páginas perto da atual são renderizadas; as distantes são descartadas da memória.
- **Instalável:** funciona como app (PWA) e abre arquivos locais sem internet.
- **Por link:** `https://artursantiago.github.io/folheia/?file=https://exemplo.org/livro.pdf` abre um arquivo publicado na web, desde que o servidor dele permita (CORS).

## Como rodar localmente

Pré-requisito: **Node 24** (há um `.nvmrc`).

```bash
nvm use
npm install
npm run dev
```

| Comando             | O que faz                                        |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Servidor de desenvolvimento                      |
| `npm run build`     | Checagem de tipos + build de produção em `dist/` |
| `npm run preview`   | Serve o build localmente                         |
| `npm run lint`      | ESLint, Stylelint (tokens do tema) e Prettier    |
| `npm run typecheck` | Checagem de tipos do TypeScript                  |
| `npm test`          | Testes unitários (Vitest)                        |
| `npm run fixtures`  | Gera arquivos de teste pesados (não vão pro Git) |
| `npm run test:e2e`  | Testes no navegador (Playwright)                 |

O deploy é automático: cada push na `main` passa pelo CI (lint, tipos, testes e build) e é publicado no GitHub Pages.

## Tecnologias

Vite, TypeScript, React (só na interface; o motor de páginas é TypeScript puro), PDF.js (Mozilla), unzipit, vite-plugin-pwa, Vitest e Playwright. Todas as dependências têm licenças compatíveis com MIT (MIT, Apache-2.0, BSD ou OFL para as fontes).

## Documentação

- [Plano do MVP](docs/plano-mvp.md): escopo, decisões, arquitetura e backlog.
- [Estudo das referências](docs/estudo-referencias.md): como leitores flipbook funcionam, em palavras próprias.
- [Identidade visual](docs/identidade-visual.md): o tema Ex-libris e as regras do design system.
- [Protótipo das telas](docs/prototipo/): referência visual aprovada.

### Clean room

O Folheia foi escrito do zero. Produtos comerciais de flipbook foram estudados só para entender as técnicas envolvidas, e o resultado desse estudo é o [documento de referências](docs/estudo-referencias.md). Nenhum código, CSS, nome ou asset deles foi copiado ou adaptado.

## Créditos dos livros de exemplo

Os livros do acervo de exemplo estão em **domínio público** no Brasil e nos EUA e são carregados do [Wikimedia Commons](https://commons.wikimedia.org/) apenas quando você os abre. Os créditos de cada obra aparecem na ficha do livro, dentro do leitor.

## Licença

[MIT](LICENSE) © 2026 Artur Santiago
