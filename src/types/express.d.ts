// types/express.d.ts

import { User } from '@prisma/client';

type UserWithoutPassword = Omit<User, 'password'>;

export interface AuthenticatedUser extends UserWithoutPassword {
  view_as?: 'admin' | 'superAdmin';
  schoolId?: string;
  permissions: string[];
}

declare namespace Express {
  export interface Request {
    user?: AuthenticatedUser;
  }
}
