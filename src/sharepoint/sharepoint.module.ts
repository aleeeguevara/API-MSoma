import { Module } from '@nestjs/common';
import { SharepointService } from './sharepoint.service';
import { AuthService } from './auth.service';

@Module({
  providers: [AuthService, SharepointService],
  exports: [SharepointService],
})
export class SharepointModule {}