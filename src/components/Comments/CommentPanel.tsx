import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { CommentThread, CommentThreadData } from './CommentThread';
import { IconClose, IconComment } from './Icons';
import { useCommentInput } from './useCommentInput';

type FilterType = 'all' | 'open' | 'resolved';

interface CommentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  threads: CommentThreadData[];
  activeBlockId: string | null;
  activeBlockType: string | null;
  quotedText?: string | null;
  onClearQuote?: () => void;
  currentUserId: string;
  essayOwnerId: string;
  onAddComment: (blockId: string, blockType: string, text: string, parentId?: string) => void;
  onEditComment: (commentId: string, text: string) => void;
  onDeleteComment: (commentId: string) => void;
  onResolveThread: (rootCommentId: string, resolved: boolean) => void;
}

export function CommentPanel({
  isOpen,
  onClose,
  threads,
  activeBlockId,
  activeBlockType,
  quotedText,
  onClearQuote,
  currentUserId,
  essayOwnerId,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onResolveThread,
}: CommentPanelProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const commentInput = useCommentInput({
    onSubmit: (text) => {
      if (activeBlockId && activeBlockType) {
        const finalText = quotedText ? `> ${quotedText}\n\n${text}` : text;
        onAddComment(activeBlockId, activeBlockType, finalText);
        onClearQuote?.();
      }
    },
  });

  // Filter and sort threads
  const filteredThreads = threads.filter((thread) => {
    if (activeBlockId && thread.blockId !== activeBlockId) return false;
    if (filter === 'open') return !thread.resolved;
    if (filter === 'resolved') return thread.resolved;
    return true;
  });

  const sortedThreads = [...filteredThreads].sort((a, b) => {
    if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
    return b.rootComment.createdAt.getTime() - a.rootComment.createdAt.getTime();
  });

  const openCount = threads.filter((t) => !t.resolved).length;
  const resolvedCount = threads.filter((t) => t.resolved).length;

  // Close panel when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        if (!(event.target as HTMLElement).closest('.comment-indicator')) onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  useEffect(() => { setActiveThreadId(null); }, [activeBlockId]);

  if (!isOpen) return null;

  const filters: { type: FilterType; label: string; count: number }[] = [
    { type: 'all', label: 'All', count: threads.length },
    { type: 'open', label: 'Open', count: openCount },
    { type: 'resolved', label: 'Resolved', count: resolvedCount },
  ];

  return (
    <div className="comment-panel-overlay">
      <div ref={panelRef} className="comment-panel">
        <div className="comment-panel-header">
          <h2 className="comment-panel-title">
            Comments
            {activeBlockId && <span className="comment-panel-subtitle">on selected block</span>}
          </h2>
          <button className="comment-panel-close" onClick={onClose} title="Close">
            <IconClose />
          </button>
        </div>

        <div className="comment-panel-filters">
          {filters.map(({ type, label, count }) => (
            <button
              key={type}
              className={`comment-filter-btn ${filter === type ? 'comment-filter-active' : ''}`}
              onClick={() => setFilter(type)}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        <div className="comment-panel-content">
          {sortedThreads.length === 0 ? (
            <div className="comment-panel-empty">
              <IconComment size={32} strokeWidth={1.5} />
              <p>{activeBlockId ? 'No comments on this block yet' : 'No comments yet'}</p>
              <span>{activeBlockId ? 'Add a comment below to start a discussion' : 'Select a block to add comments'}</span>
            </div>
          ) : (
            <div className="comment-threads-list">
              {sortedThreads.map((thread) => (
                <CommentThread
                  key={thread.id}
                  thread={thread}
                  currentUserId={currentUserId}
                  essayOwnerId={essayOwnerId}
                  onAddReply={(text) => onAddComment(thread.blockId, thread.blockType, text, thread.rootComment.id)}
                  onEditComment={onEditComment}
                  onDeleteComment={onDeleteComment}
                  onResolve={(resolved) => onResolveThread(thread.rootComment.id, resolved)}
                  isActive={activeThreadId === thread.id}
                  onActivate={() => setActiveThreadId(thread.id)}
                />
              ))}
            </div>
          )}
        </div>

        {activeBlockId && activeBlockType && (
          <form className="comment-panel-input" onSubmit={commentInput.handleSubmit}>
            {quotedText && (
              <div className="comment-quote">
                <div className="comment-quote-header">
                  <span className="comment-quote-label">Quoting:</span>
                  <button type="button" className="comment-quote-dismiss" onClick={onClearQuote} title="Remove quote">×</button>
                </div>
                <blockquote className="comment-quote-text">{quotedText}</blockquote>
              </div>
            )}
            <textarea
              className="comment-new-input"
              placeholder="Add a comment..."
              value={commentInput.text}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => commentInput.setText(e.target.value)}
              onKeyDown={commentInput.handleKeyDown}
              rows={2}
            />
            <div className="comment-input-footer">
              <span className="comment-input-hint">Cmd+Enter to submit</span>
              <button type="submit" className="comment-btn-add" disabled={!commentInput.isValid}>Comment</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
