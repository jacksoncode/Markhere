/**
 * Shared theme application utilities (P0: 合并主题双轨 — see DESIGN.md §3).
 *
 * Previously the preset store (`useThemeStore`) and the custom theme store
 * (`useThemeEditorStore`) each wrote their own, partially overlapping set of
 * CSS custom properties and used a fragile lexical comparison
 * (`bg.toLowerCase() < '#888888'`) to decide dark vs. light mode.
 *
 * Both stores now funnel through the helpers below so that:
 *   1. Dark/light detection is consistent (WCAG relative luminance).
 *   2. The same canonical token set is driven regardless of source.
 */

/** Normalise a `#rgb` / `#rrggbb` string to lower-case `#rrggbb`, or null. */
export function normalizeHex(hex: string): string | null {
  if (typeof hex !== 'string') return null;
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return '#' + h.toLowerCase();
}

/**
 * Decide whether a colour should be treated as a "dark" background.
 *
 * Uses WCAG relative luminance instead of the previous lexical string
 * comparison, which mis-classified e.g. `#888889` (just past the boundary)
 * and any colour whose hex string sorts below `#888888` regardless of true
 * perceptual brightness.
 */
export function isDarkColor(hex: string): boolean {
  const c = normalizeHex(hex);
  if (!c) return false;

  const linear = (v: string) => {
    const s = parseInt(v, 16) / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  const r = linear(c.slice(1, 3));
  const g = linear(c.slice(3, 5));
  const b = linear(c.slice(5, 7));

  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 0.5;
}

/**
 * Set a batch of CSS custom properties on `:root` and toggle the
 * `data-theme` attribute based on the luminance of `bgHex`.
 */
export function applyThemeVariables(
  vars: Record<string, string>,
  bgHex: string,
): void {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }
  root.setAttribute('data-theme', isDarkColor(bgHex) ? 'dark' : 'light');
}
