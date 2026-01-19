import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClipboard } from './useClipboard';

describe('useClipboard', () => {
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
    });
  });

  it('starts with copied as false', () => {
    const { result } = renderHook(() => useClipboard());
    expect(result.current.copied).toBe(false);
  });

  it('sets copied to true after successful copy', async () => {
    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy('test text');
    });

    expect(result.current.copied).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test text');
  });

  it('returns false and does not copy when text is empty', async () => {
    const { result } = renderHook(() => useClipboard());

    let returnValue;
    await act(async () => {
      returnValue = await result.current.copy('');
    });

    expect(returnValue).toBe(false);
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('resets copied to false after delay', async () => {
    const { result } = renderHook(() => useClipboard(1000));

    await act(async () => {
      await result.current.copy('test text');
    });

    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.copied).toBe(false);
  });

  it('returns false when clipboard write fails', async () => {
    navigator.clipboard.writeText = vi.fn().mockRejectedValue(new Error('Failed'));

    const { result } = renderHook(() => useClipboard());

    let returnValue;
    await act(async () => {
      returnValue = await result.current.copy('test text');
    });

    expect(returnValue).toBe(false);
    expect(result.current.copied).toBe(false);
  });
});
