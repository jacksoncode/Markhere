import { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useImageStorageStore } from '../../store/imageStorageStore';
import { CLOUD_IMAGE_PROVIDERS } from '../../services/imageStorageConfig';
import type {
  ImageHostingProvider,
  S3Config,
  OSSConfig,
  ImgurConfig,
  CustomConfig,
} from '../../services/imageStorageConfig';
import { testProviderConnection } from '../../services/imageStorageConfig';
import './ImageStorageSettings.css';

function generateId(): string {
  return `provider_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function emptyConfigForType(type: ImageHostingProvider['type']): ImageHostingProvider['config'] {
  switch (type) {
    case 's3':
      return { endpoint: '', bucket: '', region: '', accessKey: '', secretKey: '', publicUrlPrefix: '' } as S3Config;
    case 'oss':
      return { endpoint: '', bucket: '', accessKey: '', secretKey: '', publicUrlPrefix: '' } as OSSConfig;
    case 'imgur':
      return { clientId: '' } as ImgurConfig;
    case 'custom':
      return { uploadUrl: '', headers: {}, formField: 'file' } as CustomConfig;
  }
}

export function ImageStorageSettings() {
  const { t } = useTranslation();
  const {
    config,
    updateConfig,
    activeProvider,
    providers,
    addProvider,
    updateProvider,
    deleteProvider,
    setActiveProvider,
  } = useImageStorageStore();

  const [showCloudConfig, setShowCloudConfig] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<ImageHostingProvider['type']>('s3');
  const [formConfig, setFormConfig] = useState<ImageHostingProvider['config']>(emptyConfigForType('s3'));
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (config.mode === 'cloud' && config.cloudProvider !== 'none') {
      setShowCloudConfig(true);
    } else {
      setShowCloudConfig(false);
    }
  }, [config.mode, config.cloudProvider]);

  // ---- Legacy mode handlers ----
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

  // ---- Provider form helpers ----
  const resetForm = () => {
    setShowAddForm(false);
    setEditingProviderId(null);
    setFormName('');
    setFormType('s3');
    setFormConfig(emptyConfigForType('s3'));
  };

  const openAddForm = () => {
    resetForm();
    setShowAddForm(true);
  };

  const openEditForm = (provider: ImageHostingProvider) => {
    setShowAddForm(true);
    setEditingProviderId(provider.id);
    setFormName(provider.name);
    setFormType(provider.type);
    setFormConfig({ ...provider.config });
  };

  const handleTypeChange = (type: ImageHostingProvider['type']) => {
    setFormType(type);
    setFormConfig(emptyConfigForType(type));
  };

  const handleConfigFieldChange = (field: string, value: string) => {
    setFormConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCustomHeadersChange = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      setFormConfig((prev) => ({
        ...prev,
        headers: parsed,
      }));
    } catch {
      // Keep the raw input so the user can fix JSON errors
      // We store whatever they type in a separate approach
    }
  };

  const handleSaveProvider = () => {
    if (!formName.trim()) return;
    const conf = { ...formConfig };
    if (formType === 'custom') {
      // Ensure headers is a proper Record
      if (typeof (conf as CustomConfig).headers !== 'object') {
        (conf as CustomConfig).headers = {};
      }
    }
    if (editingProviderId) {
      updateProvider(editingProviderId, {
        name: formName.trim(),
        type: formType,
        config: conf,
      });
    } else {
      const newProvider: ImageHostingProvider = {
        id: generateId(),
        name: formName.trim(),
        type: formType,
        config: conf,
      };
      addProvider(newProvider);
    }
    resetForm();
  };

  const handleTestConnection = async (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return;
    setTestingId(providerId);
    setTestResult(null);
    try {
      const ok = await testProviderConnection(provider);
      setTestResult({ id: providerId, ok });
    } catch {
      setTestResult({ id: providerId, ok: false });
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteProvider = (id: string) => {
    // If deleting the active provider, it will be auto-nulled by the store
    deleteProvider(id);
  };

  const handleSetActive = (id: string | null) => {
    setActiveProvider(id);
  };

  // ---- Render ----
  return (
    <div className="image-storage-settings">
      {/* ====== Legacy mode selection (local / relative / cloud) ====== */}
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

      {/* ====== External Hosting Providers ====== */}
      <div className="settings-section">
        <div className="section-header-row">
          <h3>External Image Hosting</h3>
          <button className="add-provider-btn" onClick={openAddForm}>
            + Add Provider
          </button>
        </div>
        <p className="section-desc">
          Configure external image hosting services (S3, OSS, Imgur, or custom endpoints).
          The active provider will be used when pasting images into the editor.
        </p>

        {providers.length === 0 && !showAddForm && (
          <div className="empty-providers">
            No providers configured. Click "Add Provider" to set up image hosting.
          </div>
        )}

        {providers.length > 0 && (
          <div className="provider-list">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className={`provider-list-item ${activeProvider === provider.id ? 'active' : ''}`}
              >
                <div className="provider-list-info">
                  <label className="provider-radio-label">
                    <input
                      type="radio"
                      name="activeProvider"
                      checked={activeProvider === provider.id}
                      onChange={() => handleSetActive(provider.id)}
                    />
                    <span className="provider-item-name">{provider.name}</span>
                  </label>
                  <span className="provider-item-type">{provider.type.toUpperCase()}</span>
                </div>
                <div className="provider-list-actions">
                  <button
                    className="provider-action-btn test-btn"
                    onClick={() => handleTestConnection(provider.id)}
                    disabled={testingId === provider.id}
                  >
                    {testingId === provider.id ? 'Testing...' : 'Test'}
                  </button>
                  {testResult?.id === provider.id && (
                    <span className={`test-result ${testResult.ok ? 'success' : 'fail'}`}>
                      {testResult.ok ? 'OK' : 'Failed'}
                    </span>
                  )}
                  <button
                    className="provider-action-btn edit-btn"
                    onClick={() => openEditForm(provider)}
                  >
                    Edit
                  </button>
                  <button
                    className="provider-action-btn delete-btn"
                    onClick={() => handleDeleteProvider(provider.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* If no active provider is set but providers exist, allow clearing */}
        {activeProvider !== null && (
          <div className="active-provider-hint">
            Active provider: <strong>{providers.find((p) => p.id === activeProvider)?.name}</strong>
            {' '}&middot;{' '}
            <button className="link-btn" onClick={() => handleSetActive(null)}>
              Clear selection (use local save)
            </button>
          </div>
        )}
      </div>

      {/* ====== Add / Edit Provider Form ====== */}
      {showAddForm && (
        <div className="settings-section provider-form-section">
          <h3>{editingProviderId ? 'Edit Provider' : 'Add Provider'}</h3>

          <div className="config-field">
            <label>Provider Name</label>
            <input
              type="text"
              className="config-input"
              placeholder="My S3 Bucket"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>

          <div className="config-field">
            <label>Provider Type</label>
            <select
              className="config-input"
              value={formType}
              onChange={(e) => handleTypeChange(e.target.value as ImageHostingProvider['type'])}
            >
              <option value="s3">S3-compatible</option>
              <option value="oss">Alibaba OSS</option>
              <option value="imgur">Imgur</option>
              <option value="custom">Custom API</option>
            </select>
          </div>

          {/* ---- S3 Fields ---- */}
          {formType === 's3' && (
            <>
              <div className="config-field">
                <label>Endpoint</label>
                <input
                  type="text"
                  className="config-input"
                  placeholder="https://s3.us-east-1.amazonaws.com"
                  value={(formConfig as S3Config).endpoint || ''}
                  onChange={(e) => handleConfigFieldChange('endpoint', e.target.value)}
                />
              </div>
              <div className="config-field">
                <label>Bucket</label>
                <input
                  type="text"
                  className="config-input"
                  placeholder="my-bucket"
                  value={(formConfig as S3Config).bucket || ''}
                  onChange={(e) => handleConfigFieldChange('bucket', e.target.value)}
                />
              </div>
              <div className="config-field">
                <label>Region</label>
                <input
                  type="text"
                  className="config-input"
                  placeholder="us-east-1"
                  value={(formConfig as S3Config).region || ''}
                  onChange={(e) => handleConfigFieldChange('region', e.target.value)}
                />
              </div>
              <div className="config-field">
                <label>Access Key</label>
                <input
                  type="text"
                  className="config-input"
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  value={(formConfig as S3Config).accessKey || ''}
                  onChange={(e) => handleConfigFieldChange('accessKey', e.target.value)}
                />
              </div>
              <div className="config-field">
                <label>Secret Key</label>
                <input
                  type="password"
                  className="config-input"
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                  value={(formConfig as S3Config).secretKey || ''}
                  onChange={(e) => handleConfigFieldChange('secretKey', e.target.value)}
                />
              </div>
              <div className="config-field">
                <label>Public URL Prefix</label>
                <input
                  type="text"
                  className="config-input"
                  placeholder="https://my-bucket.s3.us-east-1.amazonaws.com"
                  value={(formConfig as S3Config).publicUrlPrefix || ''}
                  onChange={(e) => handleConfigFieldChange('publicUrlPrefix', e.target.value)}
                />
              </div>
            </>
          )}

          {/* ---- OSS Fields ---- */}
          {formType === 'oss' && (
            <>
              <div className="config-field">
                <label>Endpoint</label>
                <input
                  type="text"
                  className="config-input"
                  placeholder="https://oss-cn-hangzhou.aliyuncs.com"
                  value={(formConfig as OSSConfig).endpoint || ''}
                  onChange={(e) => handleConfigFieldChange('endpoint', e.target.value)}
                />
              </div>
              <div className="config-field">
                <label>Bucket</label>
                <input
                  type="text"
                  className="config-input"
                  placeholder="my-bucket"
                  value={(formConfig as OSSConfig).bucket || ''}
                  onChange={(e) => handleConfigFieldChange('bucket', e.target.value)}
                />
              </div>
              <div className="config-field">
                <label>Access Key</label>
                <input
                  type="text"
                  className="config-input"
                  placeholder="LTAI5t..."
                  value={(formConfig as OSSConfig).accessKey || ''}
                  onChange={(e) => handleConfigFieldChange('accessKey', e.target.value)}
                />
              </div>
              <div className="config-field">
                <label>Secret Key</label>
                <input
                  type="password"
                  className="config-input"
                  placeholder="..."
                  value={(formConfig as OSSConfig).secretKey || ''}
                  onChange={(e) => handleConfigFieldChange('secretKey', e.target.value)}
                />
              </div>
              <div className="config-field">
                <label>Public URL Prefix</label>
                <input
                  type="text"
                  className="config-input"
                  placeholder="https://my-bucket.oss-cn-hangzhou.aliyuncs.com"
                  value={(formConfig as OSSConfig).publicUrlPrefix || ''}
                  onChange={(e) => handleConfigFieldChange('publicUrlPrefix', e.target.value)}
                />
              </div>
            </>
          )}

          {/* ---- Imgur Fields ---- */}
          {formType === 'imgur' && (
            <div className="config-field">
              <label>Client ID</label>
              <input
                type="text"
                className="config-input"
                placeholder="Your Imgur Client ID"
                value={(formConfig as ImgurConfig).clientId || ''}
                onChange={(e) => handleConfigFieldChange('clientId', e.target.value)}
              />
            </div>
          )}

          {/* ---- Custom Fields ---- */}
          {formType === 'custom' && (
            <>
              <div className="config-field">
                <label>Upload URL</label>
                <input
                  type="text"
                  className="config-input"
                  placeholder="https://api.example.com/upload"
                  value={(formConfig as CustomConfig).uploadUrl || ''}
                  onChange={(e) => handleConfigFieldChange('uploadUrl', e.target.value)}
                />
              </div>
              <div className="config-field">
                <label>Form Field Name (for file)</label>
                <input
                  type="text"
                  className="config-input"
                  placeholder="file"
                  value={(formConfig as CustomConfig).formField || 'file'}
                  onChange={(e) => handleConfigFieldChange('formField', e.target.value)}
                />
              </div>
              <div className="config-field">
                <label>Custom Headers (JSON)</label>
                <textarea
                  className="config-input config-textarea"
                  placeholder='{"Authorization": "Bearer token"}'
                  rows={3}
                  value={JSON.stringify((formConfig as CustomConfig).headers, null, 2)}
                  onChange={(e) => handleCustomHeadersChange(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="form-actions">
            <button className="save-provider-btn" onClick={handleSaveProvider}>
              {editingProviderId ? 'Update Provider' : 'Add Provider'}
            </button>
            <button className="cancel-btn" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
