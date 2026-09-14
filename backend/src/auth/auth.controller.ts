import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { PublicAdmin } from '../common/types/public-admin';
import { AuthService } from './auth.service';
import { AuthResponse } from './auth.types';
import { ChangePasswordDto, UpdateProfileDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() dto: RefreshDto): Promise<AuthResponse> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get('me')
  me(@CurrentUser() admin: PublicAdmin): Promise<PublicAdmin> {
    return this.authService.me(admin);
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@CurrentUser() admin: PublicAdmin): Promise<{ success: true }> {
    return this.authService.logout(admin.id);
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() admin: PublicAdmin,
    @Body() dto: UpdateProfileDto,
  ): Promise<PublicAdmin> {
    return this.authService.updateProfile(admin.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  changePassword(
    @CurrentUser() admin: PublicAdmin,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ success: true }> {
    return this.authService.changePassword(admin.id, dto);
  }
}
