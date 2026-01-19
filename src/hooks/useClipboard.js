import { useState, useCallback } from 'react';

export function useClipboard(resetDelay = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text) => {
    if (!text) return false;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), resetDelay);
      return true;
    } catch (err) {
      console.error('Failed to copy:', err);
      return false;
    }
  }, [resetDelay]);

  return { copied, copy };
}
