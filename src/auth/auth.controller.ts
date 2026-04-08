import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/RegisterUser.dto';
import { LoginUserDto } from './dto/LginUser.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async register(@Body() registerUserDTO: RegisterUserDto) {
    return this.authService.register(registerUserDTO);
  }

  @Post('login')
  async login(@Body() loginUserData: LoginUserDto) {
    const token=this.authService.login(loginUserData);
    return token;
  }
}
