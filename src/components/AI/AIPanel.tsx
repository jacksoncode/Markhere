import { AIEnhanced, type AIResult } from '../../services/AIEnhanced';
import { useEditorState } from '../../store/editorStore';
import { useState } from 'react';
import './AIPanel.css';

type ActionKey = 'summarize' | 'translate' | 'polish' | 'tags' | 'suggestions' | 'outline';

const ACTIONS: { key: ActionKey; label: string; icon: string; desc: string }[] = [
  { key: 'summarize', label: 'Summarize', icon: '📝', desc: 'Generate a concise summary' },
  { key: 'translate', label: 'Translate', icon: '🌐', desc: 'Translate to another language' },
  { key: 'polish', label: 'Polish', icon: '✨', desc: 'Improve writing quality' },
  { key: 'tags', label: 'Suggest Tags', icon: '🏷️', desc: 'Auto-suggest relevant tags' },
  { key: 'suggestions', label: 'Writing Tips', icon: '💡', desc: 'Get writing suggestions' },
  { key: 'outline', label: 'Outline', icon: '📋', desc: 'Generate structured outline' },
];

export function AIPanel() {
  const { editorInstance } = useEditorState();
  const [result, setResult] = useState<AIResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [targetLang, setTargetLang] = useState('zh');
  const [polishStyle, setPolishStyle] = useState<'academic' | 'casual' | 'professional'>('professional');
  const [showLang, setShowLang] = useState(false);
  const [showStyle, setShowStyle] = useState(false);

  const getContent = (): string => {
    if (!editorInstance) return '';
    return (editorInstance.storage as any)?.markdown?.getMarkdown?.() || editorInstance.getText();
  };

  const handleAction = async (key: ActionKey) => {
    const content = getContent();
    if (!content) { setResult({ success: false, text: '', error: 'No content to analyze. Write something first.' }); return; }

    setLoading(true); setResult(null);
    let r: AIResult;
    try {
      switch (key) {
        case 'summarize': r = await AIEnhanced.summarize(content); break;
        case 'translate': setShowLang(true); r = await AIEnhanced.translate(content, targetLang); setShowLang(false); break;
        case 'polish': setShowStyle(true); r = await AIEnhanced.polish(content, polishStyle); setShowStyle(false); break;
        case 'tags': r = await AIEnhanced.suggestTags(content); break;
        case 'suggestions': r = await AIEnhanced.writingSuggestions(content); break;
        case 'outline': r = await AIEnhanced.generateOutline(content); break;
        default: r = { success: false, text: '', error: 'Unknown action' };
      }
    } catch (e) { r = { success: false, text: '', error: String(e) }; }
    setResult(r); setLoading(false);
  };

  return (
    <div className="ai-panel">
      <h2>AI Assistant</h2>
      <p className="ai-subtitle">Select an action to analyze your document</p>

      <div className="ai-actions">
        {ACTIONS.map(a => (
          <button key={a.key} className="ai-action-btn" onClick={() => handleAction(a.key)} disabled={loading}>
            <span className="ai-action-icon">{a.icon}</span>
            <span className="ai-action-label">{a.label}</span>
            <span className="ai-action-desc">{a.desc}</span>
          </button>
        ))}
      </div>

      {showLang && (
        <div className="ai-options">
          <label>Target Language:</label>
          <select value={targetLang} onChange={e => setTargetLang(e.target.value)}>
            <option value="zh">中文</option><option value="en">English</option><option value="ja">日本語</option>
            <option value="ko">한국어</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="es">Español</option>
          </select>
        </div>
      )}
      {showStyle && (
        <div className="ai-options">
          <label>Style:</label>
          <select value={polishStyle} onChange={e => setPolishStyle(e.target.value as any)}>
            <option value="professional">Professional</option><option value="academic">Academic</option><option value="casual">Casual</option>
          </select>
        </div>
      )}

      {loading && <div className="ai-loading">Processing... ⏳</div>}

      {result && (
        <div className={`ai-result${!result.success ? ' error' : ''}`}>
          <div className="ai-result-header">
            {result.success ? '✅ Result' : '❌ Error'}
          </div>
          <pre className="ai-result-text">{result.text || result.error}</pre>
        </div>
      )}
    </div>
  );
}
