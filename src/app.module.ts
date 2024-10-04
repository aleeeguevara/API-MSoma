import { Module } from '@nestjs/common';
import { EmployeesModule } from './employees/employees.module';
import { SharepointModule } from './sharepoint/sharepoint.module';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [
    ConfigModule,
    EmployeesModule,
    SharepointModule,
  ],
})
export class AppModule {}