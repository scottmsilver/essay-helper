import { useRef, useEffect } from 'react';
import { CopyButton } from './CopyButton';

function useAutoResize(value, placeholder, disabled = false) {
  const ref = useRef(null);

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

    // Initial resize
    resize();

    // Re-resize when container changes (e.g., column collapse/expand)
    const observer = new ResizeObserver(resize);
    if (textarea.parentElement) {
      observer.observe(textarea.parentElement);
    }

    return () => observer.disconnect();
  }, [value, disabled]);

  return ref;
}

export function SectionLabel({ children, rowSpan, onClick, collapsed }) {
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

export function PurposeCell({ label, children, className = '', actions }) {
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

export function OutlineCell({ value, onChange, placeholder, placeholderContent, className = '', readOnly = false }) {
  const textareaRef = useAutoResize(value, placeholder);
  const hasContent = value && value.length > 0;

  return (
    <div className={`outline-cell-wrapper ${className} ${hasContent ? 'has-content' : ''}`} data-placeholder={placeholder}>
      <textarea
        ref={textareaRef}
        className={`outline-cell ${className}`}
        value={value}
        onChange={(e) => !readOnly && onChange(e.target.value)}
        placeholder={placeholderContent ? '' : placeholder}
        readOnly={readOnly}
      />
      {placeholderContent && (
        <div className="outline-placeholder">{placeholderContent}</div>
      )}
    </div>
  );
}

export function ParagraphCell({ value, onChange, placeholder, rowSpan, readOnly = false }) {
  const textareaRef = useAutoResize(value, placeholder);
  const hasContent = value && value.trim().length > 0;

  return (
    <div
      className="paragraph-cell-wrapper"
      style={{ gridRow: `span ${rowSpan}` }}
    >
      <textarea
        ref={textareaRef}
        className="paragraph-cell"
        value={value}
        onChange={(e) => !readOnly && onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
      />
      {hasContent && <CopyButton text={value} />}
    </div>
  );
}
