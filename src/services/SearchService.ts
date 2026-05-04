export interface SearchResult {
  from: number;
  to: number;
  text: string;
}

export class SearchService {
  static findInDocument(content: string, query: string): SearchResult[] {
    if (!query.trim()) return [];

    const results: SearchResult[] = [];
    const regex = new RegExp(query, 'gi');
    let match;

    while ((match = regex.exec(content)) !== null) {
      results.push({
        from: match.index,
        to: match.index + match[0].length,
        text: match[0],
      });
    }

    return results;
  }

  static highlightMatches(content: string, query: string): string {
    if (!query.trim()) return content;

    const regex = new RegExp(`(${query})`, 'gi');
    return content.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  static replaceInDocument(content: string, query: string, replacement: string): string {
    if (!query.trim()) return content;

    const regex = new RegExp(query, 'gi');
    return content.replace(regex, replacement);
  }

  static countMatches(content: string, query: string): number {
    if (!query.trim()) return 0;

    const regex = new RegExp(query, 'gi');
    const matches = content.match(regex);
    return matches ? matches.length : 0;
  }
}