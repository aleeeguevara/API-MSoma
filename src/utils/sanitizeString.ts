export function sanitizeUpdateData(data: any): any {
  const sanitized = { ...data };
  for (const key in sanitized) {
    if (sanitized[key] === null || sanitized[key] === undefined) {
      delete sanitized[key]; // Remove campos com valores nulos ou indefinidos
    }
  }
  return sanitized;
}