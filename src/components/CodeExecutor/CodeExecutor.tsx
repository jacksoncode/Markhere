import { useState, useRef, useEffect } from 'react';
import './CodeExecutor.css';

interface CodeExecutorProps {
  code: string;
  language: string;
  onClose?: () => void;
}

export function CodeExecutor({ code, language, onClose }: CodeExecutorProps) {
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const supportedLanguages = ['javascript', 'js', 'typescript', 'ts', 'python', 'py'];

  const canExecute = supportedLanguages.includes(language.toLowerCase());

  const executeCode = async () => {
    if (!canExecute) {
      setError(`Execution not supported for language: ${language}`);
      return;
    }

    setIsRunning(true);
    setError(null);
    setOutput('');

    if (language.toLowerCase() === 'javascript' || language.toLowerCase() === 'js') {
      executeJavaScript(code);
    } else if (language.toLowerCase() === 'python' || language.toLowerCase() === 'py') {
      await executePython(code);
    } else if (language.toLowerCase() === 'typescript' || language.toLowerCase() === 'ts') {
      executeJavaScript(transpileTypeScript(code));
    }
  };

  const executeJavaScript = (codeToRun: string) => {
    try {
      const sandbox = iframeRef.current?.contentWindow;
      if (!sandbox) {
        setError('Sandbox not available');
        setIsRunning(false);
        return;
      }

      const wrappedCode = `
        try {
          const __output = [];
          const console = {
            log: (...args) => __output.push(args.map(a => JSON.stringify(a)).join(' ')),
            error: (...args) => __output.push('ERROR: ' + args.map(a => JSON.stringify(a)).join(' ')),
            warn: (...args) => __output.push('WARN: ' + args.map(a => JSON.stringify(a)).join(' ')),
          };
          ${codeToRun}
          window.parent.postMessage({ type: 'result', output: __output.join('\\n') }, '*');
        } catch (e) {
          window.parent.postMessage({ type: 'error', error: e.message }, '*');
        }
      `;

      const blob = new Blob([wrappedCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      
      sandbox.location.href = url;
    } catch (e) {
      setError(String(e));
      setIsRunning(false);
    }
  };

  const transpileTypeScript = (tsCode: string): string => {
    return tsCode
      .replace(/: \w+/g, '')
      .replace(/interface \w+ \{[^}]+\}/g, '')
      .replace(/type \w+ = /g, 'const ');
  };

  const executePython = async (pythonCode: string) => {
    setIsRunning(true);
    try {
      const pyodide = await loadPyodide();
      await pyodide.runPythonAsync(pythonCode);
      setOutput(pyodide.runPython('sys.stdout.getvalue()') || '');
    } catch (e) {
      setError(String(e));
    }
    setIsRunning(false);
  };

  const loadPyodide = async () => {
    if (!window.pyodide) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
      document.head.appendChild(script);
      await new Promise((resolve) => { script.onload = resolve; });
      if (window.loadPyodide) {
        window.pyodide = await window.loadPyodide();
        window.pyodide.runPython(`
          import sys
          from io import StringIO
          sys.stdout = StringIO()
          sys.stderr = StringIO()
        `);
      }
    }
    return window.pyodide;
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'result') {
        setOutput(event.data.output);
        setIsRunning(false);
      } else if (event.data.type === 'error') {
        setError(event.data.error);
        setIsRunning(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const clearOutput = () => {
    setOutput('');
    setError(null);
  };

  return (
    <div className="code-executor">
      <div className="code-executor-header">
        <span className="language-badge">{language}</span>
        <div className="executor-actions">
          {canExecute && (
            <button 
              className="run-btn" 
              onClick={executeCode}
              disabled={isRunning}
            >
              {isRunning ? 'Running...' : '▶ Run'}
            </button>
          )}
          <button className="clear-btn" onClick={clearOutput}>Clear</button>
          {onClose && <button className="close-btn" onClick={onClose}>×</button>}
        </div>
      </div>

      <div className="code-block">
        <pre><code>{code}</code></pre>
      </div>

      {!canExecute && (
        <div className="unsupported-message">
          Execution not supported for {language}. Supported: JavaScript, TypeScript, Python
        </div>
      )}

      <div className="output-panel">
        <div className="output-header">Output</div>
        {error && <div className="error-output">{error}</div>}
        {output && <pre className="output-content">{output}</pre>}
        {!output && !error && <div className="no-output">No output yet</div>}
      </div>

      <iframe 
        ref={iframeRef}
        className="sandbox-frame"
        sandbox="allow-scripts"
        src="about:blank"
      />
    </div>
  );
}

declare global {
  interface Window {
    pyodide?: any;
    loadPyodide?: () => Promise<any>;
  }
}