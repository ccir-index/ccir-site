// The dateline a print carries. Under complete-day fixing (methodology
// v2.4.0) a print prices the Central day that ended at midnight and is
// published the next morning, so the page shows both: the fixing day and
// when the print was made. Without the second half a reader on the 17th
// sees "as of the 16th" and cannot tell whether we are late or deliberate.
export function printLine(meta: { as_of_date: string; published_at_ct?: string }): string {
  const pub = meta.published_at_ct ? meta.published_at_ct.slice(0, 16).replace('T', ' ') + ' CT' : '';
  return pub ? `${meta.as_of_date} · print of ${pub}` : meta.as_of_date;
}
