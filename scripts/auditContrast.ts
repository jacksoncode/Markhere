// Contrast ratio audit script for Markhere themes
// Run: npx ts-node scripts/auditContrast.ts

interface ColorPair {
  name: string;
  foreground: string;
  background: string;
  expectedRatio: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((val) => {
    val /= 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(fg: string, bg: string): number {
  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);
  const l1 = getLuminance(...fgRgb);
  const l2 = getLuminance(...bgRgb);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Dark theme color pairs to audit
const darkThemePairs: ColorPair[] = [
  // Icons (need ratio >= 3:1 for AA on large elements)
  { name: 'icon-default', foreground: '#a0a0a0', background: '#1e1e1e', expectedRatio: 3.0 },
  { name: 'icon-hover', foreground: '#c5c5c5', background: '#1e1e1e', expectedRatio: 3.0 },
  { name: 'icon-active', foreground: '#ffffff', background: '#1e1e1e', expectedRatio: 3.0 },
  { name: 'icon-disabled', foreground: '#6e6e6e', background: '#1e1e1e', expectedRatio: 3.0 },

  // Text (need ratio >= 4.5:1 for AA)
  { name: 'text-primary', foreground: '#d4d4d4', background: '#1e1e1e', expectedRatio: 4.5 },
  { name: 'text-secondary', foreground: '#a0a0a0', background: '#1e1e1e', expectedRatio: 4.5 },

  // Semantic colors (need ratio >= 4.5:1 for AA on text)
  { name: 'color-primary', foreground: '#4da3e0', background: '#1e1e1e', expectedRatio: 4.5 },
  { name: 'color-success', foreground: '#4ec9b0', background: '#1e1e1e', expectedRatio: 4.5 },
  { name: 'color-warning', foreground: '#dcdcaa', background: '#1e1e1e', expectedRatio: 4.5 },
  { name: 'color-error', foreground: '#f48771', background: '#1e1e1e', expectedRatio: 4.5 },
];

// Old (problematic) color pairs for comparison
const oldThemePairs: ColorPair[] = [
  { name: 'OLD-icon-default', foreground: '#858585', background: '#1e1e1e', expectedRatio: 3.0 },
  { name: 'OLD-icon-disabled', foreground: '#606060', background: '#1e1e1e', expectedRatio: 3.0 },
];

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Dark Theme Contrast Audit Report');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

let allPassed = true;
let totalChecked = 0;
let passed = 0;

function auditPairs(pairs: ColorPair[], label: string): void {
  console.log(`  ${label}`);
  console.log('  ──────────────────────────────────');

  for (const pair of pairs) {
    totalChecked++;
    const ratio = contrastRatio(pair.foreground, pair.background);
    const isPass = ratio >= pair.expectedRatio;
    if (isPass) passed++;

    const status = isPass ? '✅ PASS' : '❌ FAIL';
    const level = isPass
      ? ratio >= 7.0
        ? 'AAA'
        : 'AA'
      : '';

    console.log(
      `  ${status}  ${pair.name.padEnd(20)} ` +
      `ratio: ${ratio.toFixed(2)}:1 (need ≥ ${pair.expectedRatio}:1) ` +
      `${level ? `| ${level}` : ''}`
    );

    if (!isPass) allPassed = false;
  }

  console.log('');
}

auditPairs(darkThemePairs, 'New Dark Theme (Optimized)');
auditPairs(oldThemePairs, 'Old Dark Theme (Before)');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Result: ${passed}/${totalChecked} passed`);
console.log(`  Overall: ${allPassed ? '✅ ALL PASS' : '❌ SOME FAILED'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (!allPassed) {
  process.exit(1);
}
