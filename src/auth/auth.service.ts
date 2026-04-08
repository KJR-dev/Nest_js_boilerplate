import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from 'src/user/user.service';
import { LoginUserDto } from './dto/LginUser.dto';
import { RegisterUserDto } from './dto/RegisterUser.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';


@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  // ── Register ────────────────────────────────────────────────────────────────
  async signup(registerUserDTO: RegisterUserDto) {
    const existingUser = await this.userService.getUserByEmail(
      registerUserDTO.email,
    );
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashPassword = await bcrypt.hash(
      registerUserDTO.password,
      parseInt(process.env.SALT_ROUNDS as string, 10),
    );

    const newUser = await this.userService.createUser({
      ...registerUserDTO,
      password: hashPassword,
    });

    // Issue token pair on registration
    const tokens = await this.generateTokens({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    });

    await this.userService.updateRefreshToken(newUser.id, tokens.refreshToken);

    return { id: newUser.id, ...tokens };
  }

  // ── Login ───────────────────────────────────────────────────────────────────
  async login(loginUserData: LoginUserDto) {
    const user = await this.userService.getUserByEmail(loginUserData.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginUserData.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    await this.userService.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  // ── Refresh Tokens ──────────────────────────────────────────────────────────
  async refreshTokens(refreshToken: string) {
    // 1. Decode without full verification to get the user id
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken);
    } catch {
      throw new ForbiddenException('Invalid or expired refresh token');
    }

    // 2. Fetch user & compare stored hash
    const user = await this.userService.getUserById(payload.id);
    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Access denied');
    }

    const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isMatch) {
      throw new ForbiddenException('Access denied');
    }

    // 3. Rotate tokens
    const tokens = await this.generateTokens({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    await this.userService.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  // ── Logout ──────────────────────────────────────────────────────────────────
  async logout(userId: number) {
    await this.userService.clearRefreshToken(userId);
    return;
  }

  // ── Profile ─────────────────────────────────────────────────────────────────
  async getProfile(userId: number) {
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const { password, refreshToken, ...profile } = user;
    return profile;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  private async generateTokens(payload: JwtPayload) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '15m' }),
      this.jwtService.signAsync(payload, { expiresIn: '7d' }),
    ]);
    return { accessToken, refreshToken };
  }
}
