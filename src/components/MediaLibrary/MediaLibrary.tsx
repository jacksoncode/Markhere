import { useState } from 'react';
import { useEditorState } from '../../store/editorStore';
import './MediaLibrary.css';

interface MediaItem {
  name: string;
  path: string;
  type: 'image' | 'video' | 'audio';
  size: number;
  createdAt: number;
}

export function MediaLibrary() {
  const { editorInstance } = useEditorState();
  const [media] = useState<MediaItem[]>([]);

  const insertMedia = (path: string) => {
    if (editorInstance) {
      editorInstance.chain().focus().setImage({ src: path }).run();
    }
  };

  return (
    <div className="media-library">
      <div className="media-header">
        <span>媒体库</span>
        <button className="import-btn">导入</button>
      </div>

      <div className="media-grid">
        {media.map((item) => (
          <div key={item.path} className="media-item" onClick={() => insertMedia(item.path)}>
            <div className="media-preview">
              {item.type === 'image' && (
                <img src={item.path} alt={item.name} />
              )}
            </div>
            <div className="media-info">
              <span className="media-name">{item.name}</span>
              <span className="media-size">{Math.round(item.size / 1024)}KB</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}