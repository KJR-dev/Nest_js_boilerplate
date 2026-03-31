import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class RegisterUserDto {
  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  @ApiProperty({ example: 'Jitendra Sahoo', description: 'Name of the entity' })
  readonly name: string;

  @IsNotEmpty()
  @IsString()
  @IsEmail()
  @Length(1, 100)
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address',
    format: 'email',
  })
  readonly email: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  @ApiProperty({
    example: 'test@1234',
    description: 'Password (will be hashed)',
  })
  readonly password: string;
}
