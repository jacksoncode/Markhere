import { useState } from 'react';
import './MobileMenu.css';

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mobile-menu">
      <button onClick={() => setIsOpen(!isOpen)} className="mobile-trigger">
        ☰
      </button>

      {isOpen && (
        <div className="mobile-overlay" onClick={() => setIsOpen(false)}>
          <nav className="mobile-nav">
            <a href="#" onClick={() => setIsOpen(false)}>文件</a>
            <a href="#" onClick={() => setIsOpen(false)}>编辑</a>
            <a href="#" onClick={() => setIsOpen(false)}>视图</a>
            <a href="#" onClick={() => setIsOpen(false)}>导出</a>
            <a href="#" onClick={() => setIsOpen(false)}>设置</a>
          </nav>
        </div>
      )}
    </div>
  );
}