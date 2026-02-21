/**
 * Promote a user to admin by email. Uses Firestore for role; if the user
 * does not exist in Firestore yet, fetches them from Firebase Auth and
 * creates the first user document (so the users collection is created).
 *
 * Usage:
 *   npm run reset-admin
 *   ADMIN_EMAIL=user@example.com npm run reset-admin
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FirestoreUsersService } from './users/firestore-users.service';
import { FirebaseService } from './auth/firebase.service';

async function resetAdmin() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(FirestoreUsersService);
  const firebaseService = app.get(FirebaseService);

  const adminEmail =
    process.env.ADMIN_EMAIL ||
    (process.argv[2] as string) ||
    'admin@trading.com';

  console.log(`Looking up user by email: ${adminEmail}...`);

  let user = await usersService.findOneByEmail(adminEmail);

  if (!user) {
    console.log('User not found in Firestore. Checking Firebase Auth...');
    const authUser = await firebaseService.getUserByEmail(adminEmail);
    if (authUser) {
      console.log(`Found in Firebase Auth (uid: ${authUser.uid}). Creating user in Firestore...`);
      const nameParts = (authUser.displayName || '').split(' ');
      user = await usersService.create({
        id: authUser.uid,
        email: authUser.email || adminEmail,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        role: 'admin',
        isEmailVerified: authUser.emailVerified || false,
        isActive: true,
      });
      console.log(`✅ Created user in Firestore and set role to admin.`);
    } else {
      console.log('');
      console.log('User not found in Firestore or Firebase Auth.');
      console.log('1. Sign up / log in once with this email at /login or /admin/login.');
      console.log('2. Run this script again: npm run reset-admin');
      console.log('');
      console.log('Example: ADMIN_EMAIL=your@email.com npm run reset-admin');
      await app.close();
      process.exit(1);
    }
  } else {
    await usersService.setRoleByEmail(adminEmail, 'admin');
    console.log(`✅ User ${adminEmail} is now an admin.`);
  }

  console.log('   They can sign in at /login or /admin/login with their Firebase account.');
  await app.close();
}

resetAdmin().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
