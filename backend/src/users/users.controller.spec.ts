import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { FirestoreUsersService } from './firestore-users.service';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    findById: jest.fn(),
    updateProfile: jest.fn(),
    getProfile: jest.fn(),
    updateUserDoc: jest.fn(),
    disable2FAForUser: jest.fn(),
    removeApiKey: jest.fn(),
    findByIdWith2FA: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: FirestoreUsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
