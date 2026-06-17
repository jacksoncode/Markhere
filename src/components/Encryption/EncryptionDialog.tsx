import { useState, useEffect } from 'react';
import { EncryptionService, EncryptedNote } from '../../services/EncryptionService';
import './EncryptionDialog.css';

interface EncryptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EncryptionDialog({ isOpen, onClose }: EncryptionDialogProps) {
  const [mode, setMode] = useState<'create' | 'unlock'>('create');
  const [notes, setNotes] = useState<EncryptedNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<EncryptedNote | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [password, setPassword] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [decryptedContent, setDecryptedContent] = useState('');
  const [error, setError] = useState('');
  
  const encryptionService = new EncryptionService();

  useEffect(() => {
    if (isOpen) {
      setNotes(encryptionService.loadNotes());
    }
  }, [isOpen]);

  const handleCreate = async () => {
    if (!title || !content || !password) {
      setError('请填写所有字段');
      return;
    }

    try {
      const note = await encryptionService.createNote(title, content, password);
      const updatedNotes = [...notes, note];
      encryptionService.saveNotes(updatedNotes);
      setNotes(updatedNotes);
      setTitle('');
      setContent('');
      setPassword('');
      setError('');
    } catch (e) {
      setError('创建失败');
    }
  };

  const handleUnlock = async () => {
    if (!selectedNote || !unlockPassword) {
      setError('请选择笔记并输入密码');
      return;
    }

    try {
      const decrypted = await encryptionService.unlockNote(selectedNote, unlockPassword);
      setDecryptedContent(decrypted);
      setError('');
    } catch (e) {
      setError('密码错误或解密失败');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="encryption-dialog-overlay" data-testid="encryption-dialog">
      <div className="encryption-dialog" data-testid="encryption-dialog-content">
        <div className="encryption-header">
          <h2>加密笔记</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="encryption-body">
          <div className="mode-select">
            <label>模式</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as any)} data-testid="encrypt-mode">
              <option value="create">创建新笔记</option>
              <option value="unlock">解锁笔记</option>
            </select>
          </div>

          {mode === 'create' && (
            <>
              <div className="field">
                <label>标题</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="笔记标题"
                  data-testid="note-title"
                />
              </div>
              <div className="field">
                <label>内容</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="笔记内容"
                  data-testid="note-content"
                />
              </div>
              <div className="field">
                <label>密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码"
                  data-testid="note-password"
                />
              </div>
              <button onClick={handleCreate} className="create-btn" data-testid="save-encrypted">
                创建加密笔记
              </button>
            </>
          )}

          {mode === 'unlock' && (
            <>
              <div className="notes-list">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className={`note-item ${selectedNote?.id === note.id ? 'selected' : ''}`}
                    onClick={() => setSelectedNote(note)}
                    data-testid="encrypted-note-item"
                  >
                    {note.title}
                  </div>
                ))}
              </div>
              <div className="field">
                <label>解锁密码</label>
                <input
                  type="password"
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  placeholder="输入密码解锁"
                  data-testid="unlock-password"
                />
              </div>
              <button onClick={handleUnlock} className="unlock-btn" data-testid="unlock-btn">
                解锁
              </button>
              {decryptedContent && (
                <div className="decrypted-content" data-testid="decrypted-content">
                  {decryptedContent}
                </div>
              )}
            </>
          )}

          {error && <div className="error-message" data-testid="encrypt-error">{error}</div>}
        </div>

        <div className="encryption-footer">
          <button onClick={onClose} className="cancel-btn">关闭</button>
        </div>
      </div>
    </div>
  );
}