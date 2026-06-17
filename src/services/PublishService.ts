export interface PublishConfig {
  platform: 'github-pages' | 'netlify' | 'vercel';
  token?: string;
  repo?: string;
  branch?: string;
  domain?: string;
}

export interface PublishResult {
  success: boolean;
  url?: string;
  error?: string;
}

export class PublishService {
  async publishToGitHubPages(content: string, config: PublishConfig): Promise<PublishResult> {
    if (!config.token || !config.repo) {
      return { success: false, error: 'Missing GitHub token or repo' };
    }

    try {
      const html = this.convertToHtml(content);
      const filename = 'index.html';
      
      const repoParts = config.repo.split('/');
      const owner = repoParts[0];
      const repoName = repoParts[1];
      
      const url = `https://api.github.com/repos/${owner}/${repoName}/contents/${filename}`;
      
      const existingFile = await fetch(url, {
        headers: { Authorization: `token ${config.token}` },
      });
      
      const sha = existingFile.ok ? (await existingFile.json()).sha : null;
      
      const body = {
        message: 'Publish from Markhere',
        content: btoa(unescape(encodeURIComponent(html))),
        branch: config.branch || 'main',
        ...(sha ? { sha } : {}),
      };
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `token ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.message || 'Failed to publish' };
      }
      
      return {
        success: true,
        url: `https://${owner}.github.io/${repoName}/`,
      };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  async publishToNetlify(content: string, config: PublishConfig): Promise<PublishResult> {
    if (!config.token) {
      return { success: false, error: 'Missing Netlify token' };
    }

    try {
      const html = this.convertToHtml(content);
      
      const formData = new FormData();
      formData.append('file', new Blob([html], { type: 'text/html' }), 'index.html');
      
      const response = await fetch('https://api.netlify.com/api/v1/sites', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.token}` },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.message || 'Failed to publish' };
      }
      
      const data = await response.json();
      return {
        success: true,
        url: data.ssl_url || data.url,
      };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  async publishToVercel(content: string, config: PublishConfig): Promise<PublishResult> {
    if (!config.token) {
      return { success: false, error: 'Missing Vercel token' };
    }

    try {
      const html = this.convertToHtml(content);
      
      const files = [
        {
          file: 'index.html',
          data: html,
        },
      ];
      
      const response = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files,
          projectSettings: {
            framework: null,
          },
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.message || 'Failed to publish' };
      }
      
      const data = await response.json();
      return {
        success: true,
        url: `https://${data.url}`,
      };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  convertToHtml(markdown: string): string {
    const title = this.extractTitle(markdown);
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.6;
      color: #333;
    }
    h1, h2, h3 { margin-top: 1.5em; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; }
    pre { background: #f4f4f4; padding: 16px; border-radius: 8px; overflow-x: auto; }
    img { max-width: 100%; }
    a { color: #0366d6; }
  </style>
</head>
<body>
${markdown}
</body>
</html>`;
  }

  extractTitle(content: string): string {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1] : 'Markhere Document';
  }
}