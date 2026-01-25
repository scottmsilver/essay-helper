import { useRef, useEffect, ReactNode, ChangeEvent, RefObject } from 'react';
import { CopyButton } from './CopyButton';
import { CommentIndicator, type CommentProps } from './Comments';

function useAutoResize(value: string, _placeholder?: string, disabled = false): RefObject<HTMLTextAreaElement | null> {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;

    const resize = () => {
      if (disabled) {
        textarea.style.height = '0';
        return;
      }
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };

    resize();

    const observer = new ResizeObserver(resize);
    if (textarea.parentElement) {
      observer.observe(textarea.parentElement);
    }

    return () => observer.disconnect();
  }, [value, disabled]);

  return ref;
}

interface SectionLabelProps {
  children: ReactNode;
  rowSpan: number;
  onClick?: () => void;
  collapsed?: boolean;
}

export function SectionLabel({ children, rowSpan, onClick, collapsed }: SectionLabelProps) {
  return (
    <div
      className={`section-label ${onClick ? 'section-label-clickable' : ''} ${collapsed ? 'section-label-collapsed' : ''}`}
      style={{ gridRow: `span ${rowSpan}` }}
      onClick={onClick}
    >
      {children}
      {onClick && <span className="section-collapse-icon">▼</span>}
    </div>
  );
}

interface PurposeCellProps {
  label?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function PurposeCell({ label, children, className = '', actions }: PurposeCellProps) {
  return (
    <div className={`purpose-cell ${className}`}>
      {label && (
        <div className="purpose-header">
          <span className="purpose-label">{label}</span>
          {actions && <div className="purpose-actions">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function getSelectedText(ref: RefObject<HTMLTextAreaElement | null>): string | undefined {
  const textarea = ref.current;
  if (!textarea) return undefined;
  const { selectionStart, selectionEnd } = textarea;
  return selectionStart !== selectionEnd ? textarea.value.substring(selectionStart, selectionEnd) : undefined;
}

interface OutlineCellProps extends CommentProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  placeholderContent?: ReactNode;
  className?: string;
  readOnly?: boolean;
}

export function OutlineCell({
  value,
  onChange,
  placeholder,
  placeholderContent,
  className = '',
  readOnly = false,
  commentCount,
  hasUnresolvedComments,
  onCommentClick,
}: OutlineCellProps) {
  const textareaRef = useAutoResize(value, placeholder);
  const hasContent = value && value.length > 0;

  return (
    <div
      className={`outline-cell-wrapper ${className} ${hasContent ? 'has-content' : ''}`}
      data-placeholder={placeholder}
    >
      <textarea
        ref={textareaRef}
        className={`outline-cell ${className}`}
        value={value}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => !readOnly && onChange(e.target.value)}
        placeholder={placeholderContent ? '' : placeholder}
        readOnly={readOnly}
      />
      {placeholderContent && <div className="outline-placeholder">{placeholderContent}</div>}
      {onCommentClick && (
        <CommentIndicator
          count={commentCount ?? 0}
          hasUnresolved={hasUnresolvedComments ?? false}
          onClick={() => onCommentClick(getSelectedText(textareaRef))}
          className="cell-comment-indicator"
        />
      )}
    </div>
  );
}

interface ParagraphCellProps extends CommentProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rowSpan: number;
  readOnly?: boolean;
}

export function ParagraphCell({
  value,
  onChange,
  placeholder,
  rowSpan,
  readOnly = false,
  commentCount,
  hasUnresolvedComments,
  onCommentClick,
}: ParagraphCellProps) {
  const textareaRef = useAutoResize(value, placeholder);
  const hasContent = value && value.trim().length > 0;

  return (
    <div className="paragraph-cell-wrapper" style={{ gridRow: `span ${rowSpan}` }}>
      <textarea
        ref={textareaRef}
        className="paragraph-cell"
        value={value}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => !readOnly && onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
      />
      {hasContent && <CopyButton text={value} />}
      {onCommentClick && (
        <CommentIndicator
          count={commentCount ?? 0}
          hasUnresolved={hasUnresolvedComments ?? false}
          onClick={() => onCommentClick(getSelectedText(textareaRef))}
          className="cell-comment-indicator"
        />
      )}
    </div>
  );
}
