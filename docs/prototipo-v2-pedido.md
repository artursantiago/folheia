# Folheia — Pedido do protótipo v2 (rascunho)

> 20/10/2026. **Rascunho para o Artur revisar** antes de levar ao Claude Design. É a etapa 0 da biblioteca (`plano-mvp.md` §8 C2).
>
> - **Fontes do pedido:** as telas do `estudo-interface.md` §8, as mudanças de moldura do leitor do `roteiro.md` §2 e os textos e o ícone do `identidade-visual.md`.
> - **Itens marcados com (D3):** dependem da triagem do leitor (`pauta-decisoes.md`) e saem do pedido se forem recusados.
> - **Formato:** o mesmo do protótipo aprovado (um arquivo por tela, claro e escuro), para a cópia entrar em `docs/prototipo-v2/`.

---

## O pedido (para colar no Claude Design)

Revise o protótipo aprovado do Folheia (Ex-libris, 15 telas, claro e escuro) para a **biblioteca pessoal**. O app deixa de ser "abrir um arquivo e ler" e vira um acervo de leitura: livros, HQs, mangás e revistas, lidos folheando.

**Mantenha a linguagem aprovada:** fichas catalográficas, número de tombo, carimbos, bordas picotadas e números batidos à máquina. Use as paletas Ateliê (claro) e Sebo à noite (escuro), Young Serif nos títulos, Atkinson Hyperlegible Next no texto e IBM Plex Mono nos números. O único símbolo é o **monograma F** (F da Young Serif com o filete terracota embaixo). Não crie outros logos nem mascotes.

**Tamanhos:** celular (390 × 844), iPad em pé (820 × 1180), iPad deitado (1180 × 820) e desktop (1280 × 800). O corte é pela largura: abaixo de 600 px, barra inferior; a partir de 600 px, trilho lateral; a partir de 1024 px, dois painéis.

### Navegação

Quatro seções fixas, sempre com rótulo visível: **Acervo**, **Leituras**, **Catálogos** e **Mais**.

- **Celular:** barra inferior.
- **A partir de 600 px:** trilho lateral à esquerda, que pode ser um fichário vertical de abas de papel, com a aba atual em destaque.
- **O leitor** abre por cima de tudo e não é uma seção.

### Telas

1. **Acervo vazio** (celular e iPad).
   - A antiga "ficha de empréstimo" vira **"Nova entrada"**, mostrando o próximo tombo.
   - Sobretítulo "Seu acervo", título "Para folhear tudo o que você lê." e apoio "Leia seus livros, quadrinhos e mangás folheando, como no papel.".
   - Instrução: "Arraste um arquivo até aqui, ou escolha no seu aparelho.". Logo abaixo, em mono e discreto, `PDF · CBZ · ZIP`: é o único lugar do app que cita formatos.
   - Cabeçalho "Biblioteca de bolso".
   - Mostre também uma alternativa de título: "Comece o seu acervo.".
2. **Acervo com livros** (iPad deitado e celular).
   - Três exibições: **capas** (o padrão), **lista** e **fichário** (cada livro como uma ficha catalográfica curta).
   - Duas versões: sem nenhuma estante criada (lista única, sem abas) e com abas de estante roláveis, incluindo a aba de sistema "Por catalogar".
   - Na capa: selo de progresso ("pág. 45/200" ou uma fita), "novo", carimbo "lido", carimbo "Exemplar ausente" e o formato, discreto. **O tombo não aparece na capa.** Um botão pequeno na capa abre a ficha (área de toque de 44 px).
   - Ação fixa "Adicionar" no topo, e busca, ordenar e filtrar.
3. **Acervo + ficha em dois painéis** (iPad deitado).
4. **Ficha do livro como página** (celular).
   - Tombo discreto, autor, título, ano, páginas, formato e tamanho, série e número, idioma, estantes, notas e progresso.
   - **Marcadores** com miniatura.
   - O resumo das leituras no visual do cartão de empréstimo (carimbos datados).
   - Ações: continuar, "Guardar no acervo", "Guardar cópia no aparelho", "Remover só o arquivo", escolher uma página como capa, editar os dados e remover do acervo.
5. **Seleção em lote** e o diálogo de estantes com caixas de três estados.
6. **Leituras:** uma linha por livro, agrupada por dia, na linguagem do cartão de empréstimo ("retirado em… devolvido na pág…"). Sem tempo de leitura.
7. **Leitor**, a moldura nova:
   - o tombo discreto ao lado do título, no topo;
   - "Guardar no acervo" no topo, num livro aberto por URL;
   - o aviso "Retomado da pág. 87 · **Do início**", que some sozinho. O cartão "Continuar?" sai;
   - o botão de **marcador** (fita) na barra, e as fitas dos marcadores sobre o slider de páginas;
   - o **slider de páginas também na barra normal**, não só no modo imersivo, com as marcas dos capítulos do sumário no trilho;
   - a aba **Marcadores** na gaveta do índice;
   - a grade de miniaturas **em pares de spread**;
   - no celular, o menu **"⋯"** com o que hoje some (primeira e última página, zoom, compartilhar);
   - a opção **"Qualidade máxima"**, que hoje está nos Ajustes: decida o lugar final;
   - (D3) a **dica das zonas de toque** na primeira leitura: cada zona pintada com "Anterior", "Próxima" e "Menu", sumindo no primeiro toque;
   - (D3) o **contador discreto "10 / 69"** quando a barra some sozinha.
8. **Catálogos:** os exemplos de domínio público, mais discretos que o carrossel atual, com "Guardar no acervo". Deixe espaço visível para "Adicionar catálogo" (servidores OPDS), sem detalhar.
9. **Mais:** ajustes; cópia dos arquivos (interruptor) e espaço usado; leitura sem registro; exportar e importar o acervo; e "Sobre", com os carimbos que saíram do início ("Seu arquivo não sai deste aparelho", "Domínio público").
10. **Estados:**
    - exemplar ausente ("Traga este exemplar de volta");
    - "Este não é o mesmo exemplar", com "abrir só desta vez" e "adicionar como livro novo";
    - aviso com "Desfazer";
    - faixa fina e fixa de leitura sem registro;
    - estante vazia;
    - busca sem resultado.
11. **Trilho lateral e barra inferior**, nos dois temas.

### Regras

- Toda tela nos dois temas.
- Áreas de toque de 44 px, foco visível e contraste mínimo de 4,5:1.
- Respeite as áreas seguras do iPhone (`safe-area-inset`).
- Use só os componentes do protótipo aprovado e estes novos: capa com selos, grade, lista, fichário, trilho, barra inferior, abas de estante, busca, caixa de três estados, barra de seleção, aviso com ação, faixa, estado vazio, selo e linha de lista.
