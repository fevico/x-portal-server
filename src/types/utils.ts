import { randomBytes } from 'crypto';

export function generateRandomPassword(length: number = 6): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  const bytes = randomBytes(length);
  const password = Array.from(bytes)
    .map((byte) => chars[byte % chars.length])
    .join('');
  return password;
}
