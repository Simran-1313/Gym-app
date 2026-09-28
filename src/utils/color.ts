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

/** WCAG relative luminance (sRGB → linear, ITU-R BT.709 weights). */
const relativeLuminance = (hex: string): number => {
  const rgb = toRgb(hex);
  if (!rgb) return 1;
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = rgb.map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio between two colors, 1–21. */
const contrastRatio = (hexA: string, hexB: string): number => {
  const a = relativeLuminance(hexA) + 0.05;
  const b = relativeLuminance(hexB) + 0.05;
  return a > b ? a / b : b / a;
};

/**
 * The higher-contrast of near-black or white for text on `bgHex` — the
 * general form of "should this button's label be dark or light," correct
 * for whatever a tenant's actual brand color turns out to be rather than
 * assuming it behaves like this app's own default teal. A bright brand color
 * (teal, lime, amber) needs dark text; a deep one (navy, maroon, forest
 * green) needs light text — hardcoding either fails half of them.
 * `#0B1210`/`#F7FAF9` are near-black/near-white rather than pure — pure
 * black or white against a saturated color can look harsh; both still clear
 * WCAG AA (4.5:1) by a wide margin against anything this picks the "dark"
 * or "light" side for.
 */
export const bestTextOn = (bgHex: string): string => {
  const dark = '#0B1210';
  const light = '#F7FAF9';
  return contrastRatio(bgHex, dark) >= contrastRatio(bgHex, light) ? dark : light;
};

/**
 * Darkens `hex` just enough that white text on it clears WCAG AA (4.5:1),
 * for surfaces that must always carry white — a brand's primary CTA fill,
 * say, where the product wants one consistent "white on brand color" look
 * rather than the text flipping between light/dark per tenant (see
 * `bestTextOn` for that alternative). This app's own default teal
 * (#2DD4BF) is a bright accent — white on it is ~1.9:1, unreadable — so
 * committing to white text means the *fill* has to earn it instead. Works
 * for any tenant's brand color the same way: keeps its hue, deepens it only
 * as far as necessary. Already-dark colors pass on the first check and come
 * back unchanged.
 */
export const solidFillFor = (hex: string): string => {
  let amount = 0;
  for (let i = 0; i < 24; i++) {
    const candidate = amount === 0 ? hex : shade(hex, amount);
    if (contrastRatio('#FFFFFF', candidate) >= 4.5) return candidate;
    amount -= 0.05;
  }
  return shade(hex, -1); // pathological input; black always clears 21:1
};
