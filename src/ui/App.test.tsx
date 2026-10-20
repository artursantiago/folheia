import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('starts on the home screen with the loan card', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getAllByText('Folheia').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', { name: /Escolher arquivo|Choose file/ }),
    ).toBeInTheDocument();
  });
});
