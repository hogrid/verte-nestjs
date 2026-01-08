import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserProfileService } from './user-profile.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

@ApiTags('User Profile')
@Controller('api/v1')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UserProfileController {
  constructor(private readonly userProfileService: UserProfileService) {}

  /**
   * Laravel-compatible endpoints
   */
  @Get('profile')
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Retorna perfil do usuário autenticado',
  })
  @ApiResponse({ status: 200, description: 'Perfil retornado' })
  async getAuthenticatedProfile(@Request() req: { user: { id: number } }) {
    return this.userProfileService.getProfile(req.user.id);
  }

  @Put('profile')
  @ApiOperation({
    summary: 'Update user profile',
    description: 'Atualiza perfil do usuário autenticado',
  })
  @ApiResponse({ status: 200, description: 'Perfil atualizado' })
  async updateAuthenticatedProfile(
    @Request() req: { user: { id: number } },
    @Body() dto: UpdateUserProfileDto,
  ) {
    return this.userProfileService.updateProfile(req.user.id, dto);
  }

  /**
   * Legacy endpoints (backward compatibility)
   */
  @Get('user/:user')
  @ApiOperation({
    summary: 'Dados do perfil',
    description: 'Retorna dados do perfil do usuário',
  })
  @ApiResponse({ status: 200, description: 'Perfil retornado' })
  async getProfile(@Param('user') userId: number) {
    return this.userProfileService.getProfile(userId);
  }

  @Post('user/:user')
  @ApiOperation({
    summary: 'Atualizar perfil',
    description: 'Atualiza dados do perfil do usuário',
  })
  @ApiResponse({ status: 200, description: 'Perfil atualizado' })
  async updateProfile(
    @Param('user') userId: number,
    @Body() dto: UpdateUserProfileDto,
  ) {
    return this.userProfileService.updateProfile(userId, dto);
  }
}
