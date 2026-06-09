import { describe, it, expect } from 'vitest';
import { expandTemplateVariables } from './TemplateVariables';

describe('TemplateVariables', () => {
  it('replaces {{date}} with today YYYY-MM-DD', () => {
    const result = expandTemplateVariables('Created: {{date}}');
    expect(result).toMatch(/Created: \d{4}-\d{2}-\d{2}/);
    expect(result).not.toContain('{{date}}');
  });

  it('replaces {{year}} with current year', () => {
    const year = String(new Date().getFullYear());
    expect(expandTemplateVariables('Year: {{year}}')).toBe(`Year: ${year}`);
  });

  it('replaces {{title}} from heading', () => {
    expect(expandTemplateVariables('# My Title\n\n{{title}}')).toContain('My Title');
  });

  it('handles multiple variables', () => {
    const r = expandTemplateVariables('{{date}}\n{{time}}');
    expect(r).not.toContain('{{');
  });
});
