// ──── Cover Service - 文档封面与图标管理 ────

import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

export interface CoverMetadata {
  coverImage?: string;     // 封面图片路径
  icon?: string;           // 文档图标 (emoji 或图片路径)
  title?: string;          // 封面标题
  subtitle?: string;       // 副标题
  author?: string;         // 作者
  date?: string;           // 日期
  backgroundColor?: string; // 背景颜色
}

const COVER_FRONTMATTER_KEY = 'cover';

/**
 * 从 Markdown frontmatter 解析封面元数据
 */
export function parseCoverFromFrontmatter(frontmatter: Record<string, unknown>): CoverMetadata {
  const cover = frontmatter[COVER_FRONTMATTER_KEY];
  if (!cover || typeof cover !== 'object') {
    return {};
  }
  
  return {
    coverImage: (cover as Record<string, unknown>).coverImage as string | undefined,
    icon: (cover as Record<string, unknown>).icon as string | undefined,
    title: (cover as Record<string, unknown>).title as string | undefined,
    subtitle: (cover as Record<string, unknown>).subtitle as string | undefined,
    author: (cover as Record<string, unknown>).author as string | undefined,
    date: (cover as Record<string, unknown>).date as string | undefined,
    backgroundColor: (cover as Record<string, unknown>).backgroundColor as string | undefined,
  };
}

/**
 * 将封面元数据序列化为 frontmatter 格式
 */
export function serializeCoverToFrontmatter(cover: CoverMetadata): Record<string, unknown> {
  if (!Object.keys(cover).length) {
    return {};
  }
  
  return { [COVER_FRONTMATTER_KEY]: cover };
}

/**
 * 选择封面图片
 */
export async function selectCoverImage(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    filters: [
      { name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }
    ],
  });

  if (!selected) return null;
  
  // 复制图片到应用数据目录
  try {
    const copiedPath = await invoke<string>('copy_image_to_assets', {
      sourcePath: selected,
      category: 'covers',
    });
    return copiedPath;
  } catch {
    // 如果复制失败，返回原路径（适用于本地文件）
    return selected;
  }
}

/**
 * 验证图片路径是否有效
 */
export async function validateImagePath(path: string): Promise<boolean> {
  try {
    await invoke('validate_file_exists', { path });
    return true;
  } catch {
    return false;
  }
}

/**
 * 预置封面模板
 */
export const COVER_TEMPLATES: Array<{
  id: string;
  name: string;
  icon: string;
  preset: CoverMetadata;
}> = [
  {
    id: 'simple',
    name: '简约',
    icon: '📄',
    preset: { backgroundColor: '#ffffff' },
  },
  {
    id: 'academic',
    name: '学术',
    icon: '🎓',
    preset: { backgroundColor: '#f5f5f5', icon: '🎓' },
  },
  {
    id: 'creative',
    name: '创意',
    icon: '🎨',
    preset: { backgroundColor: '#e8f4f8', icon: '🎨' },
  },
  {
    id: 'technical',
    name: '技术',
    icon: '⚡',
    preset: { backgroundColor: '#1e1e1e', icon: '⚡' },
  },
  {
    id: 'nature',
    name: '自然',
    icon: '🌿',
    preset: { backgroundColor: '#c8e6c9', icon: '🌿' },
  },
];

/**
 * 生成封面 HTML (用于导出)
 */
export function generateCoverHTML(metadata: CoverMetadata): string {
  if (!metadata.coverImage && !metadata.title && !metadata.icon) {
    return '';
  }

  const bgStyle = metadata.backgroundColor 
    ? `background-color: ${metadata.backgroundColor};`
    : '';

  const coverImageHTML = metadata.coverImage
    ? `<img src="${metadata.coverImage}" alt="Cover" class="cover-image" style="width: 100%; max-height: 400px; object-fit: cover;" />`
    : '';

  const iconHTML = metadata.icon
    ? `<div class="cover-icon" style="font-size: 48px; margin-bottom: 16px;">${metadata.icon}</div>`
    : '';

  const titleHTML = metadata.title
    ? `<h1 class="cover-title" style="font-size: 32px; margin: 16px 0; font-weight: bold;">${metadata.title}</h1>`
    : '';

  const subtitleHTML = metadata.subtitle
    ? `<p class="cover-subtitle" style="font-size: 18px; color: #666; margin: 8px 0;">${metadata.subtitle}</p>`
    : '';

  const authorHTML = metadata.author
    ? `<p class="cover-author" style="font-size: 14px; color: #888; margin-top: 24px;">作者: ${metadata.author}</p>`
    : '';

  const dateHTML = metadata.date
    ? `<p class="cover-date" style="font-size: 12px; color: #999;">${metadata.date}</p>`
    : '';

  return `
<div class="document-cover" style="${bgStyle} padding: 40px; text-align: center; margin-bottom: 40px; border-bottom: 1px solid #ddd;">
  ${coverImageHTML}
  ${iconHTML}
  ${titleHTML}
  ${subtitleHTML}
  ${authorHTML}
  ${dateHTML}
</div>
`;
}

/**
 * 常用图标列表
 */
export const COMMON_ICONS = [
  '📄', '📝', '📚', '📖', '📰', '📋',
  '🎓', '💡', '🔬', '📊', '📈', '📉',
  '🎨', '🎬', '🎵', '📸', '🖼️', '🎯',
  '⚡', '🔧', '🛠️', '⚙️', '🚀', '💻',
  '📱', '🌐', '🌍', '🏠', '🏢', '🏛️',
  '🌿', '🌸', '☀️', '🌙', '⭐', '💎',
  '❤️', '🔥', '✨', '🎉', '🎁', '🏆',
];