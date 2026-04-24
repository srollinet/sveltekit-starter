import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import StackBadge from './StackBadge.svelte';

describe('StackBadge', () => {
  it('renders the technology name', () => {
    render(StackBadge, { name: 'SvelteKit', badge: 'Framework' });
    expect(screen.getByText('SvelteKit')).toBeInTheDocument();
  });

  it('renders the badge label', () => {
    render(StackBadge, { name: 'Drizzle', badge: 'Database' });
    expect(screen.getByText('Database')).toBeInTheDocument();
  });

  it('applies default badge-primary class', () => {
    render(StackBadge, { name: 'Test', badge: 'Label' });
    const badge = screen.getByText('Label');
    expect(badge).toHaveClass('badge-primary');
  });

  it('applies custom badgeClass when provided', () => {
    render(StackBadge, { name: 'Test', badge: 'Label', badgeClass: 'badge-accent' });
    const badge = screen.getByText('Label');
    expect(badge).toHaveClass('badge-accent');
  });
});
