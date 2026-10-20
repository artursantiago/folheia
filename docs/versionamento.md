# Folheia — Versionamento e publicação

> Decidido em 20/10/2026. A primeira versão é a **0.1.0**: o leitor de hoje com os ganhos de desempenho, antes do redesign do acervo.

## 1. Números de versão

O Folheia segue o [Semantic Versioning](https://semver.org/lang/pt-BR/) (`MAIOR.MENOR.CORREÇÃO`), adaptado a um app. Ele não tem API pública; o "contrato" é com quem usa o app e com os dados que o app guarda no aparelho.

| Sobe a…                  | Quando                                                                                                                                                                                                          | Exemplo                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **CORREÇÃO** (0.1.**1**) | Só correções: um bug, um texto errado, uma melhora de desempenho sem mudança visível                                                                                                                            | A página pisca ao virar; agora não pisca |
| **MENOR** (0.**2**.0)    | Algo novo ou que muda o jeito de usar: um recurso, uma tela, um ajuste novo, uma mudança de comportamento                                                                                                       | Marcadores de página                     |
| **MAIOR** (**2**.0.0)    | Algo que quebra: dados guardados que não migram sozinhos, um formato que deixa de abrir, uma mudança tão grande que exige reaprender o app. A partir da 1.0.0, quebrar dados exige migração ou uma versão maior | Trocar o formato do acervo sem migração  |

**Antes da 1.0.0** (a fase de agora), a regra é mais solta, como o SemVer prevê: recursos e mudanças grandes sobem a MENOR, e correções sobem a CORREÇÃO.

**A 1.0.0** é o marco do **acervo pronto**, a onda 2 do `roteiro.md`, quando o Folheia passa a ser o produto definido no `plano-mvp.md` §1.

**Pré-versões** (`0.2.0-beta.1`) existem, mas raramente são necessárias: a prévia em `/next/` já faz esse papel.

## 2. Os dois canais

O site tem dois endereços. Os dois são montados a cada deploy:

| Canal       | Endereço                                      | O que é                                           | Dados no aparelho                                                           |
| ----------- | --------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------- |
| **Estável** | <https://folheia-app.github.io/folheia/>      | A última versão publicada (a última tag `vX.Y.Z`) | Prefixo `folheia:`                                                          |
| **Prévia**  | <https://folheia-app.github.io/folheia/next/> | A `main` de agora, o que está em "Unreleased"     | Prefixo `folheia-next:`, separado: testar a prévia nunca mexe no seu acervo |

- **Como se distinguem:** a prévia se chama **"Folheia β"** e tem o **ícone escuro**, o que permite instalar as duas no iPad e saber qual é qual. O "Copiar diagnóstico" mostra a versão, o canal e o commit, como em `Folheia 0.1.0 (next · 84694dc)`.
- **Service workers:** cada canal tem o seu. O da estável não responde pelas páginas de `/next/`.
- **Regra para o futuro:** **todo armazenamento novo** (IndexedDB, OPFS, caches) usa um nome por canal, como o `localStorage` já faz. Os dois canais estão na mesma origem e, sem isso, uma migração de dados da prévia estragaria a estável.
- **Build local:** usa o canal `dev`, com o mesmo prefixo da estável.
- **Transição (uma vez só):** quem abriu o app antes da 0.1.0 tem um service worker antigo, que ainda não sabe ignorar `/next/`. Antes de abrir a prévia, aceite o aviso "Nova edição do Folheia disponível" na estável. Visto no teste de 20/10/2026.

## 3. Changelog

- **Formato:** o `CHANGELOG.md`, na raiz, segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e é escrito **em inglês**. Os documentos continuam em português.
- **Para quem lê:** o que mudou para quem usa o app, em frases curtas. Não é a lista de commits. Detalhes técnicos só quando ajudam (por exemplo, em Performance).
- **Seções, nesta ordem:** Added, Changed, Deprecated, Removed, Fixed, Security, e **Performance** (nossa, porque desempenho é requisito).
- **"Unreleased" no topo:** cada mudança visível que chega à `main` ganha uma linha ali, **no mesmo commit ou PR**. Mudanças internas, como refatorações, testes, CI e documentação, não entram.
- **As notas da Release** no GitHub são a seção da versão, copiada automaticamente.

## 4. Como publicar uma versão

1. Conferir que a `main` está verde e que a prévia foi testada no iPad.
2. No `CHANGELOG.md`:
   - trocar `## [Unreleased]` por `## [X.Y.Z] - AAAA-MM-DD` e criar um `## [Unreleased]` vazio acima;
   - atualizar os links de comparação no fim do arquivo.
3. Subir a versão no `package.json` com `npm version X.Y.Z --no-git-tag-version`.
4. Commit `chore(release): vX.Y.Z` na `main`.
5. Criar a tag anotada e enviar:

   ```bash
   git tag -a vX.Y.Z -m "Folheia X.Y.Z"
   git push origin main vX.Y.Z
   ```

6. O GitHub Actions faz o resto (`.github/workflows/deploy.yml`):
   - roda o CI;
   - confere se a tag bate com o `package.json`;
   - gera o site estável;
   - cria a **Release** com as notas do changelog e o site anexado (`folheia-site-vX.Y.Z.tar.gz`);
   - publica: a estável na raiz e a `main` em `/next/`.
7. **Depois de publicar:** no PWA estável do iPad aparece "Nova edição do Folheia disponível".

**Desfazer uma versão ruim:** publicar uma CORREÇÃO, que é o caminho preferido. Em último caso, apagar a Release (a raiz volta para a anterior no próximo deploy) e a tag.

**Ambiente `github-pages`:** aceita deploy da `main` e das tags `v*`, configurado em 20/10/2026.

## 5. Quando lançar

- **Uma versão por entrega com sentido.** Por exemplo, uma etapa do roteiro, um conjunto de correções ou uma melhora de desempenho que você já sente no iPad. Não precisa ter data fixa.
- **Correções urgentes** podem sair sozinhas, como CORREÇÃO.
- **O redesign** anda na `main` e aparece na prévia. A estável só muda quando uma etapa inteira estiver pronta e testada.
