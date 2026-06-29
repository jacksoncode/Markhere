/**
 * Unit tests for MediaEmbed extension (P1-7)
 */
import { describe, it, expect } from 'vitest';
import { matchMediaUrl } from './MediaEmbed';

describe('MediaEmbed URL matching', () => {
  it('matches YouTube watch URLs', () => {
    const result = matchMediaUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(result).not.toBeNull();
    expect(result!.platform).toBe('youtube');
    expect(result!.embedUrl).toContain('youtube.com/embed/dQw4w9WgXcQ');
  });

  it('matches YouTube short URLs', () => {
    const result = matchMediaUrl('https://youtu.be/dQw4w9WgXcQ');
    expect(result).not.toBeNull();
    expect(result!.platform).toBe('youtube');
  });

  it('matches Vimeo URLs', () => {
    const result = matchMediaUrl('https://vimeo.com/12345678');
    expect(result).not.toBeNull();
    expect(result!.platform).toBe('vimeo');
    expect(result!.embedUrl).toContain('player.vimeo.com/video/12345678');
  });

  it('matches Bilibili BV URLs', () => {
    const result = matchMediaUrl('https://www.bilibili.com/video/BV1GJ411x7h7');
    expect(result).not.toBeNull();
    expect(result!.platform).toBe('bilibili');
    expect(result!.embedUrl).toContain('bilibili.com/player.html?bvid=BV1GJ411x7h7');
  });

  it('matches CodePen URLs', () => {
    const result = matchMediaUrl('https://codepen.io/user/pen/abc123');
    expect(result).not.toBeNull();
    expect(result!.platform).toBe('codepen');
    expect(result!.embedUrl).toContain('codepen.io/user/embed/abc123');
  });

  it('matches CodeSandbox URLs', () => {
    const result = matchMediaUrl('https://codesandbox.io/s/awesome-project');
    expect(result).not.toBeNull();
    expect(result!.platform).toBe('codesandbox');
    expect(result!.embedUrl).toContain('codesandbox.io/embed/awesome-project');
  });

  it('returns null for non-matching URLs', () => {
    expect(matchMediaUrl('https://example.com')).toBeNull();
    expect(matchMediaUrl('https://www.google.com')).toBeNull();
    expect(matchMediaUrl('not a url')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(matchMediaUrl('')).toBeNull();
  });
});
