export function checkUserActive(status){
  switch(status) {
    case 'ATIVO':
    case 'FÉRIAS':
    case 'AF.AC.TRABALHO':
    case 'LICENÇA MATER.':
      return true;
    case 'INATIVO':
      return false;
    default:
      return false;
  } 
}