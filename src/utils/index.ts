import { ForbiddenException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';

export * from './cloudinary';

export function generateRandomPassword(length: number = 6): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  const bytes = randomBytes(length);
  const password = Array.from(bytes)
    .map((byte) => chars[byte % chars.length])
    .join('');
  return password;
}

// Generate username for admin user
const prisma = new PrismaClient();

export const generateUniqueUsername = async (base: string): Promise<string> => {
  const cleanBase = base
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 10);
  let username = `${cleanBase}`;
  const getRandomNumber = () => Math.floor(Math.random() * 900) + 100;
  username = `${username}${getRandomNumber()}`;
  let attempts = 0;
  const maxAttempts = 10;
  while (await prisma.user.findUnique({ where: { username } })) {
    if (attempts >= maxAttempts) {
      throw new ForbiddenException('Unable to generate a unique username');
    }
    username = `${cleanBase}${getRandomNumber()}`;
    attempts++;
  }
  return username;
};
