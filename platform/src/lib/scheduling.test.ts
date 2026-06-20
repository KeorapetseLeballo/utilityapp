import { describe, it, expect } from 'vitest';
import {
  generateOccurrences,
  calculatePlatformFee,
  canTransitionOccurrence,
} from './scheduling';
import { normalizePostcode, postcodeMatchesNeighborhood } from './auth';

describe('scheduling', () => {
  it('generates occurrences on selected days', () => {
    const start = new Date('2026-06-01T00:00:00');
    const dates = generateOccurrences(start, [1, 3, 5], '09:00', 4);
    expect(dates.length).toBe(4);
    dates.forEach((d) => {
      expect([1, 3, 5]).toContain(d.getDay());
      expect(d.getHours()).toBe(9);
    });
  });

  it('calculates platform fee', () => {
    expect(calculatePlatformFee(10000, 10)).toBe(1000);
    expect(calculatePlatformFee(85000, 10)).toBe(8500);
  });

  it('validates occurrence transitions', () => {
    expect(canTransitionOccurrence('SCHEDULED', 'COMPLETED')).toBe(true);
    expect(canTransitionOccurrence('SCHEDULED', 'DISPUTED')).toBe(false);
    expect(canTransitionOccurrence('COMPLETED', 'DISPUTED')).toBe(true);
  });
});

describe('auth', () => {
  it('normalizes postcodes', () => {
    expect(normalizePostcode(' 7925 ')).toBe('7925');
    expect(normalizePostcode('77 00')).toBe('77 00');
  });

  it('matches neighborhood postcodes', () => {
    expect(postcodeMatchesNeighborhood('7925', ['7925', '7700'])).toBe(true);
    expect(postcodeMatchesNeighborhood('8001', ['7925', '7700'])).toBe(false);
  });
});
