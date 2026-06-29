import { Node } from '@tiptap/core';
import { NodeViewWrapper, NodeViewProps, ReactNodeViewRenderer } from '@tiptap/react';
import React from 'react';
import { SyncBlockService } from '../services/SyncBlockService';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    syncBlock: {
      createSyncBlock: () => ReturnType;
      updateSyncBlock: (blockId: string, content: string) => ReturnType;
      deleteSyncBlock: (blockId: string) => ReturnType;
    };
  }
}

const SyncBlockView = ({ node, editor }: NodeViewProps) => {
  const blockId = node.attrs.blockId;
  const service = node.attrs.syncService as SyncBlockService | null;
  
  React.useEffect(() => {
    if (!service) return;
    
    const unsubscribe = service.onUpdate((updatedId) => {
      if (updatedId === blockId) {
        const block = service.getBlock(blockId);
        if (block) {
          editor.chain().focus().updateAttributes('syncBlock', { content: block.content }).run();
        }
      }
    });
    
    return unsubscribe;
  }, [service, blockId, editor]);

  return (
    <NodeViewWrapper className="sync-block-wrapper">
      <div className="sync-block-indicator" data-block-id={blockId}>
        <span className="sync-icon">↻</span>
      </div>
      <div className="sync-block-content">
        {typeof node.attrs.content === 'string' ? node.attrs.content : ''}
      </div>
    </NodeViewWrapper>
  );
};

export const SyncBlockNode = Node.create({
  name: 'syncBlock',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      syncService: null,
    };
  },

  addAttributes() {
    return {
      blockId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-sync-block-id'),
        renderHTML: (attrs) => {
          if (!attrs.blockId) return {};
          return {
            'data-sync-block-id': attrs.blockId,
          };
        },
      },
      content: {
        default: '',
        parseHTML: (el) => el.innerHTML,
        renderHTML: (attrs) => {
          return { innerHTML: attrs.content || '' };
        },
      },
      syncService: {
        default: null,
        rendered: false,
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-sync-block-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, class: 'sync-block' }, 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SyncBlockView);
  },

  addCommands() {
    return {
      createSyncBlock: () => ({ editor }) => {
        const service = this.options.syncService as SyncBlockService;
        if (!service) return false;

        const block = service.createBlock('');
        editor.chain().focus().insertContent({
          type: 'syncBlock',
          attrs: { blockId: block.id, content: '' },
        }).run();
        
        return true;
      },
      updateSyncBlock: (blockId, content) => () => {
        const service = this.options.syncService as SyncBlockService;
        if (!service) return false;

        service.updateBlock(blockId, content);
        
        return true;
      },
      deleteSyncBlock: (blockId) => () => {
        const service = this.options.syncService as SyncBlockService;
        if (!service) return false;

        service.deleteBlock(blockId);
        
        return true;
      },
    };
  },
});

export function createSyncBlockExtension(syncService: SyncBlockService) {
  return SyncBlockNode.configure({ syncService });
}