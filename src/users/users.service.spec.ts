import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { Types } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './entities/user.entity';
import { NotFoundException } from '@nestjs/common';
import { Role } from '../auth/enums/role.enum';

describe('UsersService', () => {
  let service: UsersService;
  let mockUserModel: any;

  beforeEach(async () => {
    mockUserModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    it('should create and save a user', async () => {
      const dto = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: '',
        role: Role.CONDUCTOR,
        googleId: '',
        picture: '',
      };

      const savedUser = {
        ...dto,
        save: jest.fn().mockResolvedValue(dto),
      };

      const modelConstructor = jest.fn(() => savedUser);
      Object.assign(modelConstructor, mockUserModel);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UsersService,
          {
            provide: getModelToken(User.name),
            useValue: modelConstructor,
          },
        ],
      }).compile();

      const serviceWithCreate = module.get<UsersService>(UsersService);
      const result = await serviceWithCreate.create(dto);

      expect(result).toEqual(dto);
      expect(savedUser.save).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return user by ID', async () => {
      const user = {
        _id: 'abc123',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: Role.CONDUCTOR,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) });

      const result = await service.findOne('abc123');
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException if not found', async () => {
      mockUserModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.findOne('notfound')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      const user = {
        _id: 'user123',
        email: 'email@example.com',
        firstName: 'Email',
        lastName: 'User',
        role: Role.CONDUCTOR,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) });

      const result = await service.findByEmail('email@example.com');
      expect(result).toEqual(user);
    });
  });

  describe('update', () => {
    it('should update and return user', async () => {
      const updatedUser = {
        _id: 'abc123',
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'User',
        role: Role.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedUser),
      });

      const result = await service.update('abc123', { email: 'updated@example.com' });
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException if not found', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.update('notfound', { email: 'none' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete user', async () => {
      mockUserModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'abc123' }),
      });

      await expect(service.remove('abc123')).resolves.toBeUndefined();
    });

    it('should throw NotFoundException if not found', async () => {
      mockUserModel.findByIdAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.remove('notfound')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createFromGoogle', () => {
    it('should create user from Google info', async () => {
      const googleUser = {
        email: 'google@example.com',
        firstName: 'Google',
        lastName: 'User',
        picture: 'https://img.com/photo.png',
        googleId: 'google-id-123',
      };

      const savedUser = {
        ...googleUser,
        save: jest.fn().mockResolvedValue(googleUser),
      };

      const modelConstructor = jest.fn(() => savedUser);
      Object.assign(modelConstructor, mockUserModel);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UsersService,
          {
            provide: getModelToken(User.name),
            useValue: modelConstructor,
          },
        ],
      }).compile();

      const serviceWithGoogle = module.get<UsersService>(UsersService);
      const result = await serviceWithGoogle.createFromGoogle(googleUser);

      expect(result).toEqual(googleUser);
      expect(savedUser.save).toHaveBeenCalled();
    });
  });

  describe('findOrCreateFromGoogle', () => {
    it('should return user if found by email', async () => {
      const existingUser = {
        _id: new Types.ObjectId(),
        email: 'exists@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: Role.CONDUCTOR,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'findByEmail').mockResolvedValue(existingUser);

      const result = await service.findOrCreateFromGoogle(existingUser);
      expect(result).toEqual(existingUser);
    });

    it('should create user if not found by email', async () => {
      const newUser = {
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        picture: '',
        googleId: 'xyz',
        role: Role.CONDUCTOR,
        password: '',
      };

      const createdUser = {
        ...newUser,
        _id: 'abc',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(service, 'create').mockResolvedValue(createdUser as any);

      const result = await service.findOrCreateFromGoogle(newUser);
      expect(result).toEqual(createdUser);
    });
  });

  describe('findAdmins', () => {
    it('should return all admin users', async () => {
      const admins = [{ email: 'admin@example.com', role: Role.ADMIN }];
      mockUserModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue(admins) });

      const result = await service.findAdmins();
      expect(result).toEqual(admins);
      expect(mockUserModel.find).toHaveBeenCalledWith({ role: 'admin' });
    });
  });

  describe('findDrivers', () => {
    it('should return all drivers', async () => {
      const drivers = [{ email: 'driver@example.com', role: Role.CONDUCTOR }];
      mockUserModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue(drivers) });

      const result = await service.findDrivers();
      expect(result).toEqual(drivers);
      expect(mockUserModel.find).toHaveBeenCalledWith({ role: 'conductor' });
    });
  });

  describe('findLogistics', () => {
    it('should return all logistics', async () => {
      const logistics = [{ email: 'logi@example.com', role: Role.LOGISTICA }];
      mockUserModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue(logistics) });

      const result = await service.findLogistics();
      expect(result).toEqual(logistics);
      expect(mockUserModel.find).toHaveBeenCalledWith({ role: 'logística' });
    });
  });
});
