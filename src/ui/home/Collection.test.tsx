import { fireEvent, render, screen } from '@testing-library/react';
import { examples } from '../../examples';
import { Collection } from './Collection';

describe('Collection', () => {
  it('lists every example as a button and opens it on click', () => {
    const onOpen = vi.fn();
    render(<Collection onOpen={onOpen} />);
    const buttons = screen.getAllByRole('button', { name: /\(\d{4}\)/ });
    expect(buttons).toHaveLength(examples.length);
    fireEvent.click(buttons[0]!);
    expect(onOpen).toHaveBeenCalledWith(examples[0]);
  });

  it('only points to Wikimedia Commons over https', () => {
    for (const book of examples) expect(book.url).toMatch(/^https:\/\/upload\.wikimedia\.org\//);
  });
});
