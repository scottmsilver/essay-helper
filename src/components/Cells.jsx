import { useRef, useLayoutEffect } from 'react';
import { CopyButton } from './CopyButton';

function useAutoResize(value, placeholder) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const textarea = ref.current;
    if (textarea) {
      // Reset to measure content
      textarea.style.minHeight = 'auto';
      textarea.style.height = 'auto';

      // If empty, measure placeholder height by temporarily setting value
      let height = textarea.scrollHeight;
      if (!value && placeholder) {
        const originalValue = textarea.value;
        textarea.value = placeholder;
        height = Math.max(height, textarea.scrollHeight);
        textarea.value = originalValue;
      }

      // Use minHeight so it can stretch to fill container
      textarea.style.minHeight = height + 'px';
      textarea.style.height = '';
    }
  }, [value, placeholder]);

  return ref;
}

export function SectionLabel({ children, rowSpan }) {
  return (
    <div
      className="section-label"
      style={{ gridRow: `span ${rowSpan}` }}
    >
      {children}
    </div>
  );
}

export function PurposeCell({ label, children, className = '', actions }) {
  return (
    <div className={`purpose-cell ${className}`}>
      {actions && <div className="purpose-actions">{actions}</div>}
      {label && <span className="purpose-label">{label}</span>}
      {children}
    </div>
  );
}

export function OutlineCell({ value, onChange, placeholder, className = '' }) {
  const hasContent = value && value.trim().length > 0;
  const textareaRef = useAutoResize(value, placeholder);

  return (
    <div className={`outline-cell-wrapper ${className}`}>
      <textarea
        ref={textareaRef}
        className={`outline-cell ${className}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {hasContent && (
        <span className="help-icon" title={placeholder}>?</span>
      )}
    </div>
  );
}

export function ParagraphCell({ value, onChange, placeholder, rowSpan }) {
  const textareaRef = useAutoResize(value, placeholder);
  const hasContent = value && value.trim().length > 0;

  return (
    <div className="paragraph-cell-wrapper" style={{ gridRow: `span ${rowSpan}` }}>
      <textarea
        ref={textareaRef}
        className="paragraph-cell"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {hasContent && <CopyButton text={value} />}
    </div>
  );
}
