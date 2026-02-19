// ──────────────────────────────────────────────
// WatchSpace Web — Placeholder Test
// ──────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

describe('WatchSpace Web', () => {
    it('should pass a placeholder test', () => {
        expect(true).toBe(true);
    });

    // TODO: Component tests with @testing-library/svelte
    it.todo('renders the landing page');
    it.todo('navigates to room page on create');
    it.todo('displays peer video tiles');
});
