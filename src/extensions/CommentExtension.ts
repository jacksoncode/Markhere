import { Mark } from '@tiptap/core';
import { CommentService } from '../services/CommentService';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comment: {
      addComment: (from: number, to: number, text: string, author: string) => ReturnType;
      resolveComment: (threadId: string) => ReturnType;
      deleteComment: (threadId: string) => ReturnType;
    };
  }
}

export interface CommentMarkOptions {
  HTMLAttributes: Record<string, string>;
  commentService: CommentService | null;
}

export const CommentMark = Mark.create<CommentMarkOptions>({
  name: 'comment',

  addOptions() {
    return {
      HTMLAttributes: {},
      commentService: null,
    };
  },

  addAttributes() {
    return {
      threadId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-comment-thread-id'),
        renderHTML: (attrs) => {
          if (!attrs.threadId) return {};
          return {
            'data-comment-thread-id': attrs.threadId,
          };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-comment-thread-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', {
      ...this.options.HTMLAttributes,
      ...HTMLAttributes,
      class: 'comment-mark',
    }, 0];
  },

  addCommands() {
    return {
      addComment: (from, to, text, author) => ({ editor }) => {
        const service = this.options.commentService;
        if (!service) return false;

        const thread = service.addThread(from, to, text, author);
        
        editor.chain().focus().setTextSelection({ from, to }).setMark('comment', { threadId: thread.id }).run();
        
        return true;
      },
      resolveComment: (threadId) => ({ editor }) => {
        const service = this.options.commentService;
        if (!service) return false;

        service.resolveThread(threadId);
        
        editor.view.dom.querySelectorAll(`[data-comment-thread-id="${threadId}"]`).forEach((el) => {
          el.classList.add('comment-resolved');
        });
        
        return true;
      },
      deleteComment: (threadId) => ({ editor }) => {
        const service = this.options.commentService;
        if (!service) return false;

        service.deleteThread(threadId);
        
        editor.chain().focus().unsetMark('comment').run();
        
        return true;
      },
    };
  },
});

export function createCommentExtension(commentService: CommentService) {
  return CommentMark.configure({ commentService });
}