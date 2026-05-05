import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WikiLinkInfo {
  source: string;
  target: string;
  display: string;
  position: number;
}

interface WikiLinkState {
  links: WikiLinkInfo[];
  currentPage: string | null;
  
  addLink: (source: string, target: string, display: string, position: number) => void;
  removeLink: (source: string, target: string) => void;
  getBacklinks: (target: string) => WikiLinkInfo[];
  getForwardlinks: (source: string) => WikiLinkInfo[];
  setCurrentPage: (page: string) => void;
  clearLinks: () => void;
  parseLinksFromContent: (content: string, source: string) => WikiLinkInfo[];
}

export const useWikiLinkStore = create<WikiLinkState>()(
  persist(
    (set, get) => ({
      links: [],
      currentPage: null,
      
      addLink: (source, target, display, position) => {
        const existing = get().links.find(
          (l) => l.source === source && l.target === target && l.position === position
        );
        if (existing) return;
        
        set((state) => ({
          links: [...state.links, { source, target, display, position }],
        }));
      },
      
      removeLink: (source, target) => {
        set((state) => ({
          links: state.links.filter(
            (l) => !(l.source === source && l.target === target)
          ),
        }));
      },
      
      getBacklinks: (target) => {
        return get().links.filter((l) => l.target === target);
      },
      
      getForwardlinks: (source) => {
        return get().links.filter((l) => l.source === source);
      },
      
      setCurrentPage: (page) => set({ currentPage: page }),
      
      clearLinks: () => set({ links: [] }),
      
      parseLinksFromContent: (content, source) => {
        const links: WikiLinkInfo[] = [];
        const regex = /\[\[([^\[\]]+)\]\]/g;
        let match;
        
        while ((match = regex.exec(content)) !== null) {
          const target = match[1].split('|')[0].trim();
          const display = match[1].split('|')[1]?.trim() || target;
          const position = match.index;
          
          links.push({ source, target, display, position });
        }
        
        return links;
      },
    }),
    {
      name: 'wiki-links-storage',
      partialize: (state) => ({
        links: state.links.slice(0, 500),
      }),
    }
  )
);