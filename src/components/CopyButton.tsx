import { MouseEvent } from 'react';
import { useClipboard } from '../hooks/useClipboard';

interface CopyButtonProps {
  text: string;
  className?: string;
  title?: string;
}

export function CopyButton({ text, className = '', title = 'Copy to clipboard' }: CopyButtonProps) {
  const { copied, copy } = useClipboard();

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
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
