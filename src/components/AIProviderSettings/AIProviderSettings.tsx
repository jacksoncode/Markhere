import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../../i18n';
import { AI_PROVIDERS, fetchModelsFromProvider, AIModel } from '../../services/aiProviders';
import { useAIStore } from '../../store/aiStore';
import './AIProviderSettings.css';

export function AIProviderSettings() {
  const { t } = useTranslation();
  const {
    config,
    apiKeys,
    setConfig,
    setApiKey,
    clearApiKey,
  } = useAIStore();

  const selectedProvider = config.providerId;
  const selectedModel = config.model;

  const [dynamicModels, setDynamicModels] = useState<AIModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const currentProvider = useMemo(() => {
    return AI_PROVIDERS.find((p) => p.id === selectedProvider);
  }, [selectedProvider]);

  const currentApiKey = useMemo(() => {
    return apiKeys[selectedProvider] || '';
  }, [apiKeys, selectedProvider]);

  useEffect(() => {
    if (currentProvider && currentApiKey) {
      loadModels();
    } else {
      setDynamicModels(currentProvider?.models || []);
    }
  }, [currentProvider, currentApiKey]);

  const loadModels = async () => {
    if (!currentProvider) return;

    setIsLoadingModels(true);
    try {
      const models = await fetchModelsFromProvider(currentProvider.id, currentApiKey);
      setDynamicModels(models);

      if (models.length > 0 && !selectedModel) {
        setConfig({ model: models[0].id });
      }
    } catch (error) {
      console.error('Failed to load models:', error);
      setDynamicModels(currentProvider.models);
    }
    setIsLoadingModels(false);
  };

  const handleProviderChange = (providerId: string) => {
    setConfig({ providerId, model: '' });
    setDynamicModels([]);
    setTestResult(null);

    if (providerId === 'ollama') {
      loadModels();
    }
  };

  const handleSaveApiKey = () => {
    if (tempApiKey && currentProvider) {
      setApiKey(currentProvider.id, tempApiKey);
      setShowApiKeyInput(false);
      setTempApiKey('');
      loadModels();
    }
  };

  const handleClearApiKey = () => {
    if (currentProvider) {
      clearApiKey(currentProvider.id);
      setConfig({ model: '' });
      setDynamicModels(currentProvider.models);
      setTestResult(null);
    }
  };

  const handleTestConnection = async () => {
    if (!currentProvider || !currentApiKey) return;

    setTestingProvider(currentProvider.id);
    setTestResult(null);

    try {
      const response = await fetch(`${currentProvider.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${currentApiKey}`,
        },
      });

      if (response.ok) {
        setTestResult({ success: true, message: t('ai.testConnectionSuccess') });
      } else {
        const errorText = await response.text().catch(() => '');
        setTestResult({
          success: false,
          message: `${t('ai.testConnectionFailed')} (${response.status}${errorText ? ': ' + errorText.slice(0, 100) : ''})`,
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `${t('ai.testConnectionFailed')}: ${(error as Error).message}`,
      });
    }

    setTestingProvider(null);
  };

  return (
    <div className="ai-provider-settings">
      <div className="settings-section">
        <h3>{t('ai.provider')}</h3>
        <p className="section-desc">{t('ai.providerDesc')}</p>

        <div className="provider-grid">
          {AI_PROVIDERS.map((provider) => (
            <div
              key={provider.id}
              className={`provider-card ${selectedProvider === provider.id ? 'selected' : ''}`}
              onClick={() => handleProviderChange(provider.id)}
            >
              <div className="provider-icon">
                {provider.id === 'ollama' ? '\u{1F3E0}' : '\u{1F916}'}
              </div>
              <div className="provider-info">
                <span className="provider-name">{provider.name}</span>
                <span className="provider-models">{provider.models.length} {t('ai.models')}</span>
              </div>
              {apiKeys[provider.id] && (
                <div className="provider-status configured">{'✓'}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {currentProvider && (
        <div className="settings-section">
          <h3>{t('ai.apiKey')}</h3>

          {currentProvider.id === 'ollama' ? (
            <div className="api-key-info">
              <p>{t('ai.ollamaNoKey')}</p>
              <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer">
                {t('ai.ollamaSetup')}
              </a>
            </div>
          ) : (
            <div className="api-key-section">
              {currentApiKey ? (
                <div className="api-key-configured">
                  <span className="api-key-hidden">••••••••••••{currentApiKey.slice(-4)}</span>
                  <button className="clear-key-btn" onClick={handleClearApiKey}>
                    {t('ai.clearKey')}
                  </button>
                </div>
              ) : (
                <div className="api-key-input-section">
                  {showApiKeyInput ? (
                    <div className="api-key-input-wrapper">
                      <input
                        type="password"
                        className="api-key-input"
                        placeholder={`${currentProvider.apiKeyPrefix}...`}
                        value={tempApiKey}
                        onChange={(e) => setTempApiKey(e.target.value)}
                      />
                      <button className="save-key-btn" onClick={handleSaveApiKey}>
                        {t('ai.save')}
                      </button>
                      <button className="cancel-btn" onClick={() => setShowApiKeyInput(false)}>
                        {t('ai.cancel')}
                      </button>
                    </div>
                  ) : (
                    <button className="configure-btn" onClick={() => setShowApiKeyInput(true)}>
                      {t('ai.configure')}
                    </button>
                  )}
                </div>
              )}

              {/* Test Connection */}
              {currentApiKey && (
                <div className="test-connection-area">
                  <button
                    className="test-connection-btn"
                    onClick={handleTestConnection}
                    disabled={testingProvider === currentProvider.id}
                  >
                    {testingProvider === currentProvider.id ? t('ai.testing') : t('ai.testConnection')}
                  </button>
                  {testResult && (
                    <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                      {testResult.message}
                    </div>
                  )}
                </div>
              )}

              <div className="provider-features">
                {currentProvider.features.streaming && <span className="feature-tag">Streaming</span>}
                {currentProvider.features.tools && <span className="feature-tag">Tools</span>}
                {currentProvider.features.vision && <span className="feature-tag">Vision</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {currentProvider && (currentApiKey || currentProvider.id === 'ollama') && (
        <div className="settings-section">
          <h3>{t('ai.model')}</h3>

          {isLoadingModels ? (
            <div className="loading-models">{t('ai.loadingModels')}</div>
          ) : (
            <div className="model-list">
              {dynamicModels.map((model) => (
                <div
                  key={model.id}
                  className={`model-card ${selectedModel === model.id ? 'selected' : ''}`}
                  onClick={() => setConfig({ model: model.id })}
                >
                  <div className="model-info">
                    <span className="model-name">{model.name}</span>
                    <span className="model-id">{model.id}</span>
                  </div>
                  <div className="model-details">
                    <span className="model-tokens">{model.maxTokens} tokens</span>
                    {model.pricing.input > 0 && (
                      <span className="model-pricing">
                        ¥{model.pricing.input}/¥{model.pricing.output} per 1K
                      </span>
                    )}
                    {model.pricing.input === 0 && (
                      <span className="model-free">{t('ai.free')}</span>
                    )}
                  </div>
                  <div className="model-capabilities">
                    {model.capabilities.map((cap) => (
                      <span key={cap} className="capability-tag">{cap}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {dynamicModels.length === 0 && !isLoadingModels && (
            <div className="no-models">
              <p>{t('ai.noModels')}</p>
              <button onClick={loadModels}>{t('ai.retry')}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
