import { Controller, Post, Body} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { DatabaseColabsDto } from './dto/database-colabs.dto';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post('sync')
  async syncEmployees(@Body() databaseColabs:DatabaseColabsDto[]){   
    

    const sync = await this.employeesService.syncEmployees('Colaboradores', databaseColabs)
    
    return sync
  }

}
