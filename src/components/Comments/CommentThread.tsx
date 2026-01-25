import { useState, ChangeEvent, KeyboardEvent } from 'react';
import type { Comment as ModelComment, CommentThread as ModelCommentThread } from '../../models/comment';
import { formatRelativeDate } from '../../utils/formatDate';
import { IconEdit, IconTrash, IconCheck } from './Icons';
import { useCommentInput } from './useCommentInput';

export type { ModelComment as Comment };

export interface CommentThreadData {
  id: string;
  blockId: string;
  blockType: string;
  rootComment: ModelComment;
  replies: ModelComment[];
  resolved: boolean;
}

export function toCommentThreadData(thread: ModelCommentThread, blockId: string, blockType: string): CommentThreadData {
  return {
    id: thread.rootComment.id,
    blockId,
    blockType,
    rootComment: thread.rootComment,
    replies: thread.replies,
    resolved: thread.rootComment.resolved,
  };
}

interface CommentThreadProps {
  thread: CommentThreadData;
  currentUserId: string;
  essayOwnerId: string;
  onAddReply: (text: string) => void;
  onEditComment: (commentId: string, text: string) => void;
  onDeleteComment: (commentId: string) => void;
  onResolve: (resolved: boolean) => void;
  isActive?: boolean;
  onActivate?: () => void;
}

function AuthorAvatar({ name }: { name: string }) {
  return <div className="comment-avatar-placeholder">{name.charAt(0).toUpperCase()}</div>;
}

interface CommentItemProps {
  comment: ModelComment;
  isOwn: boolean;
  onEdit: (text: string) => void;
  onDelete: () => void;
  onClickText?: () => void;
}

function CommentItem({ comment, isOwn, onEdit, onDelete, onClickText }: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);

  const handleSave = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== comment.text) onEdit(trimmed);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(comment.text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave();
    else if (e.key === 'Escape') handleCancel();
  };

  return (
    <div className="comment-item">
      <div className="comment-header">
        <AuthorAvatar name={comment.authorDisplayName} />
        <span className="comment-author">{comment.authorDisplayName}</span>
        <span className="comment-timestamp">
          {formatRelativeDate(comment.createdAt)}
          {comment.updatedAt && ' (edited)'}
        </span>
        {isOwn && !isEditing && (
          <div className="comment-actions">
            <button className="comment-action-btn" onClick={() => setIsEditing(true)} title="Edit">
              <IconEdit />
            </button>
            <button className="comment-action-btn comment-action-delete" onClick={onDelete} title="Delete">
              <IconTrash />
            </button>
          </div>
        )}
      </div>
      {isEditing ? (
        <div className="comment-edit-form">
          <textarea
            className="comment-edit-input"
            value={editText}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <div className="comment-edit-actions">
            <button className="comment-btn-cancel" onClick={handleCancel}>Cancel</button>
            <button className="comment-btn-save" onClick={handleSave} disabled={!editText.trim()}>Save</button>
          </div>
        </div>
      ) : (
        <p
          className={`comment-text ${onClickText ? 'comment-text-clickable' : ''}`}
          onClick={onClickText ? (e) => { e.stopPropagation(); onClickText(); } : undefined}
        >
          {comment.text}
        </p>
      )}
    </div>
  );
}

export function CommentThread({
  thread,
  currentUserId,
  essayOwnerId,
  onAddReply,
  onEditComment,
  onDeleteComment,
  onResolve,
  isActive = false,
  onActivate,
}: CommentThreadProps) {
  const [isReplying, setIsReplying] = useState(false);

  const replyInput = useCommentInput({
    onSubmit: (text) => {
      onAddReply(text);
      setIsReplying(false);
    },
    onCancel: () => setIsReplying(false),
  });

  const canResolve = currentUserId === thread.rootComment.authorUid || currentUserId === essayOwnerId;
  const startReply = () => setIsReplying(true);

  return (
    <div
      className={`comment-thread ${thread.resolved ? 'comment-thread-resolved' : ''} ${isActive ? 'comment-thread-active' : ''}`}
      onClick={onActivate}
    >
      {thread.resolved && (
        <div className="comment-resolved-badge"><IconCheck /> Resolved</div>
      )}

      <CommentItem
        comment={thread.rootComment}
        isOwn={currentUserId === thread.rootComment.authorUid}
        onEdit={(text) => onEditComment(thread.rootComment.id, text)}
        onDelete={() => onDeleteComment(thread.rootComment.id)}
        onClickText={!isReplying ? startReply : undefined}
      />

      {thread.replies.length > 0 && (
        <div className="comment-replies">
          {thread.replies.map((reply, index) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              isOwn={currentUserId === reply.authorUid}
              onEdit={(text) => onEditComment(reply.id, text)}
              onDelete={() => onDeleteComment(reply.id)}
              onClickText={!isReplying && index === thread.replies.length - 1 ? startReply : undefined}
            />
          ))}
        </div>
      )}

      {isReplying ? (
        <form className="comment-reply-form" onSubmit={replyInput.handleSubmit} onClick={(e) => e.stopPropagation()}>
          <textarea
            className="comment-reply-input"
            placeholder="Reply..."
            value={replyInput.text}
            onChange={(e) => replyInput.setText(e.target.value)}
            onKeyDown={replyInput.handleKeyDown}
            autoFocus
            rows={1}
          />
          <div className="comment-reply-actions">
            <button type="button" className="comment-btn-cancel" onClick={replyInput.cancel}>Cancel</button>
            <button type="submit" className="comment-btn-submit" disabled={!replyInput.isValid}>Reply</button>
          </div>
        </form>
      ) : (
        <div className="comment-thread-actions">
          <button className="comment-btn-reply" onClick={(e) => { e.stopPropagation(); startReply(); }}>Reply</button>
          {canResolve && (
            <button
              className={`comment-btn-resolve ${thread.resolved ? 'comment-btn-reopen' : ''}`}
              onClick={(e) => { e.stopPropagation(); onResolve(!thread.resolved); }}
            >
              {thread.resolved ? 'Re-open' : 'Resolve'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
