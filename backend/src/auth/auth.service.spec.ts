import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { FirestoreUsersService } from '../users/firestore-users.service';
import { FirebaseService } from './firebase.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtSign: jest.Mock;
  let usersService: jest.Mocked<Pick<FirestoreUsersService, 'findOneByFirebaseUid' | 'findOneByEmail' | 'create'>>;
  let firebaseService: jest.Mocked<Pick<FirebaseService, 'verifyToken'>>;

  const mockUser = {
    id: 'firebase-uid',
    email: 'user@example.com',
    firstName: 'First',
    lastName: 'Last',
    role: 'user',
    isEmailVerified: true,
    isActive: true,
  };

  beforeEach(async () => {
    jwtSign = jest.fn().mockReturnValue('mock-jwt-token');
    usersService = {
      findOneByFirebaseUid: jest.fn(),
      findOneByEmail: jest.fn(),
      create: jest.fn(),
    };
    firebaseService = {
      verifyToken: jest.fn().mockResolvedValue({
        uid: 'firebase-uid',
        email: 'user@example.com',
        email_verified: true,
        role: 'user',
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: FirestoreUsersService, useValue: usersService },
        { provide: JwtService, useValue: { sign: jwtSign } },
        { provide: FirebaseService, useValue: firebaseService },
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('issueToken', () => {
    it('should return access_token and user with adminAccessAllowed when role is admin', () => {
      const out = service.issueToken({ ...mockUser, role: 'admin' } as any);
      expect(out.access_token).toBe('mock-jwt-token');
      expect(out.user).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        role: 'admin',
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
      });
      expect(out.user.adminAccessAllowed).toBeDefined();
      expect(jwtSign).toHaveBeenCalledWith(
        expect.objectContaining({ email: mockUser.email, sub: mockUser.id, role: 'admin' }),
      );
    });

    it('should return user without adminAccessAllowed for role user', () => {
      const out = service.issueToken(mockUser as any);
      expect(out.user.role).toBe('user');
      expect(out.user.adminAccessAllowed).toBeUndefined();
    });
  });

  describe('firebaseLogin', () => {
    it('should return token when user exists by Firebase UID', async () => {
      (usersService.findOneByFirebaseUid as jest.Mock).mockResolvedValue(mockUser);
      (usersService.findOneByEmail as jest.Mock).mockResolvedValue(null);

      const out = await service.firebaseLogin('firebase-token', 'user@example.com', 'Display');
      expect(firebaseService.verifyToken).toHaveBeenCalledWith('firebase-token');
      expect(usersService.findOneByFirebaseUid).toHaveBeenCalledWith('firebase-uid');
      expect(out.access_token).toBe('mock-jwt-token');
      expect(out.user).toBeDefined();
    });
  });
});
