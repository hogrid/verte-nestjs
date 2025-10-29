import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserProfile } from '../../database/entities/user.entity';

/**
 * Admin Guard
 * Verifies that authenticated user has administrator permission
 * Compatible with Laravel admin middleware
 *
 * Usage: Apply AFTER JwtAuthGuard
 * @UseGuards(JwtAuthGuard, AdminGuard)
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // User should be injected by JwtAuthGuard
    if (!user) {
      throw new ForbiddenException('Usuário não autenticado.');
    }

    // Check if user has administrator profile
    // Note: The entity uses "profile" field, not "permission"
    if (user.profile !== UserProfile.ADMINISTRATOR) {
      throw new ForbiddenException(
        'Acesso negado. Apenas administradores podem acessar este recurso.',
      );
    }

    return true;
  }
}
