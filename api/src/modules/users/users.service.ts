import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  findByEmailOrGoogleId(email: string, googleId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: [{ email }, { googleId }],
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  findActiveByEmailWithPasswordHash(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getOne();
  }

  findActiveById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id, isActive: true } });
  }

  create(user: DeepPartial<User>): User {
    return this.userRepository.create(user);
  }

  save(user: User): Promise<User> {
    return this.userRepository.save(user);
  }
}