/** Small hex color helpers — no dependency pulled in just to shade a tenant's brand color. */

const clamp = (n: number) => Math.max(0, Math.min(255, n));

const toRgb = (hex: string): [number, number, number] | null => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
};

const toHex = (rgb: [number, number, number]): string =>
  '#' + rgb.map((c) => clamp(Math.round(c)).toString(16).padStart(2, '0')).join('');

/** Positive `amount` lightens toward white, negative darkens toward black. Range roughly [-1, 1]. */
export const shade = (hex: string, amount: number): string => {
  const rgb = toRgb(hex);
  if (!rgb) return hex;
  const target = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  return toHex(rgb.map((c) => c + (target - c) * t) as [number, number, number]);
};

/** Basic hex format check — a tenant-supplied `primaryColor` is user input from an admin panel. */
export const isValidHex = (hex?: string | null): hex is string =>
  Boolean(hex && /^#?[a-f\d]{6}$/i.test(hex.trim()));
