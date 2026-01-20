import { useClipboard } from '../hooks/useClipboard';

export function CopyButton({ text, className = '', title = 'Copy to clipboard' }) {
  const { copied, copy } = useClipboard();

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    copy(text);
  };

  return (
    <button
      className={`copy-btn copy-btn-icon ${className}`}
      onClick={handleClick}
      title={copied ? 'Copied!' : title}
    >
      {copied ? '✓' : '⧉'}
    </button>
  );
}
