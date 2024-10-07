
export interface EmployeeDto {
  Empresa: string;
  CPF: string;
  Colaborador: string;
  Matricula: string;
  DataAdm: Date;
  DataNasc: Date;
  DescSituacao: string;
  Cargo: string;
  descCargo: string;
  Email?: string;
  CentroCusto?: string;
}
export interface SelectedPropsEmployeeDto {

  Colaborador: string;
  Matricula: string;
  DataAdm: Date;
  DataNasc: Date;  
  Cargo: string;    
  Empresa?: string;
  Email?: string;
  CentroCusto?: string;
}