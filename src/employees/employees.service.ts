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
  private readonly baseUrl: string;
  constructor(
    private readonly sharepointService: SharepointService,
    private readonly configService: ConfigService,
  ) {
    this.siteId = this.configService.get<string>('SITE_ID');
    this.listId = this.configService.get<string>('LIST_ID');
    this.baseUrl = this.configService.get<string>('BASE_URL');

    console.log('Site ID:', this.siteId);
    console.log('List ID:', this.listId);
  }


  async getEmployees(token: string): Promise<EmployeeDto[]> {
    console.log('getting principals', token);
    try {
      const response = await axios.get(`${this.baseUrl}/employees`, { headers: { Authorization: `Bearer ${token}` } });
      return response.data.employee.map((employee: any) => ({
        Empresa: employee.Empresa || '',
        CPF: employee.CPF || '',
        Colaborador: employee.Nome_Colaborador || '',
        Matricula: employee.Matricula || '',
        DataAdm: employee.Data_Admissao || '',
        DataNasc: employee.Data_Nascimento || '',
        DescSituacao: employee.DESC_SITUACAO || '',
        Cargo: employee.Titulo_Cargo || '',
        descCargo: employee.DESC_CARGO || ''
      }));
    } catch (err) {
      throw new HttpException('Erro ao acessar a API', HttpStatus.BAD_REQUEST);
    }
  }
  private formatEmployees(employees): EmployeeDto[] {
    return employees.map(employee => ({
      Empresa: employee.Empresa,
      CPF: employee.CPF,
      Colaborador: employee.Colaborador,
      Matricula: employee.Matricula.toString(),
      DataAdm: dateToUTC(employee.DataAdm),
      DataNasc: dateToUTC(employee.DataNasc),
      DescSituacao: employee.DescSituacao,
      Cargo: employee.Cargo,
      descCargo: employee.descCargo
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
          // await this.sharepointService.updateListItem(listTitle, spEmployee.id, updateData, this.listId);
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
      throw new HttpException('Erro ao atualizar a lista do SharePoint', HttpStatus.BAD_REQUEST);
    }
  }
}