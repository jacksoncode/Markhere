import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditorState } from '../../store/editorStore';
import { SlideshowController, formatTime } from '../../services/SlideshowService';
import './SlideshowView.css';

interface SlideshowViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SlideshowView({ isOpen, onClose }: SlideshowViewProps) {
  const { editorInstance } = useEditorState();
  const [controller, setController] = useState<SlideshowController | null>(null);
  const [currentSlide, setCurrentSlide] = useState<string>('');
  const [slideIndex, setSlideIndex] = useState(0);
  const [totalSlides, setTotalSlides] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && editorInstance) {
      const content = editorInstance.getText();
      const ctrl = new SlideshowController(content);
      ctrl.start();
      setController(ctrl);
      setSlideIndex(ctrl.currentIndexValue);
      setTotalSlides(ctrl.totalSlides);
      setCurrentSlide(ctrl.currentSlide?.content || '');
      
      timerRef.current = window.setInterval(() => {
        setElapsedTime(ctrl.elapsedTime);
      }, 1000);
    } else {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setController(null);
    }

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [isOpen, editorInstance]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrevious();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, controller]);

  const goNext = useCallback(() => {
    if (controller) {
      controller.next();
      setSlideIndex(controller.currentIndexValue);
      setCurrentSlide(controller.currentSlide?.content || '');
    }
  }, [controller]);

  const goPrevious = useCallback(() => {
    if (controller) {
      controller.previous();
      setSlideIndex(controller.currentIndexValue);
      setCurrentSlide(controller.currentSlide?.content || '');
    }
  }, [controller]);

  const goToSlide = useCallback((index: number) => {
    if (controller) {
      controller.goTo(index);
      setSlideIndex(controller.currentIndexValue);
      setCurrentSlide(controller.currentSlide?.content || '');
    }
  }, [controller]);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        if (clickX < width / 3) {
          goPrevious();
        } else if (clickX > width * 2 / 3) {
          goNext();
        }
      }
    }
  }, [goNext, goPrevious]);

  if (!isOpen) return null;

  return (
    <div className="slideshow-overlay" role="dialog" aria-modal="true" aria-label="Presentation mode" data-testid="slideshow-view">
      <div className="slideshow-container" ref={containerRef} onClick={handleContainerClick}>
        <div className="slideshow-content">
          <div className="slide-preview" data-testid="slide-preview">
            {currentSlide}
          </div>
        </div>

        <div className="slideshow-controls" data-testid="slideshow-controls">
          <button className="control-btn slideshow-prev" onClick={goPrevious} aria-label="Previous slide" data-testid="slideshow-prev">
            ←
          </button>
          
          <div className="slide-info">
            <span className="slide-counter" data-testid="slide-counter">{slideIndex + 1} / {totalSlides}</span>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((slideIndex + 1) / totalSlides) * 100}%` }}
              />
            </div>
            <span className="elapsed-time">{formatTime(elapsedTime)}</span>
          </div>
          
          <button className="control-btn slideshow-next" onClick={goNext} aria-label="Next slide" data-testid="slideshow-next">
            →
          </button>
          
          <button className="exit-btn" onClick={onClose} aria-label="Exit presentation" data-testid="slideshow-exit">
            Exit
          </button>
        </div>

        <div className="slide-thumbnails">
          {Array.from({ length: totalSlides }, (_, i) => (
            <button
              key={i}
              className={`thumbnail ${i === slideIndex ? 'active' : ''}`}
              onClick={() => goToSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}