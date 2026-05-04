import { NodeViewProps } from '@tiptap/react';
import { useState, useEffect } from 'react';
import './Frontmatter.css';

export function FrontmatterView({ node, updateAttributes }: NodeViewProps) {
  const [content, setContent] = useState(node.textContent || '---\ntitle: Untitled\n---');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setContent(node.textContent || '');
  }, [node.textContent]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
  };

  const handleSave = () => {
    updateAttributes({ content });
    setIsEditing(false);
  };

  const parsedYaml = parseYaml(content);

  if (isEditing) {
    return (
      <div className="frontmatter-editor">
        <div className="frontmatter-header">
          <span>YAML Frontmatter</span>
          <button className="frontmatter-save-btn" onClick={handleSave}>
            保存
          </button>
        </div>
        <textarea
          className="frontmatter-textarea"
          value={content}
          onChange={handleChange}
          placeholder="---\ntitle: My Document\nauthor: Name\ndate: 2024-01-01\n---"
        />
      </div>
    );
  }

  return (
    <div className="frontmatter-display" onClick={() => setIsEditing(true)}>
      <div className="frontmatter-label">YAML</div>
      <div className="frontmatter-fields">
        {parsedYaml.map(([key, value]) => (
          <div key={key} className="frontmatter-field">
            <span className="frontmatter-key">{key}:</span>
            <span className="frontmatter-value">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function parseYaml(content: string): [string, string][] {
  const lines = content.split('\n');
  const result: [string, string][] = [];

  let inYaml = false;
  for (const line of lines) {
    if (line.trim() === '---') {
      inYaml = !inYaml;
      continue;
    }

    if (inYaml && line.includes(':')) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      if (key && value) {
        result.push([key.trim(), value]);
      }
    }
  }

  return result;
}