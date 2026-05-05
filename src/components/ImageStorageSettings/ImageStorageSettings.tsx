import { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useImageStorageStore } from '../../store/imageStorageStore';
import { CLOUD_IMAGE_PROVIDERS } from '../../services/imageStorageConfig';
import './ImageStorageSettings.css';

export function ImageStorageSettings() {
  const { t } = useTranslation();
  const { config, updateConfig } = useImageStorageStore();
  const [showCloudConfig, setShowCloudConfig] = useState(false);
  
  useEffect(() => {
    if (config.mode === 'cloud' && config.cloudProvider !== 'none') {
      setShowCloudConfig(true);
    } else {
      setShowCloudConfig(false);
    }
  }, [config.mode, config.cloudProvider]);
  
  const handleModeChange = (mode: 'local' | 'relative' | 'cloud') => {
    updateConfig({ mode });
    if (mode === 'cloud') {
      updateConfig({ cloudProvider: 'oss' });
    }
  };
  
  const handleCloudProviderChange = (provider: string) => {
    updateConfig({ cloudProvider: provider as any });
  };
  
  const handleLocalPathChange = (path: string) => {
    updateConfig({ localPath: path });
  };
  
  const handleRelativePathChange = (path: string) => {
    updateConfig({ relativePath: path });
  };
  
  const handleCloudConfigChange = (key: string, value: string) => {
    const currentConfig = config.cloudConfig || {
      endpoint: '',
      bucket: '',
      accessKeyId: '',
      accessKeySecret: '',
    };
    updateConfig({
      cloudConfig: {
        ...currentConfig,
        [key]: value,
      },
    });
  };
  
  return (
    <div className="image-storage-settings">
      <div className="settings-section">
        <h3>{t('imageStorage.mode')}</h3>
        <p className="section-desc">{t('imageStorage.modeDesc')}</p>
        
        <div className="mode-options">
          <div
            className={`mode-card ${config.mode === 'local' ? 'selected' : ''}`}
            onClick={() => handleModeChange('local')}
          >
            <div className="mode-icon">📁</div>
            <div className="mode-info">
              <span className="mode-name">{t('imageStorage.local')}</span>
              <span className="mode-desc">{t('imageStorage.localDesc')}</span>
            </div>
          </div>
          
          <div
            className={`mode-card ${config.mode === 'relative' ? 'selected' : ''}`}
            onClick={() => handleModeChange('relative')}
          >
            <div className="mode-icon">🔗</div>
            <div className="mode-info">
              <span className="mode-name">{t('imageStorage.relative')}</span>
              <span className="mode-desc">{t('imageStorage.relativeDesc')}</span>
            </div>
          </div>
          
          <div
            className={`mode-card ${config.mode === 'cloud' ? 'selected' : ''}`}
            onClick={() => handleModeChange('cloud')}
          >
            <div className="mode-icon">☁️</div>
            <div className="mode-info">
              <span className="mode-name">{t('imageStorage.cloud')}</span>
              <span className="mode-desc">{t('imageStorage.cloudDesc')}</span>
            </div>
          </div>
        </div>
      </div>
      
      {config.mode === 'local' && (
        <div className="settings-section">
          <h3>{t('imageStorage.localPath')}</h3>
          <div className="path-input-group">
            <input
              type="text"
              className="path-input"
              placeholder={t('imageStorage.localPathPlaceholder')}
              value={config.localPath}
              onChange={(e) => handleLocalPathChange(e.target.value)}
            />
            <button className="browse-btn">{t('imageStorage.browse')}</button>
          </div>
        </div>
      )}
      
      {config.mode === 'relative' && (
        <div className="settings-section">
          <h3>{t('imageStorage.relativePath')}</h3>
          <div className="path-input-group">
            <input
              type="text"
              className="path-input"
              placeholder="./images"
              value={config.relativePath}
              onChange={(e) => handleRelativePathChange(e.target.value)}
            />
          </div>
          <p className="hint">{t('imageStorage.relativeHint')}</p>
        </div>
      )}
      
      {config.mode === 'cloud' && (
        <div className="settings-section">
          <h3>{t('imageStorage.cloudProvider')}</h3>
          <div className="provider-grid">
            {CLOUD_IMAGE_PROVIDERS.map((provider) => (
              <div
                key={provider.id}
                className={`provider-card ${config.cloudProvider === provider.id ? 'selected' : ''}`}
                onClick={() => handleCloudProviderChange(provider.id)}
              >
                <span className="provider-name">{provider.name}</span>
                <span className="provider-desc">{provider.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {showCloudConfig && config.cloudProvider !== 'none' && (
        <div className="settings-section cloud-config">
          <h3>{t('imageStorage.cloudConfig')}</h3>
          
          <div className="config-field">
            <label>{t('imageStorage.bucket')}</label>
            <input
              type="text"
              className="config-input"
              placeholder="my-bucket"
              value={config.cloudConfig?.bucket || ''}
              onChange={(e) => handleCloudConfigChange('bucket', e.target.value)}
            />
          </div>
          
          <div className="config-field">
            <label>{t('imageStorage.accessKeyId')}</label>
            <input
              type="text"
              className="config-input"
              placeholder="AK..."
              value={config.cloudConfig?.accessKeyId || ''}
              onChange={(e) => handleCloudConfigChange('accessKeyId', e.target.value)}
            />
          </div>
          
          <div className="config-field">
            <label>{t('imageStorage.accessKeySecret')}</label>
            <input
              type="password"
              className="config-input"
              placeholder="SK..."
              value={config.cloudConfig?.accessKeySecret || ''}
              onChange={(e) => handleCloudConfigChange('accessKeySecret', e.target.value)}
            />
          </div>
          
          {CLOUD_IMAGE_PROVIDERS.find((p) => p.id === config.cloudProvider)?.requiresRegion && (
            <div className="config-field">
              <label>{t('imageStorage.region')}</label>
              <input
                type="text"
                className="config-input"
                placeholder="us-east-1"
                value={config.cloudConfig?.region || ''}
                onChange={(e) => handleCloudConfigChange('region', e.target.value)}
              />
            </div>
          )}
          
          <div className="config-field">
            <label>{t('imageStorage.customUrl')}</label>
            <input
              type="text"
              className="config-input"
              placeholder="https://cdn.example.com"
              value={config.cloudConfig?.customUrl || ''}
              onChange={(e) => handleCloudConfigChange('customUrl', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}