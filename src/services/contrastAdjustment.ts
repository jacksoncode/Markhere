export class ContrastAdjustment {
  private static readonly STORAGE_KEY = 'markhere-high-contrast';

  static adjustForAccessibility(enabled: boolean): void {
    document.documentElement.setAttribute('data-contrast', enabled ? 'high' : 'default');
    localStorage.setItem(this.STORAGE_KEY, String(enabled));
  }

  static isHighContrastEnabled(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) === 'true';
  }

  static init(): void {
    if (this.isHighContrastEnabled()) {
      this.adjustForAccessibility(true);
    }
  }

  static getContrastRatio(fg: string, bg: string): number {
    const fgLum = this.getLuminance(fg);
    const bgLum = this.getLuminance(bg);
    const lighter = Math.max(fgLum, bgLum);
    const darker = Math.min(fgLum, bgLum);
    return (lighter + 0.05) / (darker + 0.05);
  }

  private static getLuminance(hex: string): number {
    const rgb = this.hexToRgb(hex);
    const [r, g, b] = rgb.map((val) => {
      val /= 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  private static hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [0, 0, 0];
    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16),
    ];
  }
}
