import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );
    if (!requiredPermissions) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;

    // Allow superAdmin to bypass permission checks
    if (user.role === 'superAdmin') return true;

    // Check if user has all required permissions
    if (!user.permissions || !Array.isArray(user.permissions)) return false;

    return requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );
  }
}
