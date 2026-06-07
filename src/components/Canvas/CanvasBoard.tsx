import { useState, useRef, useCallback } from 'react';
import './CanvasBoard.css';

interface Card { id: string; x: number; y: number; text: string; color: string }
interface Connection { from: string; to: string }

let uid = 0;
const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export function CanvasBoard() {
  const [cards, setCards] = useState<Card[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const addCard = useCallback((x: number, y: number) => {
    const card: Card = { id: `c${++uid}`, x: x - pan.x, y: y - pan.y, text: '', color: COLORS[uid % COLORS.length] };
    setCards(cs => [...cs, card]);
  }, [pan]);

  const updateCard = (id: string, text: string) => {
    setCards(cs => cs.map(c => c.id === id ? { ...c, text } : c));
  };

  const deleteCard = (id: string) => {
    setCards(cs => cs.filter(c => c.id !== id));
    setConnections(conns => conns.filter(conn => conn.from !== id && conn.to !== id));
  };

  const startConnect = (id: string) => { setConnecting(id); };
  const finishConnect = (id: string) => {
    if (connecting && connecting !== id && !connections.some(c => (c.from === connecting && c.to === id) || (c.from === id && c.to === connecting))) {
      setConnections(cs => [...cs, { from: connecting, to: id }]);
    }
    setConnecting(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      if (e.shiftKey) { setPanning(true); setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); }
      else addCard(e.clientX, e.clientY);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    if (panning) { setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y }); }
    if (dragging) {
      const rect = svgRef.current.getBoundingClientRect();
      setCards(cs => cs.map(c => c.id === dragging.id ? { ...c, x: dragging.ox + (e.clientX - rect.left), y: dragging.oy + (e.clientY - rect.top) } : c));
    }
  };

  const handleMouseUp = () => { setPanning(false); setDragging(null); };
  const handleWheel = (e: React.WheelEvent) => { e.preventDefault(); setZoom(z => Math.max(0.3, Math.min(2, z - e.deltaY * 0.001))); };

  return (
    <div className="canvas-board">
      <div className="canvas-toolbar">
        <span>🎨 Canvas</span>
        <small>Click: add card | Shift+drag: pan | Scroll: zoom | Drag card: move | Click dot: connect</small>
        <button onClick={() => { setCards([]); setConnections([]); }}>Clear</button>
      </div>
      <svg ref={svgRef} className="canvas-svg"
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        viewBox={`${-pan.x} ${-pan.y} ${window.innerWidth / zoom} ${window.innerHeight / zoom}`}>
        <g transform={`scale(${zoom})`}>
          {/* Connections */}
          {connections.map((conn, i) => {
            const from = cards.find(c => c.id === conn.from), to = cards.find(c => c.id === conn.to);
            if (!from || !to) return null;
            return <line key={i} x1={from.x + 60} y1={from.y + 20} x2={to.x + 60} y2={to.y + 20} stroke="#999" strokeWidth="2" />;
          })}
          {/* Connecting preview */}
          {connecting && (() => {
            const c = cards.find(cd => cd.id === connecting); if (!c) return null;
            return <line x1={c.x + 60} y1={c.y + 20} x2={c.x + 200} y2={c.y + 20} stroke="var(--color-primary)" strokeWidth="2" strokeDasharray="6" />;
          })()}
          {/* Cards */}
          {cards.map(card => (
            <g key={card.id} transform={`translate(${card.x},${card.y})`}>
              <rect width="120" height="40" rx="6" fill={card.color} opacity="0.15" stroke={card.color} strokeWidth="1.5"
                onMouseDown={e => { if (e.ctrlKey) startConnect(card.id); else setDragging({ id: card.id, ox: e.clientX - card.x, oy: e.clientY - card.y }); }}
                style={{ cursor: 'grab' }} />
              <foreignObject x="4" y="4" width="112" height="32">
                <input value={card.text} onChange={e => updateCard(card.id, e.target.value)}
                  placeholder="Type..."
                  style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontFamily: 'inherit' }}
                  onClick={e => e.stopPropagation()} />
              </foreignObject>
              {/* Connection dots */}
              <circle cx="0" cy="20" r="4" fill={card.color} style={{ cursor: 'pointer' }} onMouseDown={e => { e.stopPropagation(); startConnect(card.id); }} />
              <circle cx="120" cy="20" r="4" fill={card.color} style={{ cursor: 'pointer' }} onMouseDown={e => { e.stopPropagation(); finishConnect(card.id); }} />
              <text x="124" y="16" style={{ fontSize: '10px', fill: '#999', cursor: 'pointer' }}
                onClick={() => deleteCard(card.id)}>×</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
