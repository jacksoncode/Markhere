import { useEffect, useRef, useMemo, useState } from 'react';
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
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  
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
  
  const filteredNodes = useMemo(() => {
    if (!filterQuery) return nodes;
    const lowerQuery = filterQuery.toLowerCase();
    return nodes.filter((n) => n.label.toLowerCase().includes(lowerQuery));
  }, [nodes, filterQuery]);
  
  useEffect(() => {
    if (!canvasRef.current || filteredNodes.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    const simulationNodes = [...nodes];
    
    const simulate = () => {
      simulationNodes.forEach((node) => {
        node.vx *= 0.95;
        node.vy *= 0.95;
        
        edges.forEach((edge) => {
          if (edge.source === node.id || edge.target === node.id) {
            const otherId = edge.source === node.id ? edge.target : edge.source;
            const other = simulationNodes.find((n) => n.id === otherId);
            if (other) {
              const dx = other.x - node.x;
              const dy = other.y - node.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const force = (dist - 150) * 0.01;
              
              node.vx += (dx / dist) * force;
              node.vy += (dy / dist) * force;
            }
          }
        });
        
        simulationNodes.forEach((other) => {
          if (other.id === node.id) return;
          
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 80) {
            const force = (80 - dist) * 0.05;
            node.vx -= (dx / dist) * force;
            node.vy -= (dy / dist) * force;
          }
        });
        
        node.x += node.vx;
        node.y += node.vy;
        
        node.x = Math.max(50, Math.min(width - 50, node.x));
        node.y = Math.max(50, Math.min(height - 50, node.y));
      });
    };
    
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      ctx.strokeStyle = 'rgba(100, 100, 255, 0.3)';
      ctx.lineWidth = 1;
      
      edges.forEach((edge) => {
        const source = simulationNodes.find((n) => n.id === edge.source);
        const target = simulationNodes.find((n) => n.id === edge.target);
        if (source && target) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
        }
      });
      
      simulationNodes.forEach((node) => {
        const isHovered = hoveredNode === node.id;
        const isSelected = selectedNode === node.id;
        const radius = Math.max(10, 10 + node.connections * 2);
        
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        
        if (isSelected) {
          ctx.fillStyle = '#ff6b6b';
        } else if (isHovered) {
          ctx.fillStyle = '#4ecdc4';
        } else {
          const intensity = Math.min(255, 100 + node.connections * 20);
          ctx.fillStyle = `rgb(${intensity}, ${intensity}, 255)`;
        }
        
        ctx.fill();
        
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + radius + 15);
      });
    };
    
    let iterations = 0;
    const animate = () => {
      if (iterations < 100) {
        simulate();
        iterations++;
      }
      draw();
      requestAnimationFrame(animate);
    };
    
    animate();
  }, [nodes, edges, hoveredNode, selectedNode]);
  
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const clickedNode = nodes.find((node) => {
      const radius = Math.max(10, 10 + node.connections * 2);
      const dx = x - node.x;
      const dy = y - node.y;
      return Math.sqrt(dx * dx + dy * dy) < radius + 5;
    });
    
    if (clickedNode) {
      setSelectedNode(clickedNode.id);
      onNodeClick(clickedNode.id);
    }
  };
  
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const hovered = nodes.find((node) => {
      const radius = Math.max(10, 10 + node.connections * 2);
      const dx = x - node.x;
      const dy = y - node.y;
      return Math.sqrt(dx * dx + dy * dy) < radius + 5;
    });
    
    setHoveredNode(hovered?.id || null);
  };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
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
            />
            <button className="graph-close" onClick={onClose}>×</button>
          </div>
        </div>
        
        <div className="graph-content">
          {nodes.length === 0 ? (
            <div className="graph-empty">
              <p>{t('knowledgeGraph.empty')}</p>
              <p className="graph-hint">{t('knowledgeGraph.hint')}</p>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              width={800}
              height={500}
              className="graph-canvas"
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
            />
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