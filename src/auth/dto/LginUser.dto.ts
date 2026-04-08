import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class LoginUserDto {
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  @Length(1, 100)
  @ApiProperty({
    example: 'user@example.com',
    description: 'Name of the entity',
    format: 'email',
  })
  readonly email: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  @ApiProperty({
    example: 'Test@1234',
    description: 'Password (will be hashed)',
  })
  readonly password: string;
}
