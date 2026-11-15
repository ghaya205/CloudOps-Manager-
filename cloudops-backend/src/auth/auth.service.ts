import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import { User } from '../users/user.entity.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (await this.users.findOneBy({ email: dto.email })) {
      throw new ConflictException('Email already used');
    }
    const user = await this.users.save(
      this.users.create({ ...dto, password: await bcrypt.hash(dto.password, 10) }),
    );
    return this.sign(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOneBy({ email: dto.email });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.sign(user);
  }

  private async sign(user: User) {
    return { access_token: await this.jwt.signAsync({ sub: user.id, role: user.role }) };
  }
}