import { useState, useMemo } from 'react';
import { useAIStore, callAIStream, AI_PROVIDERS } from '../../store/aiStore';
import { useEditorState } from '../../store/editorStore';
import { useTranslation } from '../../i18n';
import { useNotificationStore } from '../Notification/Notification';
import './AIAssistant.css';

export function AIAssistant() {
  const { t } = useTranslation();
  const {
    config,
    apiKeys,
    isEnabled,
    setConfig,
    toggleEnabled,
    addHistory,
  } = useAIStore();
  const { editorInstance } = useEditorState();
  const { notify } = useNotificationStore();

  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const currentProvider = useMemo(
    () => AI_PROVIDERS.find((p) => p.id === config.providerId),
    [config.providerId]
  );

  const currentApiKey = useMemo(
    () => apiKeys[config.providerId] || '',
    [apiKeys, config.providerId]
  );

  const models = useMemo(
    () => currentProvider?.models ?? [],
    [currentProvider]
  );

  if (!isEnabled) {
    return (
      <div className="ai-assistant-collapsed">
        <button className="ai-toggle-btn" onClick={toggleEnabled}>
          🤖 {t('ai.assistant')}
        </button>
      </div>
    );
  }

  const handleSend = async () => {
    if (!input.trim() || !editorInstance) return;

    setLoading(true);
    setResponse('');
    addHistory('user', input);

    try {
      const context = editorInstance.getText().slice(0, 2000);
      let streamedContent = '';

      await callAIStream(input, context, config, currentApiKey, (chunk) => {
        streamedContent += chunk;
        setResponse(streamedContent);
      });

      addHistory('assistant', streamedContent);
    } catch (err) {
      const errorMessage = (err as Error).message || String(err);
      console.error('[AIAssistant] Request failed:', err);
      notify('error', errorMessage, t('ai.errorPrefix'));
      setResponse(`${t('ai.errorPrefix')}${errorMessage}`);
    }

    setLoading(false);
    setInput('');
  };

  const handleInsert = () => {
    if (response && editorInstance) {
      editorInstance.chain().focus().insertContent(response).run();
    }
  };

  const handleProviderChange = (providerId: string) => {
    const provider = AI_PROVIDERS.find((p) => p.id === providerId);
    const defaultModel = provider?.models[0]?.id ?? '';
    setConfig({ providerId, model: defaultModel });
  };

  const quickActions = [
    { label: t('ai.optimizeParagraph'), prompt: '请优化当前选中的段落，使其更流畅' },
    { label: t('ai.fixGrammar'), prompt: '请检查并修正文档中的语法错误' },
    { label: t('ai.generateSummary'), prompt: '请为当前文档生成一个简短的摘要' },
    { label: t('ai.continueWriting'), prompt: '请根据当前内容继续写作一段' },
  ];

  return (
    <div className="ai-assistant-panel">
      <div className="ai-header">
        <span>🤖 {t('ai.writingAssistant')}</span>
        <div className="ai-header-actions">
          <button className="ai-config-btn" onClick={() => setShowConfig(!showConfig)}>
            ⚙️
          </button>
          <button className="ai-close-btn" onClick={toggleEnabled}>
            ✕
          </button>
        </div>
      </div>

      {showConfig && (
        <div className="ai-config">
          <div className="ai-config-field">
            <label>{t('ai.provider')}</label>
            <select
              value={config.providerId}
              onChange={(e) => handleProviderChange(e.target.value)}
            >
              {AI_PROVIDERS.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          <div className="ai-config-field">
            <label>{t('ai.model')}</label>
            <select
              value={config.model}
              onChange={(e) => setConfig({ model: e.target.value })}
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          {config.providerId !== 'ollama' && (
            <div className="ai-config-field">
              <label>{t('ai.apiKey')}</label>
              <input
                type="password"
                value={currentApiKey}
                onChange={(e) => {
                  const key = e.target.value;
                  useAIStore.getState().setApiKey(config.providerId, key);
                }}
                placeholder={`${currentProvider?.apiKeyPrefix ?? ''}...`}
              />
            </div>
          )}
        </div>
      )}

      <div className="ai-quick-actions">
        {quickActions.map((action) => (
          <button
            key={action.label}
            className="ai-action-btn"
            onClick={() => setInput(action.prompt)}
          >
            {action.label}
          </button>
        ))}
      </div>

      <div className="ai-input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('ai.placeholder')}
          rows={3}
        />
        <button className="ai-send-btn" onClick={handleSend} disabled={loading}>
          {loading ? t('ai.thinking') : t('ai.send')}
        </button>
      </div>

      {response && (
        <div className="ai-response">
          <div className="ai-response-content">{response}</div>
          <button className="ai-insert-btn" onClick={handleInsert}>
            {t('ai.insertToDocument')}
          </button>
        </div>
      )}
    </div>
  );
}
