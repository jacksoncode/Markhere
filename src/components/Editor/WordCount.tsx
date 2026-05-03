import { useEditorState } from '../../store/editorStore';
import './WordCount.css';

export function WordCount() {
  const { content } = useEditorState();

  const stats = calculateStats(content);

  return (
    <div className="word-count">
      <span className="stat">
        <span className="stat-label">字数:</span>
        <span className="stat-value">{stats.chars}</span>
      </span>
      <span className="stat">
        <span className="stat-label">词数:</span>
        <span className="stat-value">{stats.words}</span>
      </span>
      <span className="stat">
        <span className="stat-label">段落:</span>
        <span className="stat-value">{stats.paragraphs}</span>
      </span>
    </div>
  );
}

function calculateStats(html: string) {
  const text = html.replace(/<[^>]*>/g, '').trim();
  
  const chars = text.length;
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0).length;
  
  return { chars, words, paragraphs };
}