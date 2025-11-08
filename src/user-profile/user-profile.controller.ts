import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserProfileService } from './user-profile.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

@ApiTags('User Profile')
@Controller('api/v1/user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UserProfileController {
  constructor(private readonly userProfileService: UserProfileService) {}

  @Get(':user')
  @ApiOperation({ summary: 'Dados do perfil', description: 'Retorna dados do perfil do usuário' })
  @ApiResponse({ status: 200, description: 'Perfil retornado' })
  async getProfile(@Param('user') userId: number) {
    return this.userProfileService.getProfile(userId);
  }

  @Post(':user')
  @ApiOperation({ summary: 'Atualizar perfil', description: 'Atualiza dados do perfil do usuário' })
  @ApiResponse({ status: 200, description: 'Perfil atualizado' })
  async updateProfile(@Param('user') userId: number, @Body() dto: UpdateUserProfileDto) {
    return this.userProfileService.updateProfile(userId, dto);
  }
}
