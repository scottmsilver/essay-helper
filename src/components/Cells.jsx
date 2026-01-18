import { useRef, useEffect, useLayoutEffect } from 'react';

function useAutoResize(value, placeholder) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const textarea = ref.current;
    if (textarea) {
      // Reset height to auto to get accurate scrollHeight
      textarea.style.height = 'auto';

      // If empty, measure placeholder height by temporarily setting value
      let height = textarea.scrollHeight;
      if (!value && placeholder) {
        const originalValue = textarea.value;
        textarea.value = placeholder;
        height = Math.max(height, textarea.scrollHeight);
        textarea.value = originalValue;
      }

      textarea.style.height = height + 'px';
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

export function PurposeCell({ children, className = '' }) {
  return <div className={`purpose-cell ${className}`}>{children}</div>;
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

  return (
    <textarea
      ref={textareaRef}
      className="paragraph-cell"
      style={{ gridRow: `span ${rowSpan}` }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}
