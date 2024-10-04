export function normalizeName(nome: string) {
  return nome ? nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim() : ''
}