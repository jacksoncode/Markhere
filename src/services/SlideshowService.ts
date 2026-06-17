// ──── Slideshow Service - 幻灯片演示模式核心逻辑 ────

export interface Slide {
  id: string;
  title: string;
  content: string;
  level: number;
}

export interface SlideshowConfig {
  splitByHeadings: boolean;
  minHeadingLevel: number;
  showNotes: boolean;
}

const DEFAULT_CONFIG: SlideshowConfig = {
  splitByHeadings: true,
  minHeadingLevel: 1,
  showNotes: false,
};

export function parseSlides(content: string, config: SlideshowConfig = DEFAULT_CONFIG): Slide[] {
  const lines = content.split('\n');
  const slides: Slide[] = [];
  let currentSlide: Slide | null = null;
  let slideIndex = 0;

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,6}\s+(.+)$/);
    
    if (headingMatch && config.splitByHeadings) {
      const level = line.match(/^#+/)?.[0]?.length || 1;
      
      if (level <= config.minHeadingLevel) {
        if (currentSlide) {
          slides.push(currentSlide);
        }
        
        currentSlide = {
          id: `slide-${slideIndex++}`,
          title: headingMatch[1].trim(),
          content: line,
          level,
        };
      } else if (currentSlide) {
        currentSlide.content += '\n' + line;
      }
    } else if (currentSlide) {
      currentSlide.content += '\n' + line;
    } else {
      if (!slides.length) {
        slides.push({
          id: `slide-0`,
          title: 'Title Slide',
          content: line,
          level: 0,
        });
        currentSlide = slides[0];
      } else {
        slides[0].content += '\n' + line;
      }
  }
  }

  if (currentSlide) {
    slides.push(currentSlide);
  }

  return slides.length > 0 ? slides : [{
    id: 'slide-0',
    title: 'Empty',
    content: content,
    level: 0,
  }];
}

export function extractNotes(content: string): string {
  const notesMatch = content.match(/<!--\s*notes:\s*(.+?)\s*-->/);
  return notesMatch ? notesMatch[1].trim() : '';
}

export function renderSlideMarkdown(slide: Slide): string {
  return slide.content;
}

export class SlideshowController {
  private slides: Slide[] = [];
  private currentIndex: number = 0;
  private startTime: number = 0;
  private notesVisible: boolean = false;

  constructor(content: string, config?: SlideshowConfig) {
    this.slides = parseSlides(content, config);
  }

  get currentSlide(): Slide | null {
    return this.slides[this.currentIndex] || null;
  }

  get currentIndexValue(): number {
    return this.currentIndex;
  }

  get totalSlides(): number {
    return this.slides.length;
  }

  get elapsedTime(): number {
    return this.startTime > 0 ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
  }

  get isNotesVisible(): boolean {
    return this.notesVisible;
  }

  start(): void {
    this.currentIndex = 0;
    this.startTime = Date.now();
  }

  next(): boolean {
    if (this.currentIndex < this.slides.length - 1) {
      this.currentIndex++;
      return true;
    }
    return false;
  }

  previous(): boolean {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return true;
    }
    return false;
  }

  goTo(index: number): boolean {
    if (index >= 0 && index < this.slides.length) {
      this.currentIndex = index;
      return true;
    }
    return false;
  }

  toggleNotes(): void {
    this.notesVisible = !this.notesVisible;
  }

  stop(): void {
    this.startTime = 0;
  }
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}