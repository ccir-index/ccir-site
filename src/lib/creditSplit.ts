// The /credit ledger split (John, 2026-09-26). CORE = every GPU-collateral
// row plus the other debt of the same issuers: the debt stack behind each GPU
// borrower, which the filing sweeps keep current. RELATED = debt from issuers
// with no GPU-collateral row (data-center landlords, miners, hyperscaler
// JVs). It is selected by hand, not maintained to completeness, and lives in
// a collapsed ledger on /research/data-center-bonds-price-the-tenant.
// Derived from collateral_class on every build, so a new row lands on the
// right surface with no edit here.
import creditData from '../data/credit_instruments.json';

const all = creditData.instruments as any[];

export const gpuIssuers = new Set(
  all.filter((i) => i.collateral_class === 'gpu').map((i) => i.issuer),
);
export const isCore = (i: any): boolean => gpuIssuers.has(i.issuer);
export const coreInstruments = all.filter(isCore);
export const relatedInstruments = all.filter((i) => !isCore(i));
export const coreIds = new Set(coreInstruments.map((i) => i.id));

// Where a ledger row lives. Chart marks and cross-links use this.
export const RELATED_PAGE = '/research/data-center-bonds-price-the-tenant';
export const rowHref = (id: string): string =>
  coreIds.has(id) ? `/credit#row-${id}` : `${RELATED_PAGE}#row-${id}`;
