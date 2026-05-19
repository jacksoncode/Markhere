import React, { useState, useEffect, useCallback } from 'react';
import { useEditorState } from '../../store/editorStore';
import { useUIState } from '../../store/uiStore';
import { useTranslation } from '../../i18n';
import { useImageStorageStore } from '../../store/imageStorageStore';
import { ToolbarIcons } from './ToolbarIcons';
import './Toolbar.css';
import './ToolbarIcons.css';

const SHORTCUT_MAP: Record<string, string> = {
  'format.bold': 'Ctrl+B',
  'format.italic': 'Ctrl+I',
  'format.underline': 'Ctrl+U',
  'format.strikethrough': 'Ctrl+Shift+X',
  'format.highlight': 'Ctrl+Shift+H',
  'format.inlineCode': 'Ctrl+E',
  'format.link': 'Ctrl+K',
  'format.image': 'Ctrl+Shift+I',
  'paragraph.table': 'Ctrl+Shift+T',
  'paragraph.heading1': 'Ctrl+Shift+1',
  'paragraph.heading2': 'Ctrl+Shift+2',
  'paragraph.heading3': 'Ctrl+Shift+3',
  'paragraph.bulletList': 'Ctrl+Shift+8',
  'paragraph.orderedList': 'Ctrl+Shift+9',
  'paragraph.taskList': 'Ctrl+Shift+L',
  'paragraph.quoteBlock': 'Ctrl+Shift+Q',
  'paragraph.codeBlock': 'Ctrl+Shift+C',
};

/** Items always visible on mobile (first 5 essential buttons). */
const MOBILE_ESSENTIAL_INDICES = new Set([0, 1, 9, 12, 13]); // Bold, Italic, Heading1, BulletList, NumberList

export function Toolbar() {
  const { t } = useTranslation();
  const { editorInstance } = useEditorState();
  const { toggleFocusMode, toggleTypewriterMode } = useUIState();
  const [isMobile, setIsMobile] = useState(false);
  const [showMore, setShowMore] = useState(false);

  /* ── Detect mobile via matchMedia ── */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /* ── Close bottom sheet on Escape ── */
  useEffect(() => {
    if (!showMore) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMore(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showMore]);

  /* ── Lock body scroll when bottom sheet open ── */
  useEffect(() => {
    document.body.style.overflow = showMore ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMore]);

  const handleBackdropClick = useCallback(() => {
    setShowMore(false);
  }, []);

  const handleMoreClick = useCallback(() => {
    setShowMore((prev) => !prev);
  }, []);

  if (!editorInstance) return null;

  const handleButtonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  const items = [
    {
      icon: ToolbarIcons.Bold,
      label: t('format.bold'),
      action: () => editorInstance.chain().focus().toggleBold().run(),
      active: editorInstance.isActive('bold')
    },
    {
      icon: ToolbarIcons.Italic,
      label: t('format.italic'),
      action: () => editorInstance.chain().focus().toggleItalic().run(),
      active: editorInstance.isActive('italic')
    },
    {
      icon: ToolbarIcons.Underline,
      label: t('format.underline'),
      action: () => editorInstance.chain().focus().toggleUnderline().run(),
      active: editorInstance.isActive('underline')
    },
    {
      icon: ToolbarIcons.Strikethrough,
      label: t('format.strikethrough'),
      action: () => editorInstance.chain().focus().toggleStrike().run(),
      active: editorInstance.isActive('strike')
    },
    {
      icon: ToolbarIcons.Highlight,
      label: t('format.highlight'),
      action: () => editorInstance.chain().focus().toggleHighlight().run(),
      active: editorInstance.isActive('highlight')
    },
    {
      icon: ToolbarIcons.Code,
      label: t('format.inlineCode'),
      action: () => editorInstance.chain().focus().toggleCode().run(),
      active: editorInstance.isActive('code')
    },
    {
      icon: ToolbarIcons.Link,
      label: t('format.link'),
      action: () => editorInstance.chain().focus().toggleLink({ href: '' }).run(),
      active: editorInstance.isActive('link')
    },
    {
      icon: ToolbarIcons.Image,
      label: t('format.image'),
      action: async () => {
        try {
          const { open } = await import('@tauri-apps/plugin-dialog');
          const selected = await open({
            filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'] }],
            multiple: false,
          });
          if (selected && typeof selected === 'string') {
            const { readFile } = await import('@tauri-apps/plugin-fs');
            const contents = await readFile(selected);
            const bytes = new Uint8Array(contents);
            const chunks: string[] = [];
            const chunkSize = 0x8000;
            for (let i = 0; i < bytes.length; i += chunkSize) {
              const chunk = bytes.subarray(i, i + chunkSize);
              chunks.push(String.fromCharCode(...Array.from(chunk)));
            }
            const base64 = btoa(chunks.join(''));

            // Try uploading to an active external hosting provider first
            try {
              const filename = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
              const imageBlob = new Blob([bytes], { type: 'image/png' });
              const imageFile = new File([imageBlob], filename, { type: 'image/png' });
              const { uploadImage } = useImageStorageStore.getState();
              const uploadedUrl = await uploadImage(imageFile);
              if (uploadedUrl) {
                editorInstance.chain().focus().setImage({ src: uploadedUrl }).run();
                return;
              }
            } catch {
              // Upload failed, fall through to local save
            }

            const filename = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
            try {
              const { invoke } = await import('@tauri-apps/api/core');
              const savedPath = await invoke<string>('save_image', {
                imageData: `data:image/png;base64,${base64}`,
                filename,
              });
              editorInstance.chain().focus().setImage({ src: savedPath }).run();
            } catch {
              // Fallback: use original file path directly
              editorInstance.chain().focus().setImage({ src: selected }).run();
            }
          }
        } catch {
          // Tauri APIs not available (e.g., running in browser) – silently ignore
        }
      },
      active: editorInstance.isActive('resizableImage')
    },
    {
      icon: ToolbarIcons.Table,
      label: t('paragraph.table'),
      action: () => editorInstance.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      active: editorInstance.isActive('table')
    },
    {
      icon: ToolbarIcons.Heading1,
      label: t('paragraph.heading1'),
      action: () => editorInstance.chain().focus().toggleHeading({ level: 1 }).run(),
      active: editorInstance.isActive('heading', { level: 1 })
    },
    {
      icon: ToolbarIcons.Heading2,
      label: t('paragraph.heading2'),
      action: () => editorInstance.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editorInstance.isActive('heading', { level: 2 })
    },
    {
      icon: ToolbarIcons.Heading3,
      label: t('paragraph.heading3'),
      action: () => editorInstance.chain().focus().toggleHeading({ level: 3 }).run(),
      active: editorInstance.isActive('heading', { level: 3 })
    },
    {
      icon: ToolbarIcons.BulletList,
      label: t('paragraph.bulletList'),
      action: () => editorInstance.chain().focus().toggleBulletList().run(),
      active: editorInstance.isActive('bulletList')
    },
    {
      icon: ToolbarIcons.NumberList,
      label: t('paragraph.orderedList'),
      action: () => editorInstance.chain().focus().toggleOrderedList().run(),
      active: editorInstance.isActive('orderedList')
    },
    {
      icon: ToolbarIcons.TaskList,
      label: t('paragraph.taskList'),
      action: () => editorInstance.chain().focus().toggleTaskList().run(),
      active: editorInstance.isActive('taskList')
    },
    {
      icon: ToolbarIcons.Quote,
      label: t('paragraph.quoteBlock'),
      action: () => editorInstance.chain().focus().toggleBlockquote().run(),
      active: editorInstance.isActive('blockquote')
    },
    {
      icon: ToolbarIcons.CodeBlock,
      label: t('paragraph.codeBlock'),
      action: () => editorInstance.chain().focus().toggleCodeBlock().run(),
      active: editorInstance.isActive('codeBlock')
    },
  ];

  const FocusModeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
    </svg>
  );

  const TypewriterModeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
    </svg>
  );

  const focusModeItem = {
    icon: FocusModeIcon,
    label: t('view.focusMode'),
    action: toggleFocusMode,
    active: false,
  };

  const typewriterModeItem = {
    icon: TypewriterModeIcon,
    label: t('view.typewriterMode'),
    action: toggleTypewriterMode,
    active: false,
  };

  const allItems = [...items, focusModeItem, typewriterModeItem];

  return (
    <>
      <div className="toolbar auto-hide-ui" role="toolbar" aria-label={t('toolbar.label') || 'Formatting toolbar'}>
        <div className="toolbar-group">
          {items.slice(0, 6).map((item, index) => (
            <button
              key={item.label}
              className={`toolbar-btn toolbar-btn-with-label ${item.active ? 'active' : ''}`}
              onClick={item.action}
              onKeyDown={(e) => handleButtonKeyDown(e, item.action)}
              title={item.label}
              aria-label={SHORTCUT_MAP[item.label] ? `${item.label} (${SHORTCUT_MAP[item.label]})` : item.label}
              aria-pressed={item.active}
              tabIndex={0}
              data-responsive={isMobile && !MOBILE_ESSENTIAL_INDICES.has(index) ? 'hide-on-mobile' : 'show-on-mobile'}
            >
              <item.icon className="toolbar-icon" aria-hidden="true" />
              <span className="toolbar-btn-label">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          {items.slice(6, 9).map((item, index) => (
            <button
              key={item.label}
              className={`toolbar-btn toolbar-btn-with-label ${item.active ? 'active' : ''}`}
              onClick={item.action}
              onKeyDown={(e) => handleButtonKeyDown(e, item.action)}
              title={item.label}
              aria-label={SHORTCUT_MAP[item.label] ? `${item.label} (${SHORTCUT_MAP[item.label]})` : item.label}
              aria-pressed={item.active}
              tabIndex={0}
              data-responsive={isMobile && !MOBILE_ESSENTIAL_INDICES.has(index + 6) ? 'hide-on-mobile' : 'show-on-mobile'}
            >
              <item.icon className="toolbar-icon" aria-hidden="true" />
              <span className="toolbar-btn-label">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          {items.slice(9).map((item, index) => (
            <button
              key={item.label}
              className={`toolbar-btn toolbar-btn-with-label ${item.active ? 'active' : ''}`}
              onClick={item.action}
              onKeyDown={(e) => handleButtonKeyDown(e, item.action)}
              title={item.label}
              aria-label={SHORTCUT_MAP[item.label] ? `${item.label} (${SHORTCUT_MAP[item.label]})` : item.label}
              aria-pressed={item.active}
              tabIndex={0}
              data-responsive={isMobile && !MOBILE_ESSENTIAL_INDICES.has(index + 9) ? 'hide-on-mobile' : 'show-on-mobile'}
            >
              <item.icon className="toolbar-icon" aria-hidden="true" />
              <span className="toolbar-btn-label">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button
            className="toolbar-btn toolbar-btn-with-label"
            onClick={toggleFocusMode}
            onKeyDown={(e) => handleButtonKeyDown(e, toggleFocusMode)}
            title={t('view.focusMode')}
            aria-label={t('view.focusMode')}
            tabIndex={0}
            data-responsive={isMobile ? 'hide-on-mobile' : 'show-on-mobile'}
          >
            <svg className="toolbar-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
            </svg>
            <span className="toolbar-btn-label">{t('view.focusMode')}</span>
          </button>
          <button
            className="toolbar-btn toolbar-btn-with-label"
            onClick={toggleTypewriterMode}
            onKeyDown={(e) => handleButtonKeyDown(e, toggleTypewriterMode)}
            title={t('view.typewriterMode')}
            aria-label={t('view.typewriterMode')}
            tabIndex={0}
            data-responsive={isMobile ? 'hide-on-mobile' : 'show-on-mobile'}
          >
            <svg className="toolbar-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
            <span className="toolbar-btn-label">{t('view.typewriterMode')}</span>
          </button>
        </div>

        {/* ── "More" button on mobile ── */}
        {isMobile && (
          <button
            className="toolbar-more-btn"
            onClick={handleMoreClick}
            title={t('toolbar.more') ?? 'More'}
            type="button"
            aria-label={showMore ? 'Close more tools' : 'More tools'}
          >
            ⋯
          </button>
        )}
      </div>

      {/* ── Bottom sheet with full toolbar (mobile only) ── */}
      <div
        className={`toolbar-bottom-sheet-backdrop${showMore ? ' open' : ''}`}
        onClick={handleBackdropClick}
      />
      <div className={`toolbar-bottom-sheet${showMore ? ' open' : ''}`}>
        <div className="toolbar-bottom-sheet-handle" />
        <div className="toolbar-bottom-sheet-title">
          {t('toolbar.moreTools') ?? 'More Tools'}
        </div>
        <div className="toolbar-bottom-sheet-grid">
          {allItems.map((item) => (
            <button
              key={item.label}
              className={`toolbar-bottom-sheet-item${item.active ? ' active' : ''}`}
              onClick={() => {
                item.action();
                setShowMore(false);
              }}
              type="button"
            >
              <item.icon className="toolbar-icon" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
