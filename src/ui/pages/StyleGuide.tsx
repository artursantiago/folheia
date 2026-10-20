// Developer tool: the live style guide (#/estilo). Its showcase copy is
// intentionally not translated; product screens must use i18n.
import { useState } from 'react';
import {
  Accession,
  Button,
  Card,
  Drawer,
  DrawerSection,
  IconButton,
  Notice,
  Overline,
  PageCounter,
  PageSlider,
  Popover,
  PopoverRow,
  ReaderBar,
  ReaderBarSeparator,
  Segmented,
  Stamp,
  Switch,
  TextField,
} from '../components';
import styles from './StyleGuide.module.css';

const swatches = [
  ['paper', '--color-paper'],
  ['card', '--color-card'],
  ['ink', '--color-ink'],
  ['ink-muted', '--color-ink-muted'],
  ['accent', '--color-accent'],
  ['support', '--color-support'],
  ['rule', '--color-rule'],
  ['perforation', '--color-perforation'],
] as const;

function Showcase({ scheme }: { scheme: 'light' | 'dark' }) {
  const [layout, setLayout] = useState<'auto' | 'single' | 'double'>('auto');
  const [cover, setCover] = useState(true);
  const [panel, setPanel] = useState(false);
  const [page, setPage] = useState(47);
  const [dragging, setDragging] = useState<number>();

  return (
    <section data-theme={scheme} className={styles.column} aria-label={`Tema ${scheme}`}>
      <div className={styles.lamp} aria-hidden="true" />
      <div className={styles.inner}>
        <header className={styles.head}>
          <h2 className={styles.wordmark}>Ex-libris</h2>
          <Overline>{scheme === 'light' ? 'claro · Ateliê' : 'escuro · Sebo à noite'}</Overline>
        </header>

        <Overline>Cores</Overline>
        <div className={styles.swatches}>
          {swatches.map(([name, token]) => (
            <div key={name} className={styles.swatch}>
              <span className={styles.chip} style={{ background: `var(${token})` }} />
              <code>{name}</code>
            </div>
          ))}
        </div>

        <Overline>Tipografia</Overline>
        <p className={styles.display}>Todo PDF merece ser folheado.</p>
        <p>
          Atkinson Hyperlegible Next para textos de interface, feita para ser lida por todo mundo.
        </p>
        <p className={styles.mono}>IBM Plex Mono · Nº 0001 · pág. 12–13 / 51</p>

        <Overline>Botões</Overline>
        <div className={styles.row}>
          <Button variant="primary" icon="upload">
            Escolher arquivo
          </Button>
          <Button>Abrir</Button>
          <Button variant="ghost">Cancelar</Button>
          <IconButton icon="next" label="Próxima página" />
          <IconButton
            icon="settings"
            label="Ajustes"
            pressed={panel}
            onClick={() => setPanel(!panel)}
          />
        </div>

        <Overline>Campos e controles</Overline>
        <div className={styles.row}>
          <TextField
            label="Endereço do arquivo"
            placeholder="https://…/livro.pdf"
            className={styles.grow}
          />
          <Segmented
            label="Páginas"
            value={layout}
            onChange={setLayout}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'single', label: 'Uma' },
              { value: 'double', label: 'Duas' },
            ]}
          />
        </div>
        <TextField
          label="Senha"
          type="password"
          defaultValue="segredo"
          error="Senha incorreta. Confira e tente de novo."
        />
        <Switch
          label="Capa sozinha"
          description="Como num livro fechado"
          checked={cover}
          onChange={setCover}
        />

        <Overline>Assinatura</Overline>
        <div className={styles.row}>
          <Stamp>Domínio público</Stamp>
          <Stamp tone="muted">Fora de circulação</Stamp>
          <Accession number={1} details={[1920, 'PT']} />
        </div>
        <Card label="Ficha de empréstimo" meta={<Accession />} perforated punched ruled>
          <p className={styles.cardTitle}>Traga um livro para a mesa.</p>
          <p className={styles.muted}>Arraste um PDF ou CBZ até aqui.</p>
        </Card>

        <Overline>Barra de leitura</Overline>
        <ReaderBar label="Controles de leitura">
          <IconButton icon="first" label="Primeira página" />
          <IconButton icon="prev" label="Página anterior" />
          <PageCounter current="12–13" total={51} label="Páginas 12 e 13 de 51. Ir para página" />
          <IconButton icon="next" label="Próxima página" />
          <IconButton icon="last" label="Última página" />
          <ReaderBarSeparator />
          <IconButton icon="thumbnails" label="Miniaturas" />
          <IconButton icon="outline" label="Sumário" />
          <ReaderBarSeparator />
          <IconButton icon="zoomOut" label="Diminuir zoom" />
          <IconButton icon="zoomIn" label="Aumentar zoom" />
          <IconButton icon="fullscreen" label="Modo imersivo" />
        </ReaderBar>

        <Overline>Barra do modo imersivo (faixa) e slider de páginas</Overline>
        <ReaderBar label="Controles de leitura" variant="strip">
          <IconButton icon="collapse" label="Sair do modo imersivo" />
          <ReaderBarSeparator />
          <IconButton icon="prev" label="Página anterior" onClick={() => setPage(page - 1)} />
          <PageCounter
            current={String(dragging ?? page)}
            total={212}
            label={`Página ${page} de 212. Ir para página`}
          />
          <PageSlider
            value={page}
            total={212}
            label="Posição no livro"
            valueText={(n) => `Página ${n} de 212`}
            onPreview={setDragging}
            onCommit={setPage}
          />
          <IconButton icon="next" label="Próxima página" onClick={() => setPage(page + 1)} />
          <ReaderBarSeparator />
          <IconButton icon="thumbnails" label="Índice" />
          <IconButton icon="settings" label="Ajustes" />
        </ReaderBar>

        <Overline>Popover</Overline>
        <Popover title="Ajustes de leitura" meta={<Accession number={1} />}>
          <PopoverRow>
            <span>Tema</span>
            <Segmented
              label="Tema"
              value="system"
              onChange={() => {}}
              options={[
                { value: 'system', label: 'Sistema' },
                { value: 'light', label: 'Claro' },
                { value: 'dark', label: 'Escuro' },
              ]}
            />
          </PopoverRow>
          <PopoverRow>
            <Switch label="Ponta no canto" checked onChange={() => {}} />
          </PopoverRow>
        </Popover>

        <Overline>Gaveta</Overline>
        <div className={styles.drawerFrame}>
          <Drawer title="Índice" closeLabel="Fechar índice" onClose={() => {}}>
            <DrawerSection title="Sumário">
              <p className={styles.muted}>Capítulo I · 3</p>
            </DrawerSection>
          </Drawer>
        </div>

        <Overline>Aviso</Overline>
        <Notice action={{ label: 'Recarregar', onClick: () => {} }}>
          Nova edição do Folheia disponível
        </Notice>
      </div>
    </section>
  );
}

export default function StyleGuide() {
  return (
    <main className={styles.guide}>
      <Showcase scheme="light" />
      <Showcase scheme="dark" />
    </main>
  );
}
