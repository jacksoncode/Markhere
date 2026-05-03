import { useRecentFilesStore } from '../../store/recentFilesStore';
import './RecentFiles.css';

export function RecentFiles() {
  const { files, clearFiles } = useRecentFilesStore();

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="recent-files">
      <div className="recent-header">
        <span>最近文件</span>
        <button onClick={clearFiles} title="清除历史">清除</button>
      </div>
      <ul className="recent-list">
        {files.slice(0, 5).map((file) => (
          <li key={file.path} className="recent-item">
            <span className="recent-name">{file.name}</span>
            <span className="recent-time">
              {new Date(file.lastOpened).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}