import { useCloudStore } from '../../store/cloudStore';
import './CloudSyncPanel.css';

export function CloudSyncPanel() {
  const { providers, connect, disconnect, sync, lastSync } = useCloudStore();

  return (
    <div className="cloud-sync-panel">
      <div className="providers-list">
        {providers.map((provider) => (
          <div key={provider.name} className="provider-item">
            <span className="provider-icon">{provider.icon}</span>
            <span className="provider-name">{provider.name}</span>
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

      {lastSync && (
        <div className="sync-status">
          上次同步: {new Date(lastSync).toLocaleString()}
        </div>
      )}

      <button onClick={sync} className="sync-btn">
        立即同步
      </button>
    </div>
  );
}