import { useState, useCallback, KeyboardEvent, FormEvent } from 'react';

interface UseCommentInputOptions {
  onSubmit: (text: string) => void;
  onCancel?: () => void;
}

export function useCommentInput({ onSubmit, onCancel }: UseCommentInputOptions) {
  const [text, setText] = useState('');

  const submit = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed) {
      onSubmit(trimmed);
      setText('');
      return true;
    }
    return false;
  }, [text, onSubmit]);

  const cancel = useCallback(() => {
    setText('');
    onCancel?.();
  }, [onCancel]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      cancel();
    }
  }, [submit, cancel]);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    submit();
  }, [submit]);

  return {
    text,
    setText,
    handleKeyDown,
    handleSubmit,
    cancel,
    isValid: text.trim().length > 0,
  };
}
