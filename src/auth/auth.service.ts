import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { Role } from './enums/role.enum';

interface GoogleUser {
  email: string;
  firstName: string;
  lastName: string;
  picture: string;
  googleId: string;
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName, role } = registerDto;

    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.usersService.create({
      email,
      firstName,
      lastName,
      role,
      password: hashedPassword,
    });

    // Generate JWT token
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };
    const token = this.jwtService.sign(payload);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };
    const token = this.jwtService.sign(payload);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
    };
  }

  async validateUser(id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  async googleLogin(req: {
    user?: GoogleUser;
  }): Promise<{ message: string; user?: any; token?: string }> {
    if (!req.user) {
      return { message: 'No user from Google' };
    }

    const { email, firstName, lastName, picture, googleId } = req.user;

    // Check if user already exists
    let user = await this.usersService.findByEmail(email);

    if (!user) {
      // Create new user from Google data
      user = await this.usersService.create({
        email,
        firstName,
        lastName,
        picture,
        googleId,
        password: '', // No password for Google users
        role: Role.CONDUCTOR, // Default role
      });
    } else if (!user.googleId) {
      // Link existing account with Google
      await this.usersService.update(user._id.toString(), {
        googleId,
        picture: picture || user.picture,
      });
    }

    // Generate JWT token
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
    };
    const token = this.jwtService.sign(payload);

    return {
      message: 'Google login successful',
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        picture: user.picture,
        role: user.role,
      },
      token,
    };
  }
}
