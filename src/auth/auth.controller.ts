import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginUserDto } from './dto/LginUser.dto';
import { RegisterUserDto } from './dto/RegisterUser.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  @ApiOperation({ summary: 'Register a new user' })
  async signup(
    @Body() registerUserDTO: RegisterUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.signup(registerUserDTO);
    res.cookie('accessToken', data.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });

    res.cookie('refreshToken', data.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });

    return {
      message: 'Signup successful',
      userId: data.id,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email & password' })
  async login(
    @Body() loginUserData: LoginUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.login(loginUserData);
    res.cookie('accessToken', data.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });

    res.cookie('refreshToken', data.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });

    return {
      message: 'Login successful'
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access & refresh tokens' })
  async refresh(@Req() req: Request,@Res({passthrough:true}) res:Response) {
    const data = await this.authService.refreshTokens(req.cookies.refreshToken);
    res.cookie('accessToken', data.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });

    res.cookie('refreshToken', data.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });

    return {
      message: 'Login successful'
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout – invalidates refresh token' })
  async logout(@CurrentUser() user: JwtPayload, @Res({passthrough:true}) res:Response) {
    await this.authService.logout(user.id);
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return {
      message: 'Logout successful',
    };
  }

  @Get('self')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user.id);
  }
}
