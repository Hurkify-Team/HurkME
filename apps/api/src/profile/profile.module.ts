import { Module } from '@nestjs/common';
import { JobsModule } from '@/jobs/jobs.module';
import { SearchModule } from '@/search/search.module';
import { UsersModule } from '@/users/users.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [JobsModule, SearchModule, UsersModule],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
