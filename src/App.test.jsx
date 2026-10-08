import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the taskflow sign in screen', () => {
  render(<App />);
  expect(screen.getByText(/make room for/i)).toBeDefined();
  expect(screen.getByRole('button', { name: /continue/i })).toBeDefined();
});
