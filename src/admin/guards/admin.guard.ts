import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserProfile } from '../../database/entities/user.entity';

/**
 * AdminGuard
 *
 * Guard para proteger endpoints administrativos
 * Verifica se o usuário autenticado possui perfil 'administrator'
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado.');
    }

    // Verificar se o usuário é administrador
    if (user.profile !== UserProfile.ADMINISTRATOR) {
      throw new ForbiddenException('Acesso negado. Apenas administradores podem acessar este recurso.');
    }

    return true;
  }
}
