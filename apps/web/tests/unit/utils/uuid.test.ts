import { describe, it, expect, vi } from 'vitest';
import { generateId } from '$utils/uuid';

describe('generateId', () => {
  it('returns a string', () => {
    expect(typeof generateId()).toBe('string');
  });

  it('returns a valid uuid v4 format', () => {
    const uuid = generateId();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuid).toMatch(uuidRegex);
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it('uses crypto.randomUUID when available', () => {
    const mockUUID = '550e8400-e29b-41d4-a716-446655440000';
    const spy = vi
      .spyOn(crypto, 'randomUUID')
      .mockReturnValue(mockUUID as `${string}-${string}-${string}-${string}-${string}`);

    const result = generateId();
    expect(result).toBe(mockUUID);
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });

  it('falls back when crypto.randomUUID is unavailable', () => {
    const original = crypto.randomUUID;
    // @ts-expect-error — deliberately removing for fallback test
    crypto.randomUUID = undefined;

    const id = generateId();
    expect(id).toHaveLength(36); // UUID format: 8-4-4-4-12
    expect(id.split('-')).toHaveLength(5);

    crypto.randomUUID = original;
  });
});
