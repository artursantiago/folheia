<p align="center"><img src="public/icons/icon-192.png" width="96" height="96" alt="Folheia"></p>

# Folheia

**Leia livros, HQs e mangás folheando, como no papel.**

🔗 **Site:** <https://folheia-app.github.io/folheia/>
🇬🇧 [English summary](README.en.md)

## O que é

O Folheia é o seu acervo de leitura: livros, quadrinhos, mangás e revistas num lugar só, lidos folheando, página a página. Página dupla em telas largas, página única no celular, a dobra de canto acompanhando o dedo, zoom, miniaturas, sumário e leitura da direita para a esquerda para mangás. Feito para o iPad e para arquivos grandes, cheios de imagens.

> Projeto pessoal e experimental, em construção. O [roteiro](docs/roteiro.md) mostra o que vem por aí: um acervo com estantes, marcadores de página e catálogos.

## Como funciona

- **Formatos:** PDF e CBZ (ou ZIP de imagens). CBR e CB7 ainda não.
- **No seu aparelho:** tudo roda no navegador. Sem servidor, sem conta, sem métricas e sem scripts de terceiros; o seu arquivo não sai do seu aparelho.
- **Leve com arquivos pesados:** só as páginas perto da atual são renderizadas; as distantes saem da memória.
- **Instalável:** funciona como app (PWA) e abre arquivos locais sem internet.
- **Por link:** `https://folheia-app.github.io/folheia/?file=https://exemplo.org/livro.pdf` abre um arquivo publicado na web, desde que o servidor dele permita (CORS).

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
- [Roteiro](docs/roteiro.md): a ordem do backlog, em frentes e ondas.
- [Changelog](CHANGELOG.md) e [versionamento](docs/versionamento.md): o que mudou em cada versão e como as versões saem. A prévia da próxima versão fica em <https://folheia-app.github.io/folheia/next/>.
- [Estudo das referências](docs/estudo-referencias.md): como leitores flipbook funcionam, em palavras próprias.
- [Estudo do Mihon](docs/estudo-mihon.md) e [estudo de interface](docs/estudo-interface.md): a biblioteca pessoal que vem por aí.
- [Identidade visual](docs/identidade-visual.md): o tema Ex-libris e as regras do design system.
- [Protótipo das telas](docs/prototipo/): referência visual aprovada.

### Clean room

O Folheia foi escrito do zero. Produtos comerciais de flipbook foram estudados só para entender as técnicas envolvidas, e o resultado desse estudo é o [documento de referências](docs/estudo-referencias.md). Nenhum código, CSS, nome ou asset deles foi copiado ou adaptado.

## Créditos dos livros de exemplo

Os livros do acervo de exemplo estão em **domínio público** no Brasil e nos EUA e são carregados do [Wikimedia Commons](https://commons.wikimedia.org/) apenas quando você os abre. Os créditos de cada obra aparecem na ficha do livro, dentro do leitor.

## Licença

[MIT](LICENSE) © 2026 Artur Santiago
