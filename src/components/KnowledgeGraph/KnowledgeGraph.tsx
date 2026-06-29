import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { useTranslation } from '../../i18n';
import { useWikiLinkStore } from '../../store/wikiLinkStore';
import './KnowledgeGraph.css';

interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  connections: number;
}

interface KnowledgeGraphProps {
  isOpen: boolean;
  onClose: () => void;
  onNodeClick: (nodeId: string) => void;
}

export function KnowledgeGraph({ isOpen, onClose, onNodeClick }: KnowledgeGraphProps) {
  const { t } = useTranslation();
  const { links } = useWikiLinkStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<GraphNode[]>([]);
  const animationIdRef = useRef<number>(0);
  const dragRef = useRef<{ nodeId: string | null; offsetX: number; offsetY: number }>({ nodeId: null, offsetX: 0, offsetY: 0 });
  const panRef = useRef({ x: 0, y: 0, isPanning: false, startX: 0, startY: 0 });
  const zoomRef = useRef(1);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 500 });

  const nodes = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();

    links.forEach((link) => {
      if (!nodeMap.has(link.source)) {
        nodeMap.set(link.source, {
          id: link.source,
          label: link.source.split('/').pop() || link.source,
          x: Math.random() * 600 + 100,
          y: Math.random() * 400 + 100,
          vx: 0,
          vy: 0,
          connections: 0,
        });
      }
      if (!nodeMap.has(link.target)) {
        nodeMap.set(link.target, {
          id: link.target,
          label: link.target.split('/').pop() || link.target,
          x: Math.random() * 600 + 100,
          y: Math.random() * 400 + 100,
          vx: 0,
          vy: 0,
          connections: 0,
        });
      }

      nodeMap.get(link.source)!.connections++;
      nodeMap.get(link.target)!.connections++;
    });

    return Array.from(nodeMap.values());
  }, [links]);

  const edges = useMemo(() => {
    return links.map((link) => ({
      source: link.source,
      target: link.target,
    }));
  }, [links]);

  const filteredNodeIds = useMemo(() => {
    if (!filterQuery) return null; // null means show all
    const lowerQuery = filterQuery.toLowerCase();
    return new Set(nodes.filter((n) => n.label.toLowerCase().includes(lowerQuery)).map(n => n.id));
  }, [nodes, filterQuery]);

  // Responsive sizing via ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Find node at world coordinates
  const findNodeAt = useCallback((wx: number, wy: number) => {
    const sim = simulationRef.current;
    return sim.find((node) => {
      const radius = Math.max(10, 10 + node.connections * 2);
      const dx = wx - node.x;
      const dy = wy - node.y;
      return Math.sqrt(dx * dx + dy * dy) < radius + 5;
    }) || null;
  }, []);

  // Simulation loop
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Copy nodes into simulation ref, preserving positions from previous sim if available
    const prevSim = simulationRef.current;
    const simNodes = nodes.map((n) => {
      const prev = prevSim.find(p => p.id === n.id);
      return {
        ...n,
        x: prev ? prev.x : n.x,
        y: prev ? prev.y : n.y,
        vx: prev ? prev.vx : 0,
        vy: prev ? prev.vy : 0,
      };
    });
    simulationRef.current = simNodes;

    const simulateStep = () => {
      const pan = panRef.current;
      const zoom = zoomRef.current;

      simNodes.forEach((node) => {
        // Skip simulation for the node being dragged
        if (dragRef.current.nodeId === node.id) return;

        node.vx *= 0.95;
        node.vy *= 0.95;

        // Spring force toward connected nodes
        edges.forEach((edge) => {
          if (edge.source === node.id || edge.target === node.id) {
            const otherId = edge.source === node.id ? edge.target : edge.source;
            const other = simNodes.find((n) => n.id === otherId);
            if (other) {
              const dx = other.x - node.x;
              const dy = other.y - node.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
              // Convert world-space desired distance to screen-space (inverse zoom)
              const desiredDist = 150 / zoom;
              const force = (dist - desiredDist) * 0.01 * zoom;

              node.vx += (dx / dist) * force;
              node.vy += (dy / dist) * force;
            }
          }
        });

        // Repulsion from all other nodes
        simNodes.forEach((other) => {
          if (other.id === node.id) return;
          if (dragRef.current.nodeId === other.id) return;

          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
          const minDist = 80 / zoom;

          const force = Math.max(0, (minDist - dist) / minDist) * 50 * zoom;
          node.vx -= (dx / dist) * force;
          node.vy -= (dy / dist) * force;
        });

        // Center gravity (weakly pull toward center to prevent drift)
        const cx = (width / 2 - pan.x);
        const cy = (height / 2 - pan.y);
        node.vx += (cx - node.x) * 0.001 * zoom;
        node.vy += (cy - node.y) * 0.001 * zoom;

        node.x += node.vx;
        node.y += node.vy;
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const pan = panRef.current;
      const zoom = zoomRef.current;

      ctx.save();
      ctx.translate(pan.x * zoom, pan.y * zoom);
      ctx.scale(zoom, zoom);

      // Determine which nodes to highlight based on hover
      const highlightedIds = new Set<string>();
      if (hoveredNode) {
        highlightedIds.add(hoveredNode);
        edges.forEach((edge) => {
          if (edge.source === hoveredNode) highlightedIds.add(edge.target);
          if (edge.target === hoveredNode) highlightedIds.add(edge.source);
        });
      }

      // Draw edges
      edges.forEach((edge) => {
        const source = simNodes.find((n) => n.id === edge.source);
        const target = simNodes.find((n) => n.id === edge.target);
        if (!source || !target) return;

        const isHighlighted = hoveredNode && (highlightedIds.has(edge.source) && highlightedIds.has(edge.target));

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);

        if (isHighlighted) {
          ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
          ctx.lineWidth = 2.5 / zoom;
        } else if (hoveredNode && (edge.source === hoveredNode || edge.target === hoveredNode)) {
          ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
          ctx.lineWidth = 2 / zoom;
        } else {
          ctx.strokeStyle = 'rgba(150, 150, 180, 0.25)';
          ctx.lineWidth = 1 / zoom;
        }
        ctx.stroke();
      });

      // Draw nodes
      simNodes.forEach((node) => {
        // Skip filtered-out nodes
        if (filteredNodeIds && !filteredNodeIds.has(node.id)) return;

        const isHovered = hoveredNode === node.id;
        const isSelected = selectedNode === node.id;
        const isConnected = hoveredNode && highlightedIds.has(node.id) && node.id !== hoveredNode;
        const radius = Math.max(10, 10 + node.connections * 2);

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);

        if (isSelected) {
          ctx.fillStyle = '#ff6b6b';
          ctx.strokeStyle = '#ff4444';
          ctx.lineWidth = 3 / zoom;
          ctx.stroke();
        } else if (isHovered) {
          ctx.fillStyle = '#4ecdc4';
          ctx.strokeStyle = '#36b5ad';
          ctx.lineWidth = 3 / zoom;
          ctx.stroke();
        } else if (isConnected) {
          ctx.fillStyle = '#6dc6e8';
        } else {
          const intensity = Math.min(255, 100 + node.connections * 20);
          ctx.fillStyle = `rgb(${intensity}, ${intensity}, 255)`;
        }

        ctx.fill();

        // Label
        ctx.font = `${Math.max(11, 13)}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = '#555';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + radius + 15);
      });

      ctx.restore();
    };

    let iterations = 0;
    const animate = () => {
      if (iterations < 120) {
        simulateStep();
        iterations++;
      }
      draw();
      animationIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationIdRef.current);
    };
  }, [nodes, edges, hoveredNode, selectedNode, filteredNodeIds, canvasSize]);

  // ---- Pointer-based interaction handlers (unified mouse + touch) ----

  const getCanvasPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, wx: 0, wy: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    const zoom = zoomRef.current;
    const pan = panRef.current;
    return {
      x,
      y,
      wx: x / zoom - pan.x,
      wy: y / zoom - pan.y,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const { wx, wy } = getCanvasPoint(e.clientX, e.clientY);
    const node = findNodeAt(wx, wy);

    if (node) {
      // Start dragging a node
      dragRef.current = { nodeId: node.id, offsetX: wx - node.x, offsetY: wy - node.y };
      setSelectedNode(node.id);
    } else {
      // Start panning the canvas
      panRef.current.isPanning = true;
      panRef.current.startX = e.clientX;
      panRef.current.startY = e.clientY;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { wx, wy } = getCanvasPoint(e.clientX, e.clientY);

    if (dragRef.current.nodeId) {
      // Drag the node
      const sim = simulationRef.current;
      const node = sim.find(n => n.id === dragRef.current.nodeId);
      if (node) {
        node.x = wx - dragRef.current.offsetX;
        node.y = wy - dragRef.current.offsetY;
        // Reset velocity when dragged
        node.vx = 0;
        node.vy = 0;
      }
    } else if (panRef.current.isPanning) {
      // Pan the canvas
      panRef.current.x += (e.clientX - panRef.current.startX) * 0.5 / zoomRef.current;
      panRef.current.y += (e.clientY - panRef.current.startY) * 0.5 / zoomRef.current;
      panRef.current.startX = e.clientX;
      panRef.current.startY = e.clientY;
    } else {
      // Hover detection
      const node = findNodeAt(wx, wy);
      setHoveredNode(node?.id || null);
    }
  };

  const handlePointerUp = (_e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current.nodeId) {
      // If node was barely moved, treat as click
      dragRef.current.nodeId = null;
    }
    if (panRef.current.isPanning) {
      panRef.current.isPanning = false;
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoom = zoomRef.current;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.2, Math.min(5, zoom * delta));

    // Zoom toward mouse position
    const { x, y } = getCanvasPoint(e.clientX, e.clientY);
    const worldX = x / zoom - panRef.current.x;
    const worldY = y / zoom - panRef.current.y;

    panRef.current.x = x / newZoom - worldX;
    panRef.current.y = y / newZoom - worldY;
    zoomRef.current = newZoom;
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { wx, wy } = getCanvasPoint(e.clientX, e.clientY);
    const node = findNodeAt(wx, wy);
    if (node) {
      onNodeClick(node.id);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Clicks are handled via pointer up; double-click handled separately.
    // If pointer up didn't detect drag, fire node selection.
    const { wx, wy } = getCanvasPoint(e.clientX, e.clientY);
    const node = findNodeAt(wx, wy);
    if (node) {
      setSelectedNode(node.id);
      onNodeClick(node.id);
    }
  };

  const resetZoom = () => {
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0, isPanning: false, startX: 0, startY: 0 };
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      // Reset zoom/pan when opening
      resetZoom();
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="knowledge-graph-overlay" onClick={onClose}>
      <div className="knowledge-graph-panel" onClick={(e) => e.stopPropagation()}>
        <div className="graph-header">
          <h2>{t('knowledgeGraph.title')}</h2>
          <div className="graph-controls">
            <input
              type="text"
              className="graph-filter"
              placeholder={t('knowledgeGraph.filter')}
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              aria-label="Filter nodes"
            />
            <button className="graph-reset" onClick={resetZoom} title="Reset zoom/pan" aria-label="Reset zoom and pan">
              ↺
            </button>
            <button className="graph-close" onClick={onClose} aria-label="Close knowledge graph">×</button>
          </div>
        </div>

        <div className="graph-content">
          {nodes.length === 0 ? (
            <div className="graph-empty">
              <p>{t('knowledgeGraph.empty')}</p>
              <p className="graph-hint">{t('knowledgeGraph.hint')}</p>
            </div>
          ) : (
            <div ref={containerRef} className="graph-canvas-container">
              <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className="graph-canvas"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
                onWheel={handleWheel}
                aria-label="Knowledge graph canvas. Drag nodes, scroll to zoom, drag background to pan."
              />
            </div>
          )}
        </div>

        <div className="graph-footer">
          <span className="graph-stats">
            {t('knowledgeGraph.nodes')}: {nodes.length} |
            {t('knowledgeGraph.links')}: {edges.length}
          </span>
          {selectedNode && (
            <span className="graph-selected">
              {t('knowledgeGraph.selected')}: {nodes.find((n) => n.id === selectedNode)?.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}