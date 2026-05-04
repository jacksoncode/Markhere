import { usePluginStore, Plugin } from '../../store/pluginStore';
import './PluginManager.css';

export function PluginManager() {
  const { plugins, loadPlugin, enablePlugin, disablePlugin, unloadPlugin } = usePluginStore();

  return (
    <div className="plugin-manager">
      <div className="plugin-list">
        {plugins.map((plugin: Plugin) => (
          <div key={plugin.id} className="plugin-item">
            <div className="plugin-info">
              <span className="plugin-name">{plugin.name}</span>
              <span className="plugin-version">v{plugin.version}</span>
            </div>
            <div className="plugin-controls">
              <button
                onClick={() => plugin.enabled ? disablePlugin(plugin.id) : enablePlugin(plugin.id)}
                className={plugin.enabled ? 'enabled' : ''}
              >
                {plugin.enabled ? '禁用' : '启用'}
              </button>
              <button onClick={() => unloadPlugin(plugin.id)}>卸载</button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => loadPlugin('/path/to/plugin')} className="load-btn">
        加载插件
      </button>
    </div>
  );
}