import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(
    id: string,
  ): Promise<
    | (User & { permissions: string[]; school?: { id: string; name: string } })
    | null
  > {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        school: { select: { id: true, name: true } },
        subRole: {
          include: {
            permissions: {
              select: { permission: { select: { name: true } } },
            },
          },
        },
      },
    });
    if (!user) return null;

    const permissions =
      user.subRole?.permissions.map((p) => p.permission.name) || [];
    return { ...user, permissions }; 
  }

  async create(
    data: {
      firstname: string;
      lastname: string;
      othername?: string;
      email: string;
      phone?: string;
      gender?: 'Male' | 'Female';
      password: string;
      role: 'admin' | 'superAdmin';
      schoolId?: string;
      subRoleId?: string;                      
    },
    requester: User,     
  ): Promise<User> {
    if (data.role !== 'superAdmin' && !data.schoolId) {
      throw new ForbiddenException(
        'Non-superAdmin users must be assigned to a school',
      );
    }
    if (
      data.schoolId &&
      requester.schoolId &&
      data.schoolId !== requester.schoolId
    ) {
      throw new ForbiddenException('Cannot create user for a different school');
    }

    try {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      return await this.prisma.user.create({
        data: {
          firstname: data.firstname,
          lastname: data.lastname,
          othername: data.othername,
          email: data.email,
          phone: data.phone,
          gender: data.gender,
          password: hashedPassword,
          role: data.role,
          schoolId: data.schoolId,
          subRoleId: data.subRoleId,
        },
      });
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        throw new ForbiddenException('Email already exists');
      }
      throw new ForbiddenException('Failed to create user');
    }
  }

  async updateSubRole(
    userId: string,
    subRoleId: string,
    requester: User,
  ): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException('User not found');
    if (
      user.schoolId &&
      requester.schoolId &&
      user.schoolId !== requester.schoolId
    ) {
      throw new ForbiddenException(
        'Cannot modify user from a different school',
      );
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { subRoleId },
    });
  }
}
