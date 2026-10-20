import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { formatAccession } from './Accession';
import { Dialog } from './Dialog';
import { IconButton } from './IconButton';
import { Segmented } from './Segmented';
import { Switch } from './Switch';
import { TextField } from './TextField';

describe('design system components', () => {
  it('IconButton exposes its label and pressed state', () => {
    render(<IconButton icon="settings" label="Ajustes" pressed />);
    const button = screen.getByRole('button', { name: 'Ajustes' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('Segmented behaves as a radio group', () => {
    function Harness() {
      const [value, setValue] = useState<'a' | 'b'>('a');
      return (
        <Segmented
          label="Páginas"
          value={value}
          onChange={setValue}
          options={[
            { value: 'a', label: 'Uma' },
            { value: 'b', label: 'Duas' },
          ]}
        />
      );
    }
    render(<Harness />);
    expect(screen.getByRole('radio', { name: 'Uma' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'Duas' }));
    expect(screen.getByRole('radio', { name: 'Duas' })).toBeChecked();
  });

  it('Switch toggles and is labelled', () => {
    const onChange = vi.fn();
    render(<Switch label="Capa sozinha" checked={false} onChange={onChange} />);
    const control = screen.getByRole('switch', { name: 'Capa sozinha' });
    expect(control).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(control);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('TextField links its error to the input', () => {
    render(<TextField label="Senha" error="Senha incorreta." />);
    const input = screen.getByLabelText('Senha');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Senha incorreta.');
  });

  it('Dialog opens and closes with Escape', () => {
    const onClose = vi.fn();
    render(
      <Dialog open title="Ficha do livro" label="Ficha" closeLabel="Fechar" onClose={onClose}>
        conteúdo
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Ficha do livro' });
    expect(dialog).toHaveAttribute('open');
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(onClose).toHaveBeenCalled();
  });

  it('formats accession numbers', () => {
    expect(formatAccession('Nº', 7)).toBe('Nº 0007');
    expect(formatAccession('No.')).toBe('No. ————');
  });
});
