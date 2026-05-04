import { useState } from 'react';
import { useAIStore, callAI } from '../../store/aiStore';
import { useEditorState } from '../../store/editorStore';
import './AIAssistant.css';

export function AIAssistant() {
  const { config, isEnabled, setConfig, toggleEnabled, addHistory } = useAIStore();
  const { editorInstance } = useEditorState();
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  if (!isEnabled) {
    return (
      <div className="ai-assistant-collapsed">
        <button className="ai-toggle-btn" onClick={toggleEnabled}>
          🤖 AI 助手
        </button>
      </div>
    );
  }

  const handleSend = async () => {
    if (!input.trim() || !editorInstance) return;

    setLoading(true);
    addHistory('user', input);

    try {
      const context = editorInstance.getText().slice(0, 2000);
      const result = await callAI(input, context, config);
      setResponse(result);
      addHistory('assistant', result);
    } catch (err) {
      setResponse(`错误: ${(err as Error).message}`);
    }

    setLoading(false);
    setInput('');
  };

  const handleInsert = () => {
    if (response && editorInstance) {
      editorInstance.chain().focus().insertContent(response).run();
    }
  };

  const quickActions = [
    { label: '优化段落', prompt: '请优化当前选中的段落，使其更流畅' },
    { label: '修正语法', prompt: '请检查并修正文档中的语法错误' },
    { label: '生成摘要', prompt: '请为当前文档生成一个简短的摘要' },
    { label: '继续写作', prompt: '请根据当前内容继续写作一段' },
  ];

  return (
    <div className="ai-assistant-panel">
      <div className="ai-header">
        <span>🤖 AI 写作助手</span>
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
            <label>API提供商</label>
            <select
              value={config.provider}
              onChange={(e) => setConfig({ provider: e.target.value as 'openai' | 'anthropic' | 'local' })}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="local">本地服务</option>
            </select>
          </div>

          <div className="ai-config-field">
            <label>API Key</label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ apiKey: e.target.value })}
              placeholder="sk-..."
            />
          </div>

          <div className="ai-config-field">
            <label>模型</label>
            <input
              type="text"
              value={config.model}
              onChange={(e) => setConfig({ model: e.target.value })}
              placeholder="gpt-4o-mini"
            />
          </div>

          {config.provider === 'local' && (
            <div className="ai-config-field">
              <label>服务地址</label>
              <input
                type="text"
                value={config.baseUrl}
                onChange={(e) => setConfig({ baseUrl: e.target.value })}
                placeholder="http://localhost:11434/v1"
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
          placeholder="输入你的问题或请求..."
          rows={3}
        />
        <button className="ai-send-btn" onClick={handleSend} disabled={loading}>
          {loading ? '思考中...' : '发送'}
        </button>
      </div>

      {response && (
        <div className="ai-response">
          <div className="ai-response-content">{response}</div>
          <button className="ai-insert-btn" onClick={handleInsert}>
            插入到文档
          </button>
        </div>
      )}
    </div>
  );
}