import { ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { UserService } from 'src/user/user.service';
import { LoginUserDto } from './dto/LginUser.dto';
import { RegisterUserDto } from './dto/RegisterUser.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}
  async register(registerUserDTO: RegisterUserDto) {
    /*
    * 1. check user exist or not (✅)
    * 2. if user exist then throw error (✅)
    * 3. if user not exist then generate hash password (✅)
    * 4. create jwt token (✅)
    // * 5. set accessToken (😔)
    // * 6. set refreshToken (😔)
    * 7. return response
    */
    const user = await this.userService.getUserByEmail(registerUserDTO.email);
    if (user) {
      throw new ConflictException('User already exists');
    } else {
      const hashPassword: string = await bcrypt.hash(
        registerUserDTO.password,
        parseInt(process.env.SALT_ROUNDS as string, 10),
      );

      const newUser = await this.userService.createUser({
        ...registerUserDTO,
        password: hashPassword,
      });

      return { id: newUser.id };
    }
  }

  async login(loginUserData: LoginUserDto) {
    const user = await this.userService.getUserByEmail(loginUserData.email);
    if (!user) {
      throw new ConflictException('User not found');
    } else {
      const isPasswordValid = await bcrypt.compare(
        loginUserData.password,
        user.password,
      );
      if (!isPasswordValid) {
        throw new ConflictException('Invalid password');
      } else {
        const payload = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };

        const token = this.jwtService.sign(payload, {
          expiresIn: '7d',
        });

        return { token };
      }
    }
  }
}
