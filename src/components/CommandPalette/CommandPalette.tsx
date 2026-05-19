import { useState, useEffect, useRef, useMemo } from 'react';
import './CommandPalette.css';

interface Command {
  id: string;
  name: string;
  category: string;
  shortcut?: string;
  action: () => void;
  icon?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
}

export function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const resultCountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const filteredCommands = useMemo(() => {
    if (!search.trim()) return commands;
    
    const searchLower = search.toLowerCase();
    return commands.filter((cmd) => {
      return cmd.name.toLowerCase().includes(searchLower) ||
             cmd.category.toLowerCase().includes(searchLower) ||
             cmd.id.toLowerCase().includes(searchLower);
    });
  }, [search, commands]);

  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => 
        prev < filteredCommands.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => prev > 0 ? prev - 1 : prev);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleCommandClick = (command: Command) => {
    command.action();
    onClose();
  };

  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector('.command-item.selected');
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const flatIndexToCommand = filteredCommands;
  let currentIndex = 0;

  return (
    <div className="command-palette-overlay" onClick={onClose} aria-label="Close command palette">
      <div
        className="command-palette-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="command-palette-input-wrapper">
          <span className="search-icon" aria-hidden="true">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands..."
            className="command-palette-input"
            aria-label="Search commands"
            role="combobox"
            aria-expanded={filteredCommands.length > 0}
            aria-controls="command-palette-listbox"
            aria-activedescendant={filteredCommands[selectedIndex] ? `command-option-${filteredCommands[selectedIndex].id}` : undefined}
            aria-autocomplete="list"
          />
          <span className="shortcut-hint">ESC to close</span>
        </div>

        <div
          id="command-palette-listbox"
          className="command-palette-list"
          ref={listRef}
          role="listbox"
          aria-label="Command results"
        >
          {filteredCommands.length === 0 ? (
            <div className="no-results" role="option" aria-selected="false">No commands found</div>
          ) : (
            Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category} className="command-group" role="group" aria-label={category}>
                <div className="command-group-header">{category}</div>
                {cmds.map((cmd) => {
                  const isSelected = flatIndexToCommand[selectedIndex]?.id === cmd.id;
                  currentIndex++;
                  return (
                    <div
                      key={cmd.id}
                      id={`command-option-${cmd.id}`}
                      className={`command-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleCommandClick(cmd)}
                      onMouseEnter={() => setSelectedIndex(flatIndexToCommand.findIndex(c => c.id === cmd.id))}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="command-content">
                        {cmd.icon && <span className="command-icon" aria-hidden="true">{cmd.icon}</span>}
                        <span className="command-name">{cmd.name}</span>
                        {cmd.shortcut && (
                          <span className="command-shortcut" aria-label={`Shortcut: ${cmd.shortcut}`}>{cmd.shortcut}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div
          ref={resultCountRef}
          className="command-palette-footer"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="footer-hint">
            <span>↑↓ Navigate</span>
            <span>↵ Execute</span>
            <span>ESC Close</span>
          </div>
          <span className="sr-only">
            {filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''} found
          </span>
        </div>
      </div>
    </div>
  );
}

export function useCommands(
  editorCommands: () => void,
  fileCommands: () => void,
  viewCommands: () => void,
  formatCommands: () => void
): Command[] {
  return useMemo(() => [
    // File Commands
    { id: 'file.new', name: 'New Document', category: 'File', shortcut: '⌘N', action: fileCommands, icon: '📄' },
    { id: 'file.open', name: 'Open File...', category: 'File', shortcut: '⌘O', action: fileCommands, icon: '📂' },
    { id: 'file.save', name: 'Save', category: 'File', shortcut: '⌘S', action: fileCommands, icon: '💾' },
    { id: 'file.save-as', name: 'Save As...', category: 'File', shortcut: '⌘⇧S', action: fileCommands, icon: '💾' },
    
    // Edit Commands
    { id: 'edit.undo', name: 'Undo', category: 'Edit', shortcut: '⌘Z', action: editorCommands, icon: '↩️' },
    { id: 'edit.redo', name: 'Redo', category: 'Edit', shortcut: '⌘⇧Z', action: editorCommands, icon: '↪️' },
    { id: 'edit.cut', name: 'Cut', category: 'Edit', shortcut: '⌘X', action: editorCommands, icon: '✂️' },
    { id: 'edit.copy', name: 'Copy', category: 'Edit', shortcut: '⌘C', action: editorCommands, icon: '📋' },
    { id: 'edit.paste', name: 'Paste', category: 'Edit', shortcut: '⌘V', action: editorCommands, icon: '📌' },
    
    // Format Commands
    { id: 'format.bold', name: 'Bold', category: 'Format', shortcut: '⌘B', action: formatCommands, icon: 'B' },
    { id: 'format.italic', name: 'Italic', category: 'Format', shortcut: '⌘I', action: formatCommands, icon: 'I' },
    { id: 'format.underline', name: 'Underline', category: 'Format', shortcut: '⌘U', action: formatCommands, icon: 'U' },
    { id: 'format.strikethrough', name: 'Strikethrough', category: 'Format', shortcut: '⌘⇧X', action: formatCommands, icon: 'S' },
    { id: 'format.code', name: 'Code', category: 'Format', shortcut: '⌘E', action: formatCommands, icon: '`' },
    { id: 'format.link', name: 'Link', category: 'Format', shortcut: '⌘K', action: formatCommands, icon: '🔗' },
    { id: 'format.heading-1', name: 'Heading 1', category: 'Format', shortcut: '⌘1', action: formatCommands, icon: 'H1' },
    { id: 'format.heading-2', name: 'Heading 2', category: 'Format', shortcut: '⌘2', action: formatCommands, icon: 'H2' },
    { id: 'format.heading-3', name: 'Heading 3', category: 'Format', shortcut: '⌘3', action: formatCommands, icon: 'H3' },
    { id: 'format.bullet-list', name: 'Bullet List', category: 'Format', shortcut: '⌘⇧8', action: formatCommands, icon: '•' },
    { id: 'format.numbered-list', name: 'Numbered List', category: 'Format', shortcut: '⌘⇧9', action: formatCommands, icon: '1.' },
    { id: 'format.quote', name: 'Quote', category: 'Format', shortcut: '⌘⇧Q', action: formatCommands, icon: '>' },
    { id: 'format.horizontal-rule', name: 'Horizontal Rule', category: 'Format', shortcut: '⌘⇧H', action: formatCommands, icon: '---' },
    
    // Insert Commands
    { id: 'insert.image', name: 'Insert Image', category: 'Insert', action: editorCommands, icon: '🖼️' },
    { id: 'insert.table', name: 'Insert Table', category: 'Insert', action: editorCommands, icon: '📊' },
    { id: 'insert.code-block', name: 'Insert Code Block', category: 'Insert', action: editorCommands, icon: '💻' },
    { id: 'insert.task-list', name: 'Insert Task List', category: 'Insert', action: editorCommands, icon: '✅' },
    
    // View Commands
    { id: 'view.toggle-sidebar', name: 'Toggle Sidebar', category: 'View', shortcut: '⌘\\', action: viewCommands, icon: '☰' },
    { id: 'view.focus-mode', name: 'Focus Mode', category: 'View', shortcut: '⌘⇧F', action: viewCommands, icon: '🎯' },
    { id: 'view.typewriter-mode', name: 'Typewriter Mode', category: 'View', shortcut: '⌘⇧T', action: viewCommands, icon: '⌨️' },
    { id: 'view.source-mode', name: 'Source Mode', category: 'View', shortcut: '⌘/', action: viewCommands, icon: '📝' },
    { id: 'view.dark-mode', name: 'Toggle Dark Mode', category: 'View', action: viewCommands, icon: '🌙' },
    
    // Tools Commands
    { id: 'tools.find', name: 'Find...', category: 'Tools', shortcut: '⌘F', action: viewCommands, icon: '🔍' },
    { id: 'tools.replace', name: 'Find and Replace...', category: 'Tools', shortcut: '⌘⇧F', action: viewCommands, icon: '🔄' },
    { id: 'tools.word-count', name: 'Word Count', category: 'Tools', action: viewCommands, icon: '📊' },
    { id: 'tools.spell-check', name: 'Spell Check', category: 'Tools', action: viewCommands, icon: '✓' },
    { id: 'tools.export-pdf', name: 'Export PDF', category: 'Tools', action: fileCommands, icon: '📄' },
    { id: 'tools.export-word', name: 'Export Word', category: 'Tools', action: fileCommands, icon: '📝' },
    { id: 'tools.export-html', name: 'Export HTML', category: 'Tools', action: fileCommands, icon: '🌐' },
    
    // Help Commands
    { id: 'help.shortcuts', name: 'Keyboard Shortcuts', category: 'Help', shortcut: '⌘⇧K', action: viewCommands, icon: '⌨️' },
    { id: 'help.guide', name: 'User Guide', category: 'Help', action: viewCommands, icon: '📖' },
    { id: 'help.about', name: 'About Markhere', category: 'Help', action: viewCommands, icon: 'ℹ️' },
  ], [editorCommands, fileCommands, viewCommands, formatCommands]);
}