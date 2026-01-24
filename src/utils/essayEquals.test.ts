import { describe, it, expect } from 'vitest';
import { serializeEssay, essayEquals } from './essayEquals';
import { createEssay } from '../models/essay';
import type { Essay } from '../models/essay';

describe('serializeEssay', () => {
  it('returns a string', () => {
    const essay = createEssay();
    const result = serializeEssay(essay);
    expect(typeof result).toBe('string');
  });

  it('returns consistent output for same essay', () => {
    const essay = createEssay();
    expect(serializeEssay(essay)).toBe(serializeEssay(essay));
  });

  it('returns different output for different essays', () => {
    const essay1 = createEssay();
    const essay2: Essay = {
      ...essay1,
      intro: { ...essay1.intro, hook: 'Different hook' },
    };
    expect(serializeEssay(essay1)).not.toBe(serializeEssay(essay2));
  });
});

describe('essayEquals', () => {
  it('returns true for identical essays', () => {
    const essay = createEssay();
    expect(essayEquals(essay, essay)).toBe(true);
  });

  it('returns true for essays with same content', () => {
    const essay1 = createEssay();
    const essay2 = JSON.parse(JSON.stringify(essay1)) as Essay;
    expect(essayEquals(essay1, essay2)).toBe(true);
  });

  it('returns false when hook differs', () => {
    const essay1 = createEssay();
    const essay2: Essay = {
      ...essay1,
      intro: { ...essay1.intro, hook: 'Different' },
    };
    expect(essayEquals(essay1, essay2)).toBe(false);
  });

  it('returns false when thesis differs', () => {
    const essay1 = createEssay();
    const essay2: Essay = {
      ...essay1,
      intro: { ...essay1.intro, thesis: 'Different thesis' },
    };
    expect(essayEquals(essay1, essay2)).toBe(false);
  });

  it('returns false when body paragraph differs', () => {
    const essay1 = createEssay();
    const essay2: Essay = {
      ...essay1,
      bodyParagraphs: essay1.bodyParagraphs.map((bp) => ({
        ...bp,
        paragraph: 'Different paragraph',
      })),
    };
    expect(essayEquals(essay1, essay2)).toBe(false);
  });

  it('returns false when conclusion differs', () => {
    const essay1 = createEssay();
    const essay2: Essay = {
      ...essay1,
      conclusion: { ...essay1.conclusion, soWhat: 'Different' },
    };
    expect(essayEquals(essay1, essay2)).toBe(false);
  });
});
