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
      Colaborador: employee.Nome_Colaborador || employee.Apelido_Colaborador,
      Matricula: employee.Matricula,
      DataAdm: dateToUTC(employee.Data_Admissao),
      DataNasc: dateToUTC(employee.Data_Nascimento),      
      Cargo: employee.Titulo_Cargo,
      CentroCusto: employee.Nome_Centro_de_Custo,
      Email: employee.Email_Comercial.trim()
    }));
  }

  async syncEmployees(listTitle: string, employeesDtb: DatabaseColabsDto[]): Promise<string> {
    let employees = this.formatEmployees(employeesDtb);
    console.log('sync employees');
    let updated = 0;
    let matriculaNotFound = 0;
    let created = 0;
    let deleted = 0;
    let notChanged = 0;
  
    try {
      let employeesSP = await this.sharepointService.getListItems(listTitle, this.siteId, this.listId);
      employeesSP = employeesSP.map(employee => ({ ...employee.fields }));
      console.log('employeesSP', employeesSP.length);
      console.log('employeesDB', employees.length);
  
      const updatePromises = employeesSP.map(async (spEmployee) => {
        const Matricula = spEmployee.Matricula;
        let employeeFound: SelectedPropsEmployeeDto | null = null;
  
        if (Matricula) {
          const matricula = normalizeName(spEmployee.Matricula);
          employeeFound = employees.find((c) => normalizeName(c.Matricula) === matricula);
        }
  
        if (!employeeFound) {
          matriculaNotFound++;
          console.log('Employee to delete', spEmployee.Title);
          const del = await this.sharepointService.deleteListItem(listTitle, spEmployee.id, this.listId);
          console.log(del.message)
          deleted++;
          return;
        }
  
        if (employeeFound) {
          const updateData: any = {};
          let hasChanges = false;
        
          if (employeeFound.Colaborador && employeeFound.Colaborador !== spEmployee.Title) {
            updateData.Title = employeeFound.Colaborador;
            hasChanges = true;
          }
        
          if (employeeFound.DataAdm && dateToUTC(employeeFound.DataAdm)?.split('T')[0] !== dateToUTC(spEmployee.DataContratacao)?.split('T')[0]) {            
            updateData.DataContratacao = dateToUTC(employeeFound.DataAdm);
            hasChanges = true;
          }
        
          if (employeeFound.DataNasc && dateToUTC(employeeFound.DataNasc)?.split('T')[0] !== dateToUTC(spEmployee.BirthdayDate)?.split('T')[0]) {            
            updateData.BirthdayDate = dateToUTC(employeeFound.DataNasc);
            hasChanges = true;
          }
        
          if (employeeFound.Matricula && employeeFound.Matricula !== spEmployee.Matricula) {            
            updateData.Matricula = employeeFound.Matricula;
            hasChanges = true;
          }
        
          if (employeeFound.Cargo && employeeFound.Cargo !== spEmployee.JobTitle) {
            updateData.JobTitle = employeeFound.Cargo;
            hasChanges = true;
          }
        
          if (employeeFound.Empresa && employeeFound.Empresa !== spEmployee.Empresa) {
            updateData.Empresa = employeeFound.Empresa;
            hasChanges = true;
          }
        
          if (employeeFound.CentroCusto && employeeFound.CentroCusto !== spEmployee.CentroCusto) {
            updateData.CentroCusto = employeeFound.CentroCusto;
            hasChanges = true;
          }

          if (employeeFound.Email && employeeFound.Email !== spEmployee.Email) {
            updateData.Email = employeeFound.Email;
            hasChanges = true;
          }
        
          if (hasChanges) {
            console.log('Employee found to update', updateData);
            updated++;
            await this.sharepointService.updateListItem(listTitle, spEmployee.id, updateData, this.listId);
          } else {            
            notChanged++;
          }
        }
      });
  
      await Promise.all(updatePromises);
  
      const employeesToCreate = employees.filter((empl) => {
        const matricula = empl.Matricula;
        return !employeesSP.some((colSP) => colSP.Matricula === matricula);
      });
  
      const createPromises = employeesToCreate.map(async (colab) => {
        const payload = {
          fields: {
            Title: colab.Colaborador,
            DataContratacao: colab.DataAdm ? dateToUTC(colab.DataAdm) : null,
            BirthdayDate: colab.DataNasc ? dateToUTC(colab.DataNasc) : null,
            Matricula: colab.Matricula,
            JobTitle: colab.Cargo,
            Empresa: colab.Empresa,
            CentroCusto: colab.CentroCusto,
            Email: colab.Email,
            Ativo: true,
          },
        };
  
        try {
          await this.sharepointService.createListItem(listTitle, payload, this.listId);
          console.log('Employee to create', payload.fields.Title);
          created++;
        } catch (error) {
          throw new HttpException('Erro ao criar colaborador', HttpStatus.BAD_REQUEST);
        }
      });
  
      await Promise.all(createPromises);
  
      return `Employees created successfully: ${created}, updated successfully: ${updated}, not changed: ${notChanged}, deleted successfully: ${deleted}, and matriculas not found: ${matriculaNotFound}`;
    } catch (error) {
      throw new HttpException(`Erro ao atualizar a lista do SharePoint: ${error}`, HttpStatus.BAD_REQUEST);
    }
  }
}