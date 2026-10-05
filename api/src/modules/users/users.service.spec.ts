import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Pick<Repository<User>, 'findOne' | 'create' | 'save' | 'createQueryBuilder'>>;
  let queryBuilder: {
    addSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getOne: jest.Mock;
  };

  beforeEach(async () => {
    queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };
    userRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('finds a user by email or Google ID', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await service.findByEmailOrGoogleId('user@example.com', 'google-1');

    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: [{ email: 'user@example.com' }, { googleId: 'google-1' }],
    });
  });

  it('finds only active users by ID', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await service.findActiveById('user-id');

    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'user-id', isActive: true },
    });
  });

  it('selects the password hash only for active-user authentication', async () => {
    queryBuilder.getOne.mockResolvedValue(null);

    await service.findActiveByEmailWithPasswordHash('user@example.com');

    expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
    expect(queryBuilder.addSelect).toHaveBeenCalledWith('user.passwordHash');
    expect(queryBuilder.where).toHaveBeenCalledWith('user.email = :email', {
      email: 'user@example.com',
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.isActive = :isActive', {
      isActive: true,
    });
  });

  it('delegates create and save operations to the repository', async () => {
    const user = { email: 'user@example.com' } as User;
    userRepository.create.mockReturnValue(user);
    userRepository.save.mockResolvedValue(user);

    expect(service.create({ email: user.email })).toBe(user);
    await expect(service.save(user)).resolves.toBe(user);
    expect(userRepository.create).toHaveBeenCalledWith({ email: user.email });
    expect(userRepository.save).toHaveBeenCalledWith(user);
  });
});