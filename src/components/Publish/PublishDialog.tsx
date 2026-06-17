import { useState } from 'react';
import { PublishService, PublishConfig, PublishResult } from '../../services/PublishService';
import './PublishDialog.css';

interface PublishDialogProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
}

export function PublishDialog({ isOpen, onClose, content }: PublishDialogProps) {
  const [platform, setPlatform] = useState<'github-pages' | 'netlify' | 'vercel'>('github-pages');
  const [token, setToken] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<PublishResult | null>(null);

  const publishService = new PublishService();

  const handlePublish = async () => {
    setPublishing(true);
    setResult(null);

    const config: PublishConfig = {
      platform,
      token,
      repo,
      branch,
    };

    let publishResult: PublishResult;

    switch (platform) {
      case 'github-pages':
        publishResult = await publishService.publishToGitHubPages(content, config);
        break;
      case 'netlify':
        publishResult = await publishService.publishToNetlify(content, config);
        break;
      case 'vercel':
        publishResult = await publishService.publishToVercel(content, config);
        break;
    }

    setResult(publishResult);
    setPublishing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="publish-dialog-overlay" data-testid="publish-dialog">
      <div className="publish-dialog" data-testid="publish-dialog-content">
        <div className="publish-header" data-testid="publish-header">
          <h2>发布到 Web</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="publish-body">
          <div className="platform-select">
            <label>平台</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value as any)} data-testid="platform-select">
              <option value="github-pages">GitHub Pages</option>
              <option value="netlify">Netlify</option>
              <option value="vercel">Vercel</option>
            </select>
          </div>

          {platform === 'github-pages' && (
            <>
              <div className="field">
                <label>Token</label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxx"
                  data-testid="github-token"
                />
              </div>
              <div className="field">
                <label>仓库 (owner/repo)</label>
                <input
                  type="text"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="username/repo"
                  data-testid="repo-input"
                />
              </div>
              <div className="field">
                <label>分支</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                />
              </div>
            </>
          )}

          {platform === 'netlify' && (
            <div className="field">
              <label>Netlify Token</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Netlify API token"
                data-testid="netlify-token-input"
              />
            </div>
          )}

          {platform === 'vercel' && (
            <div className="field">
              <label>Vercel Token</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Vercel API token"
                data-testid="vercel-token-input"
              />
            </div>
          )}

          {result && (
            <div className={`publish-result ${result.success ? 'success' : 'error'}`} data-testid="publish-result">
              {result.success ? (
                <div>
                  <span className="success-icon">✓</span>
                  发布成功！
                  <a href={result.url} target="_blank" rel="noopener noreferrer" className="publish-url">
                    {result.url}
                  </a>
                </div>
              ) : (
                <div>
                  <span className="error-icon">✗</span>
                  {result.error}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="publish-footer">
          <button onClick={onClose} className="cancel-btn">取消</button>
          <button onClick={handlePublish} disabled={publishing} className="publish-btn" data-testid="publish-btn">
            {publishing ? '发布中...' : '发布'}
          </button>
        </div>
      </div>
    </div>
  );
}