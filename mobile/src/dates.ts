const BJ_OFFSET = 8 * 60 * 60 * 1000;

function bj(d: Date): Date {
  return new Date(d.getTime() + BJ_OFFSET);
}

export function localDateStr(d: Date = new Date()): string {
  const t = bj(d);
  const y = t.getUTCFullYear();
  const m = String(t.getUTCMonth() + 1).padStart(2, '0');
  const day = String(t.getUTCDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

export function monthStr(d: Date = new Date()): string {
  const t = bj(d);
  return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0');
}
