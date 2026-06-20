import bcrypt from 'bcryptjs';
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(100),
  phone: z.string().optional(),
  role: z.enum(['RESIDENT', 'PROVIDER']).default('RESIDENT'),
  neighborhoodId: z.string().min(1),
  postcode: z.string().min(2).max(20),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function normalizePostcode(postcode: string): string {
  return postcode.trim().toUpperCase().replace(/\s+/g, ' ');
}

export function postcodeMatchesNeighborhood(postcode: string, allowed: string[]): boolean {
  const normalized = normalizePostcode(postcode);
  return allowed.some((p) => normalizePostcode(p) === normalized);
}
