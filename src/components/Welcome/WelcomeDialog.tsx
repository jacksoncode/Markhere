import { useState } from 'react';
import { documentTemplates, type DocumentTemplate } from '../../data/templates';
import './WelcomeDialog.css';

export function WelcomeDialog({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);

  const handlePick = async (tpl: DocumentTemplate) => {
    const { useEditorState } = await import('../../store/editorStore');
    useEditorState.getState().setContent(tpl.content);
    onClose();
  };

  const steps = [
    { title: 'Welcome to Markhere', body: 'A modern WYSIWYG Markdown editor. Write beautifully, export anywhere.' },
    { title: 'Quick Start', body: 'Markdown renders instantly as you type — no preview toggle needed.' },
    { title: 'Power Features', body: 'Database views, AI assistant, knowledge graph, templates, and more in the sidebar.' },
  ];

  return (
    <div className="welcome-overlay">
      <div className="welcome-dialog">
        <button className="welcome-close" onClick={onClose}>&times;</button>
        {step < 3 ? (
          <div className="welcome-step">
            <h1>{steps[step].title}</h1>
            <p>{steps[step].body}</p>
            <div className="welcome-actions">
              {step < 2 ? <button onClick={() => setStep(s => s + 1)}>Next</button> : <button onClick={() => setStep(4)}>Get Started</button>}
              {step > 0 && <button className="btn-secondary" onClick={() => setStep(s => s - 1)}>Back</button>}
            </div>
            <div className="welcome-dots">{steps.map((_, i) => <span key={i} className={`dot${i === step ? ' active' : ''}`} />)}</div>
          </div>
        ) : (
          <div className="welcome-templates">
            <h2>Choose a template</h2>
            <div className="tpl-grid">
              {documentTemplates.map(tpl => (
                <button key={tpl.id} className="tpl-card" onClick={() => handlePick(tpl)}>
                  <span className="tpl-icon">{tpl.icon}</span><span>{tpl.name}</span>
                </button>
              ))}
            </div>
            <button className="btn-secondary mt" onClick={onClose}>Start Blank</button>
          </div>
        )}
      </div>
    </div>
  );
}
