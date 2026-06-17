export interface MergeOptions {
  separator: string;
  includeTitles: boolean;
  titleFormat: string;
}

export class MergeService {
  mergeDocuments(documents: string[], options: MergeOptions): string {
    const merged = documents.map((doc, index) => {
      let content = doc.trim();
      
      if (options.includeTitles) {
        const title = this.extractTitle(content);
        const formattedTitle = options.titleFormat.replace('{title}', title).replace('{index}', String(index + 1));
        
        if (!content.startsWith('#')) {
          content = `${formattedTitle}\n\n${content}`;
        }
      }
      
      return content;
    });
    
    return merged.join(options.separator);
  }

  extractTitle(content: string): string {
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('# ')) {
        return line.substring(2);
      }
      if (line.startsWith('## ')) {
        return line.substring(3);
      }
    }
    
    const firstLine = lines[0];
    if (firstLine && firstLine.length > 0) {
      return firstLine.substring(0, 50);
    }
    
    return 'Untitled';
  }

  smartMerge(documents: string[]): string {
    const sections: string[] = [];
    
    documents.forEach((doc) => {
      const paragraphs = doc.split('\n\n');
      paragraphs.forEach((p) => {
        if (p.trim()) {
          sections.push(p.trim());
        }
      });
    });
    
    return sections.join('\n\n');
  }

  mergeBySection(documents: string[]): string {
    const allSections: Record<string, string[]> = {};
    
    documents.forEach((doc) => {
      const sections = this.parseSections(doc);
      
      sections.forEach((section) => {
        if (!allSections[section.title]) {
          allSections[section.title] = [];
        }
        allSections[section.title].push(section.content);
      });
    });
    
    const mergedSections = Object.entries(allSections).map(([title, contents]) => {
      return `## ${title}\n\n${contents.join('\n\n')}`;
    });
    
    return mergedSections.join('\n\n');
  }

  parseSections(content: string): { title: string; content: string }[] {
    const sections: { title: string; content: string }[] = [];
    const lines = content.split('\n');
    let currentTitle = '';
    let currentContent: string[] = [];
    
    lines.forEach((line) => {
      if (line.startsWith('## ')) {
        if (currentTitle) {
          sections.push({
            title: currentTitle,
            content: currentContent.join('\n').trim(),
          });
        }
        currentTitle = line.substring(3);
        currentContent = [];
      } else if (line.startsWith('# ')) {
        if (currentTitle) {
          sections.push({
            title: currentTitle,
            content: currentContent.join('\n').trim(),
          });
        }
        currentTitle = line.substring(2);
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    });
    
    if (currentTitle) {
      sections.push({
        title: currentTitle,
        content: currentContent.join('\n').trim(),
      });
    }
    
    return sections;
  }
}