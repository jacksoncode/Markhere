import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { useWikiLinkStore } from '../../store/wikiLinkStore';

export interface WikiLinkNodeViewProps {
  node: {
    attrs: {
      target: string;
      display: string;
    };
  };
  extension: {
    options: {
      onLinkClick: (target: string) => void;
    };
  };
}

export function WikiLinkNodeView({ node, extension }: WikiLinkNodeViewProps) {
  const target = node.attrs.target;
  const { getBacklinks, getForwardlinks } = useWikiLinkStore();
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (extension.options.onLinkClick) {
      extension.options.onLinkClick(target);
    }
  };
  
  const backlinks = getBacklinks(target);
  const forwardlinks = getForwardlinks(target);
  const linkCount = backlinks.length + forwardlinks.length;
  
  return (
    <NodeViewWrapper className="wiki-link-wrapper">
      <a
        className="wiki-link"
        data-target={target}
        data-count={linkCount}
        onClick={handleClick}
        title={`链接到: ${target}\n反向链接: ${backlinks.length}\n正向链接: ${forwardlinks.length}`}
      >
        <NodeViewContent />
      </a>
      {linkCount > 0 && (
        <span className="wiki-link-count">{linkCount}</span>
      )}
    </NodeViewWrapper>
  );
}