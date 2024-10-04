import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { ConfigModule } from '../config/config.module';
import { EmployeesController } from './employees.controller';
import { SharepointModule } from '../sharepoint/sharepoint.module';

@Module({
  imports: [SharepointModule, ConfigModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
})
export class EmployeesModule {}