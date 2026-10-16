/* Number and text formatting shared by the HUD, debrief, lab and daily share text. */

/** Signed percentage with a true minus sign: +1.2% / −3.4%. */
export function pct(x: number, digits = 1): string {
  return (x >= 0 ? '+' : '−') + Math.abs(x * 100).toFixed(digits) + '%';
}

/** CSS class for a signed value: 'up', 'down' or ''. */
export function signClass(v: number): string {
  return v > 0 ? 'up' : v < 0 ? 'down' : '';
}

/** 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st… */
export function ordinal(n: number): string {
  const teen = n % 100 > 10 && n % 100 < 14;
  return n + (teen ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
}

/** Three-star rating, filled then empty: ★★☆. */
export function starRow(n: number): string {
  return '★'.repeat(n) + '☆'.repeat(3 - n);
}
