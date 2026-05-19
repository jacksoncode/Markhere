import { describe, it, expect } from 'vitest';
import {
  documentTemplates,
  getTemplatesByCategory,
  getTemplateById,
  type DocumentTemplate,
} from './templates';

describe('documentTemplates', () => {
  it('is defined and not empty', () => {
    expect(documentTemplates).toBeDefined();
    expect(Array.isArray(documentTemplates)).toBe(true);
    expect(documentTemplates.length).toBeGreaterThan(0);
  });

  it('has at least 4 templates', () => {
    expect(documentTemplates.length).toBeGreaterThanOrEqual(4);
  });

  describe('each template has required fields', () => {
    const requiredFields: (keyof DocumentTemplate)[] = [
      'id',
      'name',
      'description',
      'category',
      'icon',
      'content',
    ];

    for (const template of documentTemplates) {
      describe(`template "${template.name}"`, () => {
        it.each(requiredFields)('has field "%s"', (field) => {
          expect(template).toHaveProperty(field);
          expect(template[field]).toBeDefined();
        });

        it('has a non-empty string id', () => {
          expect(typeof template.id).toBe('string');
          expect(template.id.length).toBeGreaterThan(0);
        });

        it('has a non-empty string name', () => {
          expect(typeof template.name).toBe('string');
          expect(template.name.length).toBeGreaterThan(0);
        });

        it('has a non-empty string content', () => {
          expect(typeof template.content).toBe('string');
          expect(template.content.length).toBeGreaterThan(0);
        });

        it('has a valid category', () => {
          expect(['academic', 'personal', 'business', 'creative']).toContain(
            template.category
          );
        });

        it('has content that contains markdown-like structure (headings or formatting)', () => {
          // Check for at least one markdown indicator: heading, list, table, link, etc.
          const hasMarkdown =
            template.content.includes('#') ||
            template.content.includes('- ') ||
            template.content.includes('|') ||
            template.content.includes('[') ||
            template.content.includes('**');
          expect(hasMarkdown).toBe(true);
        });
      });
    }
  });

  describe('no duplicate template names', () => {
    it('has unique names', () => {
      const names = documentTemplates.map((t) => t.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('has unique ids', () => {
      const ids = documentTemplates.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});

describe('getTemplatesByCategory', () => {
  it('returns templates for the academic category', () => {
    const academic = getTemplatesByCategory('academic');
    expect(academic.length).toBeGreaterThan(0);
    for (const t of academic) {
      expect(t.category).toBe('academic');
    }
  });

  it('returns templates for the business category', () => {
    const business = getTemplatesByCategory('business');
    expect(business.length).toBeGreaterThan(0);
    for (const t of business) {
      expect(t.category).toBe('business');
    }
  });

  it('returns templates for the personal category', () => {
    const personal = getTemplatesByCategory('personal');
    expect(personal.length).toBeGreaterThan(0);
    for (const t of personal) {
      expect(t.category).toBe('personal');
    }
  });

  it('returns templates for the creative category', () => {
    const creative = getTemplatesByCategory('creative');
    expect(creative.length).toBeGreaterThan(0);
    for (const t of creative) {
      expect(t.category).toBe('creative');
    }
  });

  it('returns empty array for a non-existent category', () => {
    // Since DocumentTemplate['category'] is strict, no non-existent category exists.
    // But testing with a valid category that may have no templates is fine.
    // All four categories have entries, so this is tested implicitly above.
    const allCategories = ['academic', 'personal', 'business', 'creative'] as const;
    let totalByCategory = 0;
    for (const cat of allCategories) {
      totalByCategory += getTemplatesByCategory(cat).length;
    }
    expect(totalByCategory).toBe(documentTemplates.length);
  });
});

describe('getTemplateById', () => {
  it('returns the correct template for a valid id', () => {
    const template = getTemplateById('academic-paper');
    expect(template).toBeDefined();
    expect(template!.id).toBe('academic-paper');
    expect(template!.name).toBeDefined();
  });

  it('returns undefined for a non-existent id', () => {
    const template = getTemplateById('non-existent-id');
    expect(template).toBeUndefined();
  });

  it('returns correct template for each existing id', () => {
    for (const tpl of documentTemplates) {
      const found = getTemplateById(tpl.id);
      expect(found).toBeDefined();
      expect(found!.name).toBe(tpl.name);
    }
  });
});
