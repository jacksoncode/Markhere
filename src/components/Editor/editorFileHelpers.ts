// File-type helpers shared by the editor's drag-and-drop handling.

export const TEXT_EXTENSIONS = new Set([
  '.txt', '.json', '.csv', '.xml', '.yml', '.yaml', '.toml', '.ini', '.cfg',
  '.conf', '.log', '.html', '.css', '.js', '.ts', '.tsx', '.jsx', '.py', '.rb',
  '.go', '.rs', '.java', '.c', '.cpp', '.h', '.sh', '.bash', '.zsh', '.fish',
  '.sql', '.r', '.m', '.swift', '.kt', '.scala', '.lua', '.php', '.vue',
  '.svelte', '.astro', '.graphql', '.gql', '.prisma', '.env', '.gitignore',
  '.dockerfile', '.cmake',
]);

export const LANG_MAP: Record<string, string> = {
  'js': 'javascript', 'ts': 'typescript', 'jsx': 'javascript',
  'tsx': 'typescript', 'py': 'python', 'rb': 'ruby', 'go': 'go',
  'rs': 'rust', 'java': 'java', 'c': 'c', 'cpp': 'cpp', 'h': 'c',
  'sh': 'bash', 'bash': 'bash', 'zsh': 'bash', 'fish': 'fish',
  'json': 'json', 'xml': 'xml', 'html': 'html', 'css': 'css',
  'yml': 'yaml', 'yaml': 'yaml', 'toml': 'toml', 'sql': 'sql',
  'swift': 'swift', 'kt': 'kotlin', 'scala': 'scala', 'lua': 'lua',
  'php': 'php', 'r': 'r', 'vue': 'vue', 'svelte': 'svelte',
  'md': 'markdown', 'markdown': 'markdown', 'graphql': 'graphql',
  'gql': 'graphql', 'prisma': 'prisma', 'dockerfile': 'dockerfile',
};

export function isTextFile(file: File): boolean {
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
  return TEXT_EXTENSIONS.has(ext) || file.type.startsWith('text/');
}

export function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return LANG_MAP[ext] || 'plaintext';
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function isMarkdownFile(file: File): boolean {
  return file.name.endsWith('.md') || file.name.endsWith('.markdown');
}

/** Generate a URL-friendly slug from heading text, matching the convention
 *  used in ExportService.addHeadingIds so anchor links like
 *  `[text](#heading-name)` resolve consistently. */
export function headingSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\w一-鿿-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
