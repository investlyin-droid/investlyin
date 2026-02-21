import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<Pick<AuthService, 'firebaseLogin' | 'firebaseRegister'>>;

  beforeEach(async () => {
    authService = {
      firebaseLogin: jest.fn(),
      firebaseRegister: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('firebaseLogin', () => {
    it('should call authService.firebaseLogin and return access_token and user', async () => {
      const token = 'firebase-id-token-here';
      const result = { access_token: 'jwt', user: { id: 'uid', email: 'u@example.com', role: 'user' } };
      authService.firebaseLogin.mockResolvedValue(result as any);

      const body = { firebaseToken: token, email: 'u@example.com', displayName: 'User' };
      const out = await (controller as any).firebaseLogin(body);

      expect(authService.firebaseLogin).toHaveBeenCalledWith(token, 'u@example.com', 'User');
      expect(out).toEqual(result);
    });

    it('should trim email and displayName', async () => {
      authService.firebaseLogin.mockResolvedValue({ access_token: 'jwt', user: {} } as any);
      await (controller as any).firebaseLogin({
        firebaseToken: 'token',
        email: '  a@b.com  ',
        displayName: '  Name  ',
      });
      expect(authService.firebaseLogin).toHaveBeenCalledWith('token', 'a@b.com', 'Name');
    });
  });

  describe('firebaseRegister', () => {
    it('should call authService.firebaseRegister and return access_token and user', async () => {
      const result = { access_token: 'jwt', user: { id: 'uid', email: 'u@example.com', role: 'user' } };
      authService.firebaseRegister.mockResolvedValue(result as any);

      const body = {
        firebaseToken: 'firebase-token',
        email: 'u@example.com',
        displayName: 'User',
        firstName: 'First',
        lastName: 'Last',
      };
      const out = await (controller as any).firebaseRegister(body);

      expect(authService.firebaseRegister).toHaveBeenCalledWith(
        'firebase-token',
        'u@example.com',
        'User',
        'First',
        'Last',
      );
      expect(out).toEqual(result);
    });
  });
});
