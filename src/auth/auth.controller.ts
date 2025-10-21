import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  CheckMailConfirmationDto,
} from './dto';

/**
 * Auth Controller
 * Handles all authentication endpoints
 * Compatible with Laravel 8 AuthController routes
 *
 * Endpoints:
 * - POST /api/v1/login
 * - POST /api/v1/logout
 * - POST /api/v1/register
 * - POST /api/v1/reset (multi-step: 0, 1, 2)
 * - GET  /api/v1/ping
 * - POST /api/v1/check-mail-confirmation-code
 */
@Controller('api/v1')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/login
   * Authenticate user and return JWT token
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * POST /api/v1/logout
   * Logout authenticated user
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout() {
    return this.authService.logout();
  }

  /**
   * POST /api/v1/register
   * Register new user account
   */
  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * POST /api/v1/reset
   * Multi-step password reset process
   * Step 0: Send verification code
   * Step 1: Verify PIN
   * Step 2: Reset password
   */
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetDto);
  }

  /**
   * GET /api/v1/ping
   * Check authentication status and get user data
   */
  @Get('ping')
  @UseGuards(JwtAuthGuard)
  async ping(@Request() req: any) {
    return this.authService.ping(req.user);
  }

  /**
   * POST /api/v1/check-mail-confirmation-code
   * Verify email confirmation code
   */
  @Post('check-mail-confirmation-code')
  @HttpCode(HttpStatus.OK)
  async checkMailConfirmation(@Body() dto: CheckMailConfirmationDto) {
    return this.authService.checkMailConfirmation(dto);
  }
}
