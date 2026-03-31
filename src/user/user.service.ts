import { Injectable } from '@nestjs/common';
import { RegisterUserDto } from 'src/auth/dto/RegisterUser.dto';
import { PrismaService } from 'src/database/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  async getUserByEmail(email: string) {
    const user = await this.prismaService.user.findFirst({ where: { email } });
    return user;
  }

  async createUser(userData: RegisterUserDto) {
    const newUser = await this.prismaService.user.create({ data: userData });
    return newUser;
  }
}
