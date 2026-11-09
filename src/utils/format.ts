const UNAVAILABLE = 'No disponible';
const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const percentage = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatCurrency(value: number | null): string {
  return value === null ? UNAVAILABLE : currency.format(value);
}

export function formatSignedPercent(value: number | null): string {
  if (value === null) return UNAVAILABLE;
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${percentage.format(Math.abs(value))} %`;
}
