import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirestoreUsersService } from './firestore-users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [ConfigModule],
  controllers: [UsersController],
  providers: [FirestoreUsersService],
  exports: [FirestoreUsersService],
})
export class UsersModule {}
