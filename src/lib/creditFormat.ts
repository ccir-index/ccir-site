// Cell formatters shared by the /credit ledger and the related-debt ledger on
// /research/data-center-bonds-price-the-tenant. One copy, so the two tables
// can never render the same row two ways.

export function fmtRate(rate: any): string {
  if (rate.kind === 'undisclosed') return 'Undisclosed';
  if (rate.kind === 'sofr_spread') {
    if (rate.value == null && rate.value_low != null)
      return `SOFR +${rate.value_low.toFixed(2)}–${rate.value_high.toFixed(2)}%`;
    return `SOFR +${rate.value.toFixed(2)}%`;
  }
  if (rate.kind === 'fixed') {
    if (rate.value == null && rate.value_low != null)
      return `${rate.value_low.toFixed(2)}–${rate.value_high.toFixed(2)}%`;
    if (rate.value == null) return 'See note';
    return `${rate.value.toFixed(3).replace(/0$/, '')}%`;
  }
  // floating_other — benchmark lives in the note; show its lead clause.
  if (rate.note) {
    const short = rate.note.split(';')[0];
    return short.length > 34 ? short.slice(0, 32) + '…' : short;
  }
  return 'Floating';
}
export function rateTitle(rate: any): string {
  return rate.note ?? '';
}
export function fmtSize(v: number | null): string {
  if (v == null) return '—';
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 10) return v.toLocaleString('en-US', { maximumFractionDigits: 1 });
  return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
export function senClass(seniority: string | null): string {
  const s = (seniority ?? '').toLowerCase();
  if (s.includes('unsecured')) return 'unsecured';
  if (s.includes('secured') || s.includes('mortgage') || s.includes('lien')) return 'secured';
  return 'other';
}
export const TYPE_LABEL: Record<string, string> = {
  bond: 'Bond',
  convertible: 'Convertible',
  credit_facility: 'Credit facility',
  lease: 'Lease',
  abs: 'ABS',
  other: 'Other',
};
