import { useClipboard } from '../hooks/useClipboard';

export function CopyButton({ text, className = '', variant = 'icon' }) {
  const { copied, copy } = useClipboard();

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    copy(text);
  };

  if (variant === 'full') {
    return (
      <button
        className={`copy-btn copy-btn-full ${className}`}
        onClick={handleClick}
        title={copied ? 'Copied!' : 'Copy Full Essay'}
      >
        {copied ? 'Copied!' : 'Copy Full Essay'}
      </button>
    );
  }

  return (
    <button
      className={`copy-btn copy-btn-icon ${className}`}
      onClick={handleClick}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? '✓' : '⧉'}
    </button>
  );
}
