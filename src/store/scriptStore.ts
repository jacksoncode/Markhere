import { create } from 'zustand';

export interface Script {
  name: string;
  path: string;
  args: string[];
}

interface ScriptState {
  scripts: Script[];
  addScript: (script: Script) => void;
  removeScript: (name: string) => void;
  executeScript: (name: string) => Promise<string>;
}

export const useScriptStore = create<ScriptState>((set, get) => ({
  scripts: JSON.parse(localStorage.getItem('markhere-scripts') || '[]'),
  
  addScript: (script: Script) => {
    set((state: ScriptState) => {
      const scripts = [...state.scripts, script];
      localStorage.setItem('markhere-scripts', JSON.stringify(scripts));
      return { scripts };
    });
  },
  
  removeScript: (name: string) => {
    set((state: ScriptState) => {
      const scripts = state.scripts.filter((s: Script) => s.name !== name);
      localStorage.setItem('markhere-scripts', JSON.stringify(scripts));
      return { scripts };
    });
  },
  
  executeScript: async (name: string) => {
    const script = get().scripts.find((s: Script) => s.name === name);
    if (!script) throw new Error('Script not found');
    
    const invoke = (window as any).__TAURI__?.invoke;
    if (!invoke) throw new Error('Tauri not available');
    
    const result = await invoke('run_script', {
      scriptPath: script.path,
      args: script.args,
    }) as string;
    
    return result;
  },
}));