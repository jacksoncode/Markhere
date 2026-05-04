import { useState } from 'react';
import { useScriptStore, Script } from '../../store/scriptStore';
import './ScriptRunner.css';

export function ScriptRunner() {
  const { scripts, addScript, removeScript, executeScript } = useScriptStore();
  const [results, setResults] = useState<Map<string, string>>(new Map());

  const handleRun = async (name: string) => {
    try {
      const result = await executeScript(name);
      setResults((prev) => new Map(prev).set(name, result));
    } catch (e) {
      setResults((prev) => new Map(prev).set(name, `Error: ${e}`));
    }
  };

  return (
    <div className="script-runner">
      <div className="script-list">
        {scripts.map((script: Script) => (
          <div key={script.name} className="script-item">
            <div className="script-info">
              <span className="script-name">{script.name}</span>
              <span className="script-path">{script.path}</span>
            </div>
            <div className="script-actions">
              <button onClick={() => handleRun(script.name)}>运行</button>
              <button onClick={() => removeScript(script.name)}>删除</button>
            </div>
            {results.get(script.name) && (
              <div className="script-result">{results.get(script.name)}</div>
            )}
          </div>
        ))}
      </div>

      <button onClick={() => addScript({ name: 'New Script', path: '', args: [] })}>
        添加脚本
      </button>
    </div>
  );
}