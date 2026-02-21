import { Injectable, UnauthorizedException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FirestoreUsersService, FirestoreUser } from '../users/firestore-users.service';
import { JwtService } from '@nestjs/jwt';
import { FirebaseService } from './firebase.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: FirestoreUsersService,
    private jwtService: JwtService,
    private firebaseService: FirebaseService,
    private configService: ConfigService,
  ) {}

  /** True if admin allowlist is not set, or email is in ADMIN_ALLOWED_EMAILS / ADMIN_EMAIL */
  private isEmailAllowedForAdmin(email: string): boolean {
    const allowed =
      this.configService.get<string>('ADMIN_ALLOWED_EMAILS')?.trim() ||
      this.configService.get<string>('ADMIN_EMAIL')?.trim();
    if (!allowed) return true;
    const list = allowed.split(',').map((e) => e.trim().toLowerCase());
    return list.includes((email || '').toLowerCase());
  }

  /**
   * Issue JWT token for authenticated user (user stored in Firestore, id = Firebase UID)
   */
  issueToken(user: FirestoreUser): { access_token: string; user: any } {
    const payload = { email: user.email, sub: user.id, role: user.role };
    const role = user.role as string;
    const isAdminRole = role === 'admin' || role === 'super_admin';
    const adminAccessAllowed = isAdminRole && this.isEmailAllowedForAdmin(user.email);
    const userObj: any = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };
    if (isAdminRole) userObj.adminAccessAllowed = !!adminAccessAllowed;

    return {
      access_token: this.jwtService.sign(payload),
      user: userObj,
    };
  }

  /**
   * Firebase Registration - users stored in Firestore only
   */
  async firebaseRegister(firebaseToken: string, email: string, displayName: string, firstName: string, lastName: string) {
    try {
      return await this.firebaseRegisterInternal(firebaseToken, email, displayName, firstName, lastName);
    } catch (err: any) {
      if (err?.message?.includes('default credentials') || err?.message?.includes('Could not load')) {
        throw new ServiceUnavailableException(
          'Firebase is not configured. Add FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH to backend .env.',
        );
      }
      throw err;
    }
  }

  private async firebaseRegisterInternal(
    firebaseToken: string,
    email: string,
    displayName: string,
    firstName: string,
    lastName: string,
  ) {
    const decodedToken = await this.firebaseService.verifyToken(firebaseToken);
    const firebaseUid = decodedToken.uid;
    const role = (decodedToken.role as string) || 'user';
    const finalRole = (role === 'admin' || role === 'super_admin') ? role : 'user';

    let user = await this.usersService.findOneByFirebaseUid(firebaseUid);
    if (user) {
      return this.issueToken(user);
    }

    const existingUserByEmail = await this.usersService.findOneByEmail(email);
    if (existingUserByEmail) {
      throw new BadRequestException('User with this email already exists. Please sign in instead.');
    }

    const nameParts = displayName.split(' ');
    const finalFirstName = firstName || nameParts[0] || '';
    const finalLastName = lastName || nameParts.slice(1).join(' ') || '';

    const newUser = await this.usersService.create({
      id: firebaseUid,
      email,
      firstName: finalFirstName,
      lastName: finalLastName,
      role: finalRole,
      isEmailVerified: decodedToken.email_verified || false,
      isActive: true,
    });
    return this.issueToken(newUser);
  }

  /**
   * Firebase Login - users from Firestore only.
   * If no user exists for this UID but one exists for this email (e.g. different sign-in method),
   * we create a doc for the current UID with the same role so admin access works across providers.
   */
  async firebaseLogin(firebaseToken: string, email?: string, displayName?: string) {
    try {
      return await this.firebaseLoginInternal(firebaseToken, email, displayName);
    } catch (err: any) {
      if (err?.message?.includes('default credentials') || err?.message?.includes('Could not load')) {
        throw new ServiceUnavailableException(
          'Firebase is not configured. Add FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH to backend .env.',
        );
      }
      throw err;
    }
  }

  private async firebaseLoginInternal(firebaseToken: string, email?: string, displayName?: string) {
    const decodedToken = await this.firebaseService.verifyToken(firebaseToken);
    const firebaseUid = decodedToken.uid;
    const role = (decodedToken.role as string) || 'user';
    const emailResolved = (email && email.trim()) || (decodedToken.email as string) || '';
    const displayNameResolved = (displayName && displayName.trim()) || '';

    let user = await this.usersService.findOneByFirebaseUid(firebaseUid);
    if (!user) {
      const existingByEmail = emailResolved ? await this.usersService.findOneByEmail(emailResolved) : null;
      if (existingByEmail) {
        // Same person, different sign-in method (e.g. Google vs Email/Password). Preserve role and profile.
        user = await this.usersService.create({
          id: firebaseUid,
          email: existingByEmail.email,
          firstName: existingByEmail.firstName,
          lastName: existingByEmail.lastName,
          role: existingByEmail.role,
          isEmailVerified: decodedToken.email_verified || existingByEmail.isEmailVerified,
          isActive: existingByEmail.isActive !== false,
        });
      } else {
        const nameParts = (displayNameResolved || '').split(' ');
        user = await this.usersService.create({
          id: firebaseUid,
          email: emailResolved || decodedToken.uid + '@oauth.local',
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          role,
          isEmailVerified: decodedToken.email_verified || false,
          isActive: true,
        });
      }
    } else {
      const updates: Partial<FirestoreUser> = {};
      if (emailResolved && user.email !== emailResolved) updates.email = emailResolved;
      if (decodedToken.email_verified && !user.isEmailVerified) updates.isEmailVerified = true;
      if ((role === 'admin' || role === 'super_admin') && user.role !== role) updates.role = role;
      if (Object.keys(updates).length > 0) {
        user = (await this.usersService.updateUserDoc(user.id, updates)) || user;
      }
    }

    if (user.isActive === false) {
      throw new UnauthorizedException('Account is suspended. Contact support.');
    }
    return this.issueToken(user);
  }
}
