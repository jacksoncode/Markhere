import { useState, useCallback, useEffect, useRef } from 'react';
import './MobileMenu.css';

interface RadialAction {
  id: string;
  icon: string;
  label: string;
  action: () => void;
}

interface MobileMenuProps {
  onNewFile?: () => void;
  onOpenFile?: () => void;
  onSave?: () => void;
  onSearch?: () => void;
  onSettings?: () => void;
  onToggleSidebar?: () => void;
}

const RADIAL_ICONS: Record<string, string> = {
  newFile:
    'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  openFile:
    'M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z',
  save:
    'M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z',
  search:
    'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C10.01 14 12 12.01 12 9.5S10.01 5 7.5 5 3 6.99 3 9.5 4.99 14 7.5 14z',
  settings:
    'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81a.484.484 0 00-.41-.3h-3.98c-.19 0-.36.11-.43.27L9.24 5.38c-.58.23-1.12.54-1.62.94L5.23 5.35a.47.47 0 00-.59.22L2.72 8.89c-.13.2-.08.46.12.61L4.87 11.08c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.23.37.32.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.34 2.54c.06.18.23.3.42.3h3.98c.18 0 .36-.12.42-.3l.34-2.55c.6-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47.01.59-.22l1.92-3.32c.12-.23.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  toggleSidebar:
    'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
};

export function MobileMenu({
  onNewFile,
  onOpenFile,
  onSave,
  onSearch,
  onSettings,
  onToggleSidebar,
}: MobileMenuProps) {
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const closeAll = useCallback(() => {
    setIsFabOpen(false);
    setIsSheetOpen(false);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isFabOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        closeAll();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll();
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFabOpen, closeAll]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (isSheetOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSheetOpen]);

  const handleFabClick = () => {
    if (isSheetOpen) {
      closeAll();
      return;
    }
    setIsFabOpen((prev) => !prev);
  };

  const handleRadialAction = (action: (() => void) | undefined) => {
    closeAll();
    action?.();
  };

  const radialActions: RadialAction[] = [
    {
      id: 'newFile',
      icon: RADIAL_ICONS.newFile,
      label: '新建',
      action: () => handleRadialAction(onNewFile),
    },
    {
      id: 'openFile',
      icon: RADIAL_ICONS.openFile,
      label: '打开',
      action: () => handleRadialAction(onOpenFile),
    },
    {
      id: 'save',
      icon: RADIAL_ICONS.save,
      label: '保存',
      action: () => handleRadialAction(onSave),
    },
    {
      id: 'search',
      icon: RADIAL_ICONS.search,
      label: '搜索',
      action: () => handleRadialAction(onSearch),
    },
    {
      id: 'settings',
      icon: RADIAL_ICONS.settings,
      label: '设置',
      action: () => handleRadialAction(onSettings),
    },
  ];

  const handleSheetAction = (id: string) => {
    const action = radialActions.find((a) => a.id === id);
    if (action) {
      closeAll();
      action.action();
    }
  };

  return (
    <div className="mobile-menu" ref={fabRef}>
      {/* ── Bottom sheet with menu items ── */}
      <div
        className={`mobile-sheet-backdrop${isSheetOpen ? ' open' : ''}`}
        onClick={closeAll}
      />
      <div
        ref={sheetRef}
        className={`mobile-sheet${isSheetOpen ? ' open' : ''}`}
      >
        <div className="mobile-sheet-handle" />
        <div className="mobile-sheet-title">菜单</div>
        <div className="mobile-sheet-grid">
          {radialActions.map((item) => (
            <button
              key={item.id}
              className="mobile-sheet-item"
              onClick={() => handleSheetAction(item.id)}
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d={item.icon} />
              </svg>
              <span>{item.label}</span>
            </button>
          ))}
          {onToggleSidebar && (
            <button
              className="mobile-sheet-item"
              onClick={() => {
                closeAll();
                onToggleSidebar();
              }}
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d={RADIAL_ICONS.toggleSidebar} />
              </svg>
              <span>侧栏</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Floating Action Button (FAB) ── */}
      <button
        className={`mobile-fab${isFabOpen ? ' open' : ''}`}
        onClick={handleFabClick}
        aria-label={isFabOpen ? '关闭菜单' : '打开菜单'}
        type="button"
      >
        <svg
          className="mobile-fab-icon mobile-fab-icon-plus"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
      </button>

      {/* ── Radial menu items ── */}
      <div className={`mobile-radial-menu${isFabOpen ? ' open' : ''}`}>
        {radialActions.map((item, index) => {
          const total = radialActions.length;
          const angle = (index / total) * Math.PI - Math.PI / 2 - ((total - 1) / total) * (Math.PI / 2);
          const radius = 110;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <button
              key={item.id}
              className="mobile-radial-item"
              style={{
                '--radial-x': `${x}px`,
                '--radial-y': `${y}px`,
                '--radial-delay': `${index * 0.04}s`,
              } as React.CSSProperties}
              onClick={() => handleRadialAction(item.action)}
              aria-label={item.label}
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d={item.icon} />
              </svg>
              <span className="mobile-radial-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
