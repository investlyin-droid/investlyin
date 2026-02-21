/**
 * Promote an existing user to admin by email. All auth is Firebase-only;
 * no users are created with passwords. The user must have registered
 * via Firebase first.
 *
 * Usage:
 *   npm run seed
 *   ADMIN_EMAIL=user@example.com npm run seed
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FirestoreUsersService } from './users/firestore-users.service';

async function seedAdmin() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(FirestoreUsersService);

  const adminEmail =
    process.env.ADMIN_EMAIL || 'admin@trading.com';

  const user = await usersService.findOneByEmail(adminEmail);

  if (!user) {
    console.log(`No user found for ${adminEmail}. All login/signup use Firebase only.`);
    console.log('Register this email via the app, then run npm run seed (or reset-admin) to set role to admin.');
    await app.close();
    return;
  }

  await usersService.setRoleByEmail(adminEmail, 'admin');
  console.log(`✅ ${adminEmail} promoted to admin. Sign in via Firebase at /login or /admin/login.`);

  await app.close();
}

seedAdmin().catch((err) => {
  console.error('Error seeding admin:', err);
  process.exit(1);
});
