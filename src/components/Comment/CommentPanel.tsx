import { useState, useEffect } from 'react';
import { CommentService, CommentThread, CommentReply } from '../../services/CommentService';
import './CommentPanel.css';

interface CommentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  commentService: CommentService | null;
  onAddComment: (text: string) => void;
  onResolveComment: (threadId: string) => void;
  onDeleteComment: (threadId: string) => void;
}

export function CommentPanel({
  isOpen,
  onClose,
  commentService,
  onAddComment,
  onResolveComment,
  onDeleteComment,
}: CommentPanelProps) {
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [author] = useState('Anonymous');

  useEffect(() => {
    if (commentService) {
      setThreads(commentService.getThreads());
    }
  }, [commentService, isOpen]);

  const handleAddComment = () => {
    if (newCommentText.trim()) {
      onAddComment(newCommentText.trim());
      setNewCommentText('');
      if (commentService) {
        setThreads(commentService.getThreads());
      }
    }
  };

  const handleAddReply = (threadId: string) => {
    if (replyText.trim() && commentService) {
      commentService.addReply(threadId, replyText.trim(), author);
      setReplyText('');
      setThreads(commentService.getThreads());
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="comment-panel" data-testid="comment-panel">
      <div className="comment-panel-header" data-testid="comment-header">
        <h3>评论 ({threads.filter(t => !t.resolved).length})</h3>
        <button onClick={onClose} className="close-btn">×</button>
      </div>

      <div className="comment-input-section">
        <textarea
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder="添加评论..."
          className="comment-input"
          data-testid="comment-input"
        />
        <button onClick={handleAddComment} className="add-comment-btn" data-testid="submit-comment">添加</button>
      </div>

      <div className="comment-list">
        {threads.length === 0 && (
          <div className="no-comments">暂无评论</div>
        )}

        {threads.map((thread) => (
          <div key={thread.id} className={`comment-thread ${thread.resolved ? 'resolved' : ''}`} data-testid="comment-thread">
            <div className="comment-header">
              <span className="comment-author">{thread.comments[0].author}</span>
              <span className="comment-time">{formatTime(thread.comments[0].createdAt)}</span>
            </div>
            
            <div className="comment-text">{thread.comments[0].text}</div>

            {thread.comments[0].replies && thread.comments[0].replies.length > 0 && (
              <div className="replies-section">
                {thread.comments[0].replies.map((reply: CommentReply) => (
                  <div key={reply.id} className="reply">
                    <span className="reply-author">{reply.author}</span>
                    <span className="reply-time">{formatTime(reply.createdAt)}</span>
                    <div className="reply-text">{reply.text}</div>
                  </div>
                ))}
              </div>
            )}

            {activeThreadId === thread.id && (
              <div className="reply-input">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="回复..."
                  className="reply-input-field"
                />
                <button onClick={() => handleAddReply(thread.id)} className="reply-btn">回复</button>
              </div>
            )}

            <div className="comment-actions">
              {!thread.resolved && (
                <button onClick={() => onResolveComment(thread.id)} className="resolve-btn" data-testid="resolve-btn">
                  ✓ 解决
                </button>
              )}
              <button onClick={() => setActiveThreadId(activeThreadId === thread.id ? null : thread.id)} className="reply-toggle-btn" data-testid="add-comment-btn">
                {activeThreadId === thread.id ? '取消' : '回复'}
              </button>
              <button onClick={() => onDeleteComment(thread.id)} className="delete-btn" data-testid="delete-btn">
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}