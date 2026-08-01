/* Norwegian numbers: a space between thousands, a comma before decimals. Every
   amount the app writes - on a drawn Chart's axis and on the Market - is
   written the one way, so the same price never reads two ways. */
export function norwegianNumber(value: number, decimals: number): string {
  const [whole, fraction] = value.toFixed(decimals).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return fraction ? `${grouped},${fraction}` : grouped;
}
