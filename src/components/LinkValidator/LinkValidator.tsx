import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useEditorState } from '../../store/editorStore';
import './LinkValidator.css';

interface LinkInfo {
  url: string;
  text: string;
  status: 'valid' | 'broken' | 'checking' | 'pending';
}

export function LinkValidator() {
  const { content } = useEditorState();
  const [links, setLinks] = useState<LinkInfo[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!content) return;
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const extractedLinks: LinkInfo[] = [];
    let match;
    
    while ((match = linkRegex.exec(content)) !== null) {
      const text = match[1];
      const url = match[2];
      if (url.startsWith('http://') || url.startsWith('https://')) {
        extractedLinks.push({ text, url, status: 'pending' });
      }
    }
    
    setLinks(extractedLinks);
  }, [content]);

  const validateAllLinks = async () => {
    setIsValidating(true);
    
    const updatedLinks = [...links];
    
    for (let i = 0; i < updatedLinks.length; i++) {
      updatedLinks[i] = { ...updatedLinks[i], status: 'checking' };
      setLinks([...updatedLinks]);
      
      try {
        const isValid = await invoke<boolean>('validate_link', { url: updatedLinks[i].url });
        updatedLinks[i] = { ...updatedLinks[i], status: isValid ? 'valid' : 'broken' };
      } catch {
        updatedLinks[i] = { ...updatedLinks[i], status: 'broken' };
      }
      
      setLinks([...updatedLinks]);
    }
    
    setIsValidating(false);
  };

  const validCount = links.filter(l => l.status === 'valid').length;
  const brokenCount = links.filter(l => l.status === 'broken').length;
  const pendingCount = links.filter(l => l.status === 'pending').length;

  if (!isOpen) {
    return (
      <button
        className="link-validator-toggle"
        onClick={() => setIsOpen(true)}
        title="Link Validator"
      >
        🔗
        {brokenCount > 0 && <span className="broken-indicator">{brokenCount}</span>}
      </button>
    );
  }

  return (
    <div className="link-validator-panel">
      <div className="link-validator-header">
        <h3>Link Validator</h3>
        <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
      </div>

      <div className="link-validator-stats">
        <span className="stat valid">✓ {validCount} valid</span>
        <span className="stat broken">✗ {brokenCount} broken</span>
        <span className="stat pending">○ {pendingCount} pending</span>
      </div>

      <div className="link-validator-actions">
        <button
          className="validate-btn"
          onClick={validateAllLinks}
          disabled={isValidating || links.length === 0}
        >
          {isValidating ? 'Validating...' : 'Validate All'}
        </button>
      </div>

      <div className="link-validator-list">
        {links.length === 0 ? (
          <p className="no-links">No external links found in document.</p>
        ) : (
          links.map((link, index) => (
            <div key={index} className={`link-item ${link.status}`}>
              <span className="link-status-icon">
                {link.status === 'valid' ? '✓' : link.status === 'broken' ? '✗' : link.status === 'checking' ? '○' : '○'}
              </span>
              <div className="link-info">
                <span className="link-text">{link.text}</span>
                <a className="link-url" href={link.url} target="_blank" rel="noopener noreferrer">
                  {link.url}
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}