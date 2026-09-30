import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import WordIllustration from './WordIllustration';
import { wordVisualKey, type Word } from './domain';

const css = readFileSync(new URL('./child-theme.css', import.meta.url), 'utf8');

function word(illustration: string): Word {
  return {
    id: `test-${illustration}`,
    german: 'Tisch',
    arabic: 'طاولة',
    article: 'der',
    icon: '🧪',
    illustration: illustration as Word['illustration'],
    world: 'test',
  };
}

function token(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'));
  if (!match) throw new Error(`Missing CSS color token --${name}`);
  return match[1].toLowerCase();
}

function contrastRatio(first: string, second: string): number {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
    const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('visual accessibility regressions', () => {
  it('uses two high-contrast focus-ring colors on both sidebar and light surfaces', () => {
    expect(css).toMatch(/button:focus-visible,\s*input:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--focus-ring-light\);[^}]*outline-offset:\s*3px;[^}]*box-shadow:\s*0 0 0 9px var\(--focus-ring-dark\);/);
    const lightRing = token('focus-ring-light');
    const darkRing = token('focus-ring-dark');
    expect(contrastRatio(lightRing, '#294c52')).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(darkRing, '#fffaf1')).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(darkRing, '#fffdf8')).toBeGreaterThanOrEqual(3);
  });

  it('keeps card and answer edges at or above 3:1 against their surfaces', () => {
    const cardEdge = token('line');
    const answerEdge = token('answer-edge');
    const answerHover = token('answer-hover');
    const answerSelected = token('answer-selected');
    for (const surface of ['#fffdf8', '#fffaf1']) {
      expect(contrastRatio(cardEdge, surface)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(answerEdge, surface)).toBeGreaterThanOrEqual(3);
    }
    expect(contrastRatio(answerHover, '#f4f8eb')).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(answerSelected, '#e8f3e6')).toBeGreaterThanOrEqual(3);
    expect(css).toMatch(/\.next-card,[\s\S]*?border-color:\s*var\(--line\)/);
    expect(css).toMatch(/\.dialog-choice\s*\{\s*border-color:\s*var\(--answer-edge\)/);
    expect(css).toMatch(/\.dialog-choice:not\(:disabled\):hover\s*\{[^}]*border-color:\s*var\(--answer-hover\)/);
    expect(css).toMatch(/\.option,\s*\.match-option,\s*\.basket-item,\s*\.build-answer\s*\{\s*border-color:\s*var\(--answer-edge\)/);
    expect(css).toMatch(/\.build-answer button,\s*\.word-tiles button\s*\{\s*border-color:\s*var\(--answer-edge\)/);
    expect(css).toMatch(/\.basket-item\.selected,\s*\.match-option\.matched\s*\{\s*border-color:\s*var\(--answer-selected\)/);
  });

  it('uses the rendered emoji as the collision identity for every unknown illustration key', () => {
    const first = word('future-key-a');
    const second = word('future-key-b');
    expect(wordVisualKey(first)).toBe('emoji:🧪');
    expect(wordVisualKey(second)).toBe(wordVisualKey(first));

    const markup = renderToStaticMarkup(createElement(WordIllustration, { word: first, decorative: true }));
    expect(markup).toContain('🧪');
    expect(markup).not.toContain('<svg');
  });

  it('marks repeated illustrations decorative and language-tags informative labels separately', () => {
    const item = word('table');
    const decorativeMarkup = renderToStaticMarkup(createElement(WordIllustration, { word: item, decorative: true }));
    expect(decorativeMarkup).toContain('aria-hidden="true"');
    expect(decorativeMarkup).not.toContain('word-illustration-labels');

    const informativeMarkup = renderToStaticMarkup(createElement(WordIllustration, { word: item, decorative: false }));
    expect(informativeMarkup).toContain('<span lang="de" dir="ltr">Tisch</span>');
    expect(informativeMarkup).toContain('<span lang="ar">طاولة</span>');
    expect(informativeMarkup).not.toContain('aria-label=');
  });
});
