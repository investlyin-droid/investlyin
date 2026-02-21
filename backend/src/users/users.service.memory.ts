import { Injectable } from '@nestjs/common';

interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: string;
  kycStatus: string;
  isEmailVerified: boolean;
  isActive: boolean;
}

@Injectable()
export class UsersService {
  private users: Map<string, User> = new Map();
  private usersByEmail: Map<string, User> = new Map();
  private idCounter = 1;

  constructor() {
    // Create a default admin user for testing
    const adminUser: User = {
      id: '1',
      email: 'admin@trading.com',
      passwordHash: '$2b$10$YourHashedPasswordHere', // Password: admin123
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      kycStatus: 'approved',
      isEmailVerified: true,
      isActive: true,
    };
    this.users.set('1', adminUser);
    this.usersByEmail.set('admin@trading.com', adminUser);
  }

  async create(createUserDto: any): Promise<User> {
    const id = String(this.idCounter++);
    const user: User = {
      id,
      email: createUserDto.email,
      passwordHash: createUserDto.passwordHash,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      role: createUserDto.role || 'user',
      kycStatus: 'not_submitted',
      isEmailVerified: false,
      isActive: true,
    };
    this.users.set(id, user);
    this.usersByEmail.set(user.email, user);
    return user;
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersByEmail.get(email) || null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values());
  }
}
