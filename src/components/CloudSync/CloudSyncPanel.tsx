import { useCloudStore } from '../../store/cloudStore';
import './CloudSyncPanel.css';

export function CloudSyncPanel() {
  const {
    providers,
    connect,
    disconnect,
    sync,
    lastSync,
    cloudPath,
    cloudFiles,
  } = useCloudStore();

  const hasCloudPath = Boolean(cloudPath);

  return (
    <div className="cloud-sync-panel">
      <div className="providers-list">
        {providers.map((provider) => (
          <div key={provider.name} className="provider-item">
            <span className="provider-icon">{provider.icon}</span>
            <span className="provider-name">{provider.name}</span>
            {provider.path && (
              <span className="provider-path" title={provider.path}>
                {shortenPath(provider.path)}
              </span>
            )}
            <button
              onClick={() =>
                provider.connected
                  ? disconnect(provider.name)
                  : connect(provider.name)
              }
              className={provider.connected ? 'connected' : ''}
            >
              {provider.connected ? '断开' : '连接'}
            </button>
          </div>
        ))}
      </div>

      {hasCloudPath && cloudPath && (
        <div className="sync-path" title={cloudPath}>
          云端路径: {shortenPath(cloudPath)}
        </div>
      )}

      <button
        onClick={sync}
        className="sync-btn"
        disabled={!hasCloudPath}
      >
        立即同步
      </button>

      {lastSync && (
        <div className="sync-status">
          上次同步: {new Date(lastSync).toLocaleString()}
          {cloudFiles.length > 0 && (
            <span className="sync-file-count">
              {' '}({cloudFiles.length} 个文件)
            </span>
          )}
        </div>
      )}

      {cloudFiles.length > 0 && (
        <div className="cloud-files-list">
          {cloudFiles.map((file) => (
            <div key={file.path} className="cloud-file-item">
              <span className="cloud-file-icon">📄</span>
              <span className="cloud-file-name">{file.name}</span>
            </div>
          ))}
        </div>
      )}

      {hasCloudPath && cloudFiles.length === 0 && lastSync && (
        <div className="cloud-empty">云端目录中暂无 .md 文件</div>
      )}
    </div>
  );
}

/** Shorten a long path for display: show last two segments. */
function shortenPath(path: string): string {
  const parts = path.replace(/\/+$/, '').split('/');
  if (parts.length <= 3) return path;
  return `…/${parts.slice(-2).join('/')}`;
}
