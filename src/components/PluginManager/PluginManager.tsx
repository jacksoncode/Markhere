import { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { usePluginStore } from '../../store/pluginStore';
import { MarkherePlugin } from '../../plugins/PluginAPI';
import './PluginManager.css';

export function PluginManager() {
  const { t } = useTranslation();
  const { plugins, enabledPlugins, enablePlugin, disablePlugin, unloadPlugin } = usePluginStore();
  const [pluginList, setPluginList] = useState<MarkherePlugin[]>([]);
  
  useEffect(() => {
    const list: MarkherePlugin[] = [];
    plugins.forEach((plugin) => {
      list.push(plugin);
    });
    setPluginList(list);
  }, [plugins]);
  
  const handleEnable = (pluginId: string) => {
    enablePlugin(pluginId);
  };
  
  const handleDisable = (pluginId: string) => {
    disablePlugin(pluginId);
  };
  
  const handleRemove = async (pluginId: string) => {
    await unloadPlugin(pluginId);
  };
  
  return (
    <div className="plugin-manager">
      <div className="plugin-header">
        <h2>{t('plugins.title')}</h2>
        <p className="plugin-desc">{t('plugins.description')}</p>
      </div>
      
      <div className="plugin-list">
        {pluginList.length === 0 ? (
          <div className="plugin-empty">
            <p>{t('plugins.empty')}</p>
            <button className="install-plugin-btn">{t('plugins.install')}</button>
          </div>
        ) : (
          pluginList.map((plugin) => (
            <div key={plugin.id} className={`plugin-card ${plugin.enabled ? 'enabled' : 'disabled'}`}>
              <div className="plugin-info">
                <div className="plugin-name-row">
                  <h3 className="plugin-name">{plugin.name}</h3>
                  <span className="plugin-version">v{plugin.version}</span>
                </div>
                
                <p className="plugin-description">{plugin.description}</p>
                
                <div className="plugin-meta">
                  <span className="plugin-author">
                    {t('plugins.author')}: {plugin.author}
                  </span>
                  <span className="plugin-license">
                    {t('plugins.license')}: {plugin.license}
                  </span>
                </div>
                
                {plugin.homepage && (
                  <a href={plugin.homepage} target="_blank" rel="noopener noreferrer" className="plugin-link">
                    {t('plugins.homepage')}
                  </a>
                )}
              </div>
              
              <div className="plugin-actions">
                {plugin.enabled ? (
                  <button className="disable-btn" onClick={() => handleDisable(plugin.id)}>
                    {t('plugins.disable')}
                  </button>
                ) : (
                  <button className="enable-btn" onClick={() => handleEnable(plugin.id)}>
                    {t('plugins.enable')}
                  </button>
                )}
                
                <button className="remove-btn" onClick={() => handleRemove(plugin.id)}>
                  {t('plugins.remove')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="plugin-footer">
        <div className="plugin-stats">
          <span>{t('plugins.installed')}: {pluginList.length}</span>
          <span>{t('plugins.enabled')}: {enabledPlugins.length}</span>
        </div>
        
        <div className="plugin-actions-footer">
          <button className="install-plugin-btn">{t('plugins.installFromPath')}</button>
          <button className="reload-plugins-btn">{t('plugins.reloadAll')}</button>
        </div>
      </div>
    </div>
  );
}