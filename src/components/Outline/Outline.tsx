import { useState } from 'react';
import { useEditorState } from '../../store/editorStore';
import './Outline.css';

interface OutlineItem {
  id: string;
  level: number;
  text: string;
  position: number;
}

export function Outline() {
  const { editorInstance } = useEditorState();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (!editorInstance) {
    return <div className="outline-empty">加载中...</div>;
  }

  const content = editorInstance.getHTML();
  const outline = extractOutline(content);

  const scrollToHeading = (position: number) => {
    editorInstance.commands.setTextSelection(position);
    editorInstance.commands.focus();
  };

  const insertTOC = () => {
    const tocMarkdown = generateTOC(outline);
    editorInstance.chain().focus().insertContentAt(0, tocMarkdown).run();
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const reorderedOutline = [...outline];
    const [movedItem] = reorderedOutline.splice(draggedIndex, 1);
    reorderedOutline.splice(targetIndex, 0, movedItem);

    reorderDocumentContent(outline, reorderedOutline, editorInstance);

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  if (outline.length === 0) {
    return (
      <div className="outline-container">
        <div className="outline-header">文档大纲</div>
        <div className="outline-empty">无大纲</div>
      </div>
    );
  }

  return (
    <div className="outline-container">
      <div className="outline-header">
        <span>文档大纲</span>
        <button className="outline-insert-btn" onClick={insertTOC} title="插入目录">
          插入
        </button>
      </div>
      <ul className="outline-list">
        {outline.map((item, index) => (
          <li
            key={item.id}
            className={`outline-item level-${item.level} ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
            onClick={() => scrollToHeading(item.position)}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
          >
            <span className="drag-handle">⋮⋮</span>
            <span className="outline-text">{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function reorderDocumentContent(
  originalOutline: OutlineItem[],
  reorderedOutline: OutlineItem[],
  editor: any
) {
  const markdown = (editor.storage as any)?.markdown?.getMarkdown?.() || '';
  const lines = markdown.split('\n');

  const headingRegex = /^#+\s+.+$/;
  const headingLines: { index: number; line: string; level: number }[] = [];

  lines.forEach((line: string, index: number) => {
    if (headingRegex.test(line)) {
      const level = line.match(/^#+/)?.[0]?.length || 1;
      headingLines.push({ index, line, level });
    }
  });

  const reorderedLines = [...lines];
  const movedHeading = headingLines[originalOutline.findIndex((o) => o.id === reorderedOutline[0].id)];

  if (movedHeading) {
    const targetHeading = headingLines[headingLines.findIndex((h) => 
      reorderedOutline.some((o) => o.text === h.line.replace(/^#+\s+/, '').trim())
    )];

    if (targetHeading && movedHeading.index !== targetHeading.index) {
      const [removed] = reorderedLines.splice(movedHeading.index, 1);
      reorderedLines.splice(targetHeading.index, 0, removed);
    }
  }

  editor.commands.setContent(reorderedLines.join('\n'));
}

function extractOutline(html: string): OutlineItem[] {
  const outline: OutlineItem[] = [];
  const regex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1]);
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    const position = match.index;
    const id = `h_${position}_${text.replace(/\s+/g, '_')}`;

    outline.push({ id, level, text, position });
  }

  return outline;
}

function generateTOC(outline: OutlineItem[]): string {
  if (outline.length === 0) return '';

  const lines: string[] = ['## 目录', '\n'];

  for (const item of outline) {
    const indent = '  '.repeat(item.level - 1);
    const link = `[${item.text}](#${item.text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')})`;
    lines.push(`${indent}- ${link}`);
  }

  lines.push('\n---\n');
  return lines.join('\n');
}