import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseColabsDto } from './dto/database-colabs.dto';
import axios from 'axios';
import { dateToUTC } from '../utils/normalizeUtcDate';
import { SharepointService } from '../sharepoint/sharepoint.service';
import { EmployeeDto, SelectedPropsEmployeeDto } from './dto/sync-employees.dto';
import { normalizeName } from '../utils/normalizeName.regex';
import { ConfigService } from '@nestjs/config';
import { checkUserActive } from 'src/utils/checkUserActive';



@Injectable()
export class EmployeesService {
  private readonly listId: string;
  private readonly siteId: string;
  constructor(
    private readonly sharepointService: SharepointService,
    private readonly configService: ConfigService,
  ) {
    this.siteId = this.configService.get<string>('SITE_ID');
    this.listId = this.configService.get<string>('LIST_ID');
  }

  private formatEmployees(employees): EmployeeDto[] {
    return employees.map(employee => ({
      Empresa: employee.Nome_Empresa,    
      Colaborador: employee.Nome_Colaborador,
      Matricula: employee.Matricula,
      DataAdm: dateToUTC(employee.Data_Admissao),
      DataNasc: dateToUTC(employee.Data_Nascimento),      
      Cargo: employee.Titulo_Cargo
      
    }));
  }

  async syncEmployees(listTitle: string, employeesDtb: DatabaseColabsDto[]): Promise<string> {
    let employees = this.formatEmployees(employeesDtb)
    console.log('sync employees')
    let updated = 0;    
    let matriculaNotFound = 0;
    let notFound = 0;
    let deleted = 0;

    try {
      let employeesSP = await this.sharepointService.getListItems(listTitle, this.siteId, this.listId);
      employeesSP = employeesSP.map(employee => ({ ...employee.fields }));
      console.log('employeesSP', employeesSP.length)

      for (const spEmployee of employeesSP) {
        const Matricula = spEmployee.Matricula;
        let employeeFound: SelectedPropsEmployeeDto | null = null;

        if (Matricula) {
          const matricula = normalizeName(spEmployee.Matricula);
          employeeFound = employees.find((c) => normalizeName(c.Matricula) === matricula);
        }

        if (!employeeFound) {
            matriculaNotFound++;
            console.log('Employee to delete')
            // const deleted = await this.sharepointService.deleteListItem(listTitle, spEmployee.Id, this.listId);
            // console.log(deleted.message)
            deleted++
            continue;          
        }

        if (employeeFound) {
          const updateData: any = {};

          if (employeeFound.Colaborador) {
            updateData.Title = employeeFound.Colaborador;
          }

          if (employeeFound.DataAdm) {
            updateData.DataContratacao = dateToUTC(employeeFound.DataAdm);
          }

          if (employeeFound.DataNasc) {
            updateData.BirthdayDate = dateToUTC(employeeFound.DataNasc);
          }

          if (employeeFound.Matricula) {
            updateData.Matricula = employeeFound.Matricula;
          }

          if (employeeFound.Cargo) {
            updateData.JobTitle = employeeFound.Cargo;
          }


          if(employeeFound.Empresa){
            updateData.Empresa = employeeFound.Empresa;
          }

          console.log('Employee to update', updateData)
          await this.sharepointService.updateListItem(listTitle, spEmployee.id, updateData, this.listId);
          updated++;
        }
      }

      const employeesToCreate = employees.filter((empl) => {
        const matricula = empl.Matricula;

        return !employeesSP.some(
          (colSP) => colSP.Matricula === matricula
        );
      });

      for (const colab of employeesToCreate) {
        const payload = {
          fields: {
            Title: colab.Colaborador,            
            DataContratacao: colab.DataAdm ? dateToUTC(colab.DataAdm) : null,
            BirthdayDate: colab.DataNasc ? dateToUTC(colab.DataNasc) : null,
            Matricula: colab.Matricula,
            JobTitle: colab.Cargo,
            Empresa: colab.Empresa,
            Ativo: true
          }
        };

        try {
          // await this.sharepointService.createListItem(listTitle, payload, this.listId);
          console.log(payload);
          notFound++;
        } catch (error: any) {
          throw new HttpException('Erro ao criar colaborador', HttpStatus.BAD_REQUEST);
        }
      }

      return `Employees created successfully: ${notFound} and updated successfully ${updated} and deleted successfully ${deleted}`;
    } catch (error: any) {
      throw new HttpException(`Erro ao atualizar a lista do SharePoint ${error}`, HttpStatus.BAD_REQUEST);
    }
  }
}