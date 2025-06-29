import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }

  async createFromGoogle(googleUser: {
    email: string;
    firstName: string;
    lastName: string;
    picture: string;
    googleId: string;
  }): Promise<User> {
    const user = this.usersRepository.create({
      email: googleUser.email,
      firstName: googleUser.firstName,
      lastName: googleUser.lastName,
      picture: googleUser.picture,
      googleId: googleUser.googleId,
    });
    return this.usersRepository.save(user);
  }

  async findOrCreateFromGoogle(googleUser: any): Promise<User> {
    let user = await this.findByEmail(googleUser.email);

    if (!user) {
      user = await this.create({
        email: googleUser.email,
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
        picture: googleUser.picture,
        googleId: googleUser.googleId,
        role: googleUser.role,
        password: '', // Empty password for Google users
      });
    }

    return user;
  }
}
