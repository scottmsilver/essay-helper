import { IconComment } from './Icons';

interface CommentIndicatorProps {
  count: number;
  hasUnresolved: boolean;
  onClick: () => void;
  className?: string;
}

export function CommentIndicator({ count, hasUnresolved, onClick, className = '' }: CommentIndicatorProps) {
  const hasComments = count > 0;
  const stateClass = hasComments
    ? (hasUnresolved ? 'comment-indicator-unresolved' : 'comment-indicator-resolved')
    : 'comment-indicator-empty';

  const title = hasComments
    ? `${count} comment${count !== 1 ? 's' : ''}${hasUnresolved ? '' : ' (all resolved)'}`
    : 'Add comment';

  return (
    <button
      className={`comment-indicator ${stateClass} ${className}`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
    >
      <IconComment />
      {count > 0 && <span className="comment-indicator-count">{count}</span>}
    </button>
  );
}
