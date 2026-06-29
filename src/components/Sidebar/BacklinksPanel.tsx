import { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { BacklinkService, type LinkReference } from '../../services/BacklinkService';
import { useFileStore } from '../../store/fileStore';
import { useEditorState } from '../../store/editorStore';
import { useTabsStore } from '../../store/tabsStore';
import { useTranslation } from '../../i18n';

/**
 * Shows backlinks (notes linking to the current file) and outlinks (notes the
 * current file links to), resolved across the open workspace folder. Clicking
 * a reference opens that note.
 */
export function BacklinksPanel() {
  const { t } = useTranslation();
  const { currentPath, setCurrentPath, setSavedContent } = useFileStore();
  const { editorInstance } = useEditorState();

  const [backlinks, setBacklinks] = useState<LinkReference[]>([]);
  const [outlinks, setOutlinks] = useState<LinkReference[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!currentPath) {
      setBacklinks([]);
      setOutlinks([]);
      return;
    }
    const dir =
      localStorage.getItem('markhere-browse-path') ||
      currentPath.replace(/[/\\][^/\\]*$/, '');
    setLoading(true);
    try {
      await BacklinkService.buildIndex(dir);
      setBacklinks(BacklinkService.getBacklinks(currentPath));
      setOutlinks(BacklinkService.getOutlinks(currentPath));
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openNote = useCallback(
    async (path: string) => {
      try {
        const content = await invoke<string>('read_file', { path });
        const fileName = path.split(/[/\\]/).pop() || 'Untitled';
        useTabsStore.getState().openTab(path, fileName, content);
        try {
          editorInstance?.commands.setContent(content);
        } catch {
          /* NodeView non-fatal */
        }
        setCurrentPath(path);
        setSavedContent(content);
      } catch (err) {
        console.error('Failed to open linked note:', err);
      }
    },
    [editorInstance, setCurrentPath, setSavedContent],
  );

  return (
    <div className="backlinks-panel" style={{ padding: 12, fontSize: 13 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ fontSize: 14, margin: 0 }}>{t('backlinks.title')}</h3>
        <button
          onClick={() => void refresh()}
          title={t('backlinks.refresh')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
        >
          ⟳
        </button>
      </div>

      {!currentPath && (
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('backlinks.noFile')}</p>
      )}

      {currentPath && (
        <>
          <section style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px' }}>
              {t('backlinks.linkedMentions')} ({backlinks.length})
            </h4>
            {loading && <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('backlinks.scanning')}</p>}
            {!loading && backlinks.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('backlinks.none')}</p>
            )}
            {backlinks.map((ref, i) => (
              <div
                key={`bl-${i}`}
                className="backlink-item"
                onClick={() => void openNote(ref.sourcePath)}
                style={{ cursor: 'pointer', padding: '4px 6px', borderRadius: 4, marginBottom: 2 }}
              >
                <div style={{ fontWeight: 600 }}>
                  {ref.sourcePath.split(/[/\\]/).pop()?.replace(/\.(md|markdown)$/i, '')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ref.context}
                </div>
              </div>
            ))}
          </section>

          <section>
            <h4 style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px' }}>
              {t('backlinks.outgoingLinks')} ({outlinks.length})
            </h4>
            {!loading && outlinks.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('backlinks.none')}</p>
            )}
            {outlinks.map((ref, i) => (
              <div
                key={`ol-${i}`}
                className="backlink-item"
                style={{ padding: '4px 6px', borderRadius: 4, marginBottom: 2 }}
              >
                <div style={{ fontWeight: 600 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>[[</span>
                  {ref.target}
                  <span style={{ color: 'var(--text-secondary)' }}>]]</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ref.context}
                </div>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
