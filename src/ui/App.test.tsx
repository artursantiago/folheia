import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('shows the wordmark', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Folheia' })).toBeInTheDocument();
  });
});
