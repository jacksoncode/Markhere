import { NodeViewProps } from '@tiptap/react';
import { useState, useRef, useCallback } from 'react';
import './ResizableImage.css';

export function ResizableImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const { src, alt, title, width, height } = node.attrs;
  const [isResizing, setIsResizing] = useState(false);
  const [showHandles, setShowHandles] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const startWidth = useRef(0);
  const startHeight = useRef(0);

  const aspectRatio = useRef(1);

  const onMouseDown = useCallback(
    (e: React.MouseEvent, direction: string) => {
      e.preventDefault();
      e.stopPropagation();

      if (!imgRef.current) return;

      const rect = imgRef.current.getBoundingClientRect();
      aspectRatio.current = rect.width / rect.height;

      startX.current = e.clientX;
      startY.current = e.clientY;
      startWidth.current = width || rect.width;
      startHeight.current = height || rect.height;

      setIsResizing(true);

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX.current;
        const deltaY = moveEvent.clientY - startY.current;

        let newWidth = startWidth.current;
        let newHeight = startHeight.current;

        if (direction.includes('e')) {
          newWidth = Math.max(50, startWidth.current + deltaX);
          newHeight = Math.round(newWidth / aspectRatio.current);
        }
        if (direction.includes('w')) {
          newWidth = Math.max(50, startWidth.current - deltaX);
          newHeight = Math.round(newWidth / aspectRatio.current);
        }
        if (direction.includes('s')) {
          newHeight = Math.max(50, startHeight.current + deltaY);
          newWidth = Math.round(newHeight * aspectRatio.current);
        }
        if (direction.includes('n')) {
          newHeight = Math.max(50, startHeight.current - deltaY);
          newWidth = Math.round(newHeight * aspectRatio.current);
        }

        updateAttributes({ width: newWidth, height: newHeight });
      };

      const onMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [width, height, updateAttributes]
  );

  if (!src) {
    return (
      <div className="image-placeholder">
        <span>No image source</span>
      </div>
    );
  }

  return (
    <div
      className={`resizable-image-wrapper ${selected ? 'selected' : ''} ${isResizing ? 'resizing' : ''}`}
      onMouseEnter={() => setShowHandles(true)}
      onMouseLeave={() => !isResizing && setShowHandles(false)}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt || ''}
        title={title || ''}
        className="resizable-image"
        style={{ width: width ? `${width}px` : 'auto', height: height ? `${height}px` : 'auto' }}
        draggable={false}
        loading="lazy"
        decoding="async"
      />

      {showHandles && (
        <>
          <div className="resize-handle nw" onMouseDown={(e) => onMouseDown(e, 'nw')} />
          <div className="resize-handle ne" onMouseDown={(e) => onMouseDown(e, 'ne')} />
          <div className="resize-handle sw" onMouseDown={(e) => onMouseDown(e, 'sw')} />
          <div className="resize-handle se" onMouseDown={(e) => onMouseDown(e, 'se')} />
        </>
      )}

      {width && (
        <div className="image-size-label">
          {width}×{height || Math.round(width / aspectRatio.current)}
        </div>
      )}
    </div>
  );
}