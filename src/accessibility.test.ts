import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import WordIllustration from './WordIllustration';
import { wordVisualKey, type Word } from './domain';

const baseCss = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
const dialogCss = readFileSync(new URL('./dialog-trainer.css', import.meta.url), 'utf8');
const themeCss = readFileSync(new URL('./child-theme.css', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
const missionSource = readFileSync(new URL('./MissionView.tsx', import.meta.url), 'utf8');
const dialogSource = readFileSync(new URL('./DialogTrainer.tsx', import.meta.url), 'utf8');
const memorySource = readFileSync(new URL('./MemoryGame.tsx', import.meta.url), 'utf8');
const stylesheets = [baseCss, dialogCss, themeCss];

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

function normalizeSelector(selector: string): string {
  return selector.trim().replace(/\s+/g, ' ');
}

function cssProperty(selector: string, property: string): string {
  const expected = normalizeSelector(selector);
  let value: string | undefined;
  for (const stylesheet of stylesheets) {
    const source = stylesheet.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selectors = match[1].split(',').map(normalizeSelector);
      if (!selectors.includes(expected)) continue;
      for (const declaration of match[2].split(';')) {
        const colon = declaration.indexOf(':');
        if (colon < 0 || declaration.slice(0, colon).trim() !== property) continue;
        value = declaration.slice(colon + 1).trim();
      }
    }
  }
  if (value === undefined) throw new Error(`Missing CSS declaration ${property} for ${selector}`);
  return value;
}

function token(name: string): string {
  return cssProperty(':root', `--${name}`);
}

function resolveColor(value: string): string {
  let color = value.trim().toLowerCase();
  const variable = color.match(/^var\((--[\w-]+)\)$/);
  if (variable) color = token(variable[1].slice(2)).toLowerCase();
  if (color === 'white') color = '#ffffff';
  if (color === 'black') color = '#000000';
  if (/^#[0-9a-f]{3}$/.test(color)) color = `#${[...color.slice(1)].map((channel) => `${channel}${channel}`).join('')}`;
  if (!/^#[0-9a-f]{6}$/.test(color)) throw new Error(`Expected a measurable opaque hex color, got ${value}`);
  return color;
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

function expectPair(name: string, foreground: string, background: string, minimum: number) {
  const ratio = contrastRatio(resolveColor(foreground), resolveColor(background));
  expect(ratio, `${name}: ${foreground} on ${background} measured ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(minimum);
}

describe('visual accessibility regressions', () => {
  it('measures real normal-text colors against the light and dark surfaces where they are used', () => {
    const page = token('page');
    const paper = token('paper');
    const muted = token('muted');
    const pairs: Array<[string, string, string]> = [
      ['base body copy', cssProperty('body', 'color'), page],
      ['muted copy on the page', muted, page],
      ['muted copy on cards', muted, paper],
      ['muted copy on the next-card gradient start', muted, '#eef4ef'],
      ['muted copy on the dialog overview surface', muted, '#edf3ee'],
      ['muted copy on the active mobile navigation surface', muted, '#e9f0eb'],
      ['header stage', cssProperty('.header-stage', 'color'), page],
      ['star pill icon', cssProperty('.top-pill', 'color'), cssProperty('.top-pill', 'background')],
      ['star count', cssProperty('.top-pill b', 'color'), paper],
      ['XP pill', cssProperty('.xp-pill', 'color'), paper],
      ['home welcome line', cssProperty('.welcome-line', 'color'), page],
      ['next-step metadata on gradient start', cssProperty('.next-meta', 'color'), '#eef4ef'],
      ['next-step metadata on gradient end', cssProperty('.next-meta', 'color'), paper],
      ['level caption', cssProperty('.level-caption', 'color'), paper],
      ['mini-stat labels', cssProperty('.mini-stats small', 'color'), paper],
      ['mobile navigation labels', cssProperty('.mobile-nav button', 'color'), paper],
      ['active mobile navigation labels', cssProperty('.mobile-nav button.active', 'color'), '#e9f0eb'],
      ['city lesson labels', cssProperty('.lesson-copy small', 'color'), paper],
      ['world tile labels', cssProperty('.world-tile small', 'color'), paper],
      ['collection tools copy', cssProperty('.collection-tools', 'color'), page],
      ['dialog points', cssProperty('.dialog-session-score', 'color'), paper],
      ['dialog level badge', cssProperty('.dialog-level', 'color'), '#f0eadb'],
      ['home level badge', cssProperty('.level-badge', 'color'), '#f1e8d6'],
      ['mission task context', cssProperty('.task-context', 'color'), paper],
      ['mission guide tip', cssProperty('.guide-tip', 'color'), '#e3eee7'],
      ['mission retry feedback', cssProperty('.task-feedback', 'color'), '#f4efdf'],
      ['mission success feedback', cssProperty('.task-feedback.success', 'color'), '#e5f0e8'],
      ['dialog success feedback', cssProperty('.dialog-feedback.is-correct', 'color'), '#e5f0e8'],
      ['dialog retry feedback', cssProperty('.dialog-feedback.is-try-again:not(:empty)', 'color'), '#f4efdf'],
      ['dialog scenario copy', cssProperty('.dialog-scenario-card>p', 'color'), paper],
      ['dialog offline note', cssProperty('.dialog-offline-note', 'color'), page],
      ['memory game intro copy on gradient start', cssProperty('.memory-game-intro p', 'color'), '#edf3ee'],
      ['memory game stat labels', cssProperty('.memory-game-stats small', 'color'), paper],
      ['default sidebar navigation', cssProperty('.nav-item', 'color'), '#203f3d'],
      ['default sidebar navigation at the gradient end', cssProperty('.nav-item', 'color'), '#1b3838'],
      ['active sidebar navigation', cssProperty('.nav-item.active', 'color'), '#2a504c'],
      ['sidebar navigation sublabels', cssProperty('.nav-item small', 'color'), '#2a504c'],
      ['sidebar brand sublabel', cssProperty('.brand-copy small', 'color'), '#203f3d'],
      ['sidebar note copy', cssProperty('.sidebar-note p', 'color'), '#1b3838'],
      ['sidebar footer', cssProperty('.sidebar-footer', 'color'), '#203f3d'],
      ['hero description at gradient start', cssProperty('.hero p', 'color'), '#203f3d'],
      ['hero description at gradient end', cssProperty('.hero p', 'color'), '#28514d'],
      ['hero metadata at gradient start', cssProperty('.hero-meta', 'color'), '#203f3d'],
      ['hero metadata at gradient end', cssProperty('.hero-meta', 'color'), '#28514d'],
      ['hero emphasis at gradient start', cssProperty('.hero h1 em', 'color'), '#203f3d'],
      ['hero emphasis at gradient end', cssProperty('.hero h1 em', 'color'), '#28514d'],
      ['collection banner copy at gradient start', cssProperty('.collection-banner p', 'color'), '#203f3d'],
      ['collection banner copy at gradient end', cssProperty('.collection-banner p', 'color'), '#315d52'],
      ['primary button copy on teal', cssProperty('.primary-btn', 'color'), cssProperty('.primary-btn', 'background')],
      ['warm hero action copy', cssProperty('.hero .primary-btn', 'color'), cssProperty('.hero .primary-btn', 'background')],
      ['hero chip on composited gradient start', cssProperty('.hero-chip', 'color'), '#314d4c'],
      ['hero chip on composited gradient end', cssProperty('.hero-chip', 'color'), '#385e5a'],
      ['collection banner heading at gradient start', cssProperty('.collection-banner', 'color'), '#203f3d'],
      ['collection banner heading at gradient end', cssProperty('.collection-banner', 'color'), '#315d52'],
      ['collection banner accent at gradient start', cssProperty('.collection-banner .eyebrow', 'color'), '#203f3d'],
      ['collection banner accent at gradient end', cssProperty('.collection-banner .eyebrow', 'color'), '#315d52'],
      ['collection banner action copy', cssProperty('.collection-banner .primary-btn', 'color'), cssProperty('.collection-banner .primary-btn', 'background')],
      ['profile copy at gradient start', cssProperty('.profile-panel', 'color'), '#203f3d'],
      ['profile copy at gradient end', cssProperty('.profile-panel', 'color'), '#315d52'],
      ['teal section action on the page', cssProperty('.text-action', 'color'), page],
      ['teal section action on a card', cssProperty('.text-action', 'color'), paper],
      ['mission guide copy', cssProperty('.guide-card p', 'color'), cssProperty('.guide-card', 'background')],
      ['mission task-type label', cssProperty('.task-type', 'color'), paper],
      ['mission choice copy', cssProperty('.option', 'color'), cssProperty('.option', 'background')],
      ['mission match copy', cssProperty('.match-option', 'color'), cssProperty('.match-option', 'background')],
      ['mission matched-word copy', cssProperty('.match-option.matched', 'color'), cssProperty('.match-option.matched', 'background')],
      ['mission basket-target copy', cssProperty('.basket-targets span', 'color'), cssProperty('.basket-targets span', 'background')],
      ['memory feedback copy', cssProperty('.memory-feedback', 'color'), cssProperty('.memory-feedback', 'background')],
      ['memory card copy in its default state', cssProperty('.memory-card', 'color'), cssProperty('.memory-card', 'background')],
      ['memory card copy in its open state', cssProperty('.memory-card', 'color'), '#f1ecde'],
      ['memory card copy in its matched state', cssProperty('.memory-card', 'color'), '#e8f1eb'],
      ['dialog speaker on the other-speaker surface', cssProperty('.dialog-speaker', 'color'), cssProperty('.dialog-bubble--other', 'background')],
      ['dialog speaker on the learner surface', cssProperty('.dialog-speaker', 'color'), cssProperty('.dialog-bubble--learner', 'background')],
      ['dialog German line on the other-speaker surface', cssProperty('.dialog-bubble p', 'color'), cssProperty('.dialog-bubble--other', 'background')],
      ['dialog German line on the learner surface', cssProperty('.dialog-bubble p', 'color'), cssProperty('.dialog-bubble--learner', 'background')],
      ['dialog translation on the other-speaker surface', cssProperty('.dialog-bubble small', 'color'), cssProperty('.dialog-bubble--other', 'background')],
      ['dialog translation on the learner surface', cssProperty('.dialog-bubble small', 'color'), cssProperty('.dialog-bubble--learner', 'background')],
      ['dialog answer copy', cssProperty('.dialog-choice', 'color'), cssProperty('.dialog-choice', 'background')],
      ['dialog result stats copy', cssProperty('.dialog-result-stats span', 'color'), cssProperty('.dialog-result-stats span', 'background')],
      ['dialog home description on gradient start', cssProperty('.dialog-home-copy p', 'color'), '#e8f6ef'],
      ['dialog home description on gradient end', cssProperty('.dialog-home-copy p', 'color'), paper],
      ['dialog home metadata on gradient start', cssProperty('.dialog-home-copy small', 'color'), '#e8f6ef'],
      ['dialog home metadata on gradient end', cssProperty('.dialog-home-copy small', 'color'), paper],
      ['secondary dialog action copy', cssProperty('.dialog-secondary-btn', 'color'), cssProperty('.dialog-secondary-btn', 'background')],
      ['toast copy', cssProperty('.audio-feedback-toast', 'color'), '#f6f0df'],
    ];
    expect(cssProperty('.page-heading p', 'color')).toBe('var(--muted)');
    expect(cssProperty('.top-pill', 'background')).toBe('var(--paper)');
    expect(cssProperty('.header-stage', 'color')).toBe('var(--muted)');
    for (const [name, foreground, background] of pairs) expectPair(name, foreground, background, 4.5);
  });

  it('keeps the double focus indicator at least 3:1 against light and dark adjacent surfaces', () => {
    const outline = cssProperty('button:focus-visible', 'outline');
    const shadow = cssProperty('button:focus-visible', 'box-shadow');
    expect(outline).toBe('3px solid var(--focus-ring-light)');
    expect(cssProperty('button:focus-visible', 'outline-offset')).toBe('3px');
    expect(shadow).toBe('0 0 0 6px var(--focus-ring-dark)');
    const lightRing = token('focus-ring-light');
    const darkRing = token('focus-ring-dark');
    for (const darkSurface of ['#203f3d', '#1b3838', '#2a504c', '#315650', '#28514d']) {
      expectPair(`light focus ring on ${darkSurface}`, lightRing, darkSurface, 3);
    }
    for (const lightSurface of [token('page'), token('paper'), '#eef4ef', '#f1f5f1']) {
      expectPair(`dark focus ring on ${lightSurface}`, darkRing, lightSurface, 3);
    }
  });

  it('measures answer-control border contrast in default, hover, and selected states', () => {
    const answerEdge = token('answer-edge');
    const answerHover = token('answer-hover');
    const answerSelected = token('answer-selected');
    for (const surface of [token('paper'), token('page')]) expectPair(`answer edge on ${surface}`, answerEdge, surface, 3);
    expectPair('answer hover edge', answerHover, '#f1f5f1', 3);
    expectPair('selected answer edge', answerSelected, '#e8f1eb', 3);
    expect(cssProperty('.option', 'border-color')).toBe('var(--answer-edge)');
    expect(cssProperty('.option:hover:not(:disabled)', 'border-color')).toBe('var(--answer-hover)');
    expect(cssProperty('.basket-item.selected', 'border-color')).toBe('var(--answer-selected)');
    expect(cssProperty('.dialog-choice', 'border-color')).toBe('var(--answer-edge)');
    expect(cssProperty('.dialog-choice:not(:disabled):hover', 'border-color')).toBe('var(--answer-hover)');
  });

  it('gives interactive states a border, shape, icon, or text signal in addition to color', () => {
    expect(cssProperty('.mobile-nav button.active', 'box-shadow')).toBe('inset 0 -3px 0 var(--navy)');
    expect(cssProperty('.nav-item.active', 'box-shadow')).toContain('inset');
    expect(cssProperty('.match-option.selected', 'border-width')).toBe('3px');
    expect(cssProperty('.match-option.selected::after', 'content')).toBe('"●"');
    expect(cssProperty('.match-option.matched::after', 'content')).toBe('"✓"');
    expect(cssProperty('.basket-item.selected::after', 'content')).toBe('"✓"');
    expect(cssProperty('.dialog-choice.is-correct', 'border-style')).toBe('double');
    expect(cssProperty('.dialog-choice.is-correct::after', 'content')).toBe('"✓"');
    expect(cssProperty('.memory-card.is-open:not(.is-matched)', 'border-style')).toBe('dashed');
    expect(cssProperty('.memory-card.is-matched::after', 'content')).toBe('"✓"');
    expect(cssProperty('.avatar-options button.selected::after', 'content')).toBe('"✓"');
    expect(cssProperty('.city-building.is-locked .building-body::after', 'content')).toBe('"🔒"');
    expect(missionSource).toContain('aria-pressed={selectedGerman === word.id || matched.includes(word.id)}');
    expect(missionSource).toContain('aria-pressed={basket.includes(word.id)}');
    expect(dialogSource).toContain('aria-pressed={solved && choice.id === turn.answerId}');
    expect(memorySource).toContain('aria-pressed={revealed}');
    expect(appSource.match(/aria-current=\{screen === item\.id \? 'page' : undefined\}/g)).toHaveLength(2);
    expect(appSource).toContain("'noch gesperrt'");
  });

  it('keeps mobile labels readable without ellipsis and reserves space above the fixed navigation', () => {
    expect(themeCss).toMatch(/\.mobile-nav small\s*\{[^}]*text-overflow:\s*clip;[^}]*white-space:\s*normal/);
    expect(appSource).toContain("{ id: 'game', ar: 'لعبة الأزواج', de: 'Paare-Spiel'");
    expect(appSource).not.toContain("mobileAr: 'لعبة'");
    expect(cssProperty('.world-strip', 'display')).toBe('grid');
    expect(cssProperty('.world-tile', 'min-width')).toBe('0');
    expect(themeCss).toMatch(/@media \(max-width: 1100px\)[\s\S]*?\.word-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    expect(themeCss).toMatch(/@media \(max-width: 820px\)[\s\S]*?\.word-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(themeCss).toMatch(/\.main-area\s*\{[^}]*padding:\s*0 15px 96px/);
    expect(themeCss).toMatch(/\.mobile-nav\s*\{[^}]*position:\s*fixed/);
    expect(appSource).toContain('<nav className="mobile-nav" aria-label="Mobile Hauptnavigation"');
  });

  it('preserves Arabic typography, compact navigation, and reduced motion', () => {
    expect(themeCss).toMatch(/:lang\(ar\)\s*\{[^}]*letter-spacing:\s*normal/);
    expect(themeCss).toMatch(/\.mobile-logo > span\[lang="de"\]\s*\{[^}]*background:\s*transparent/);
    expect(themeCss).toMatch(/@media \(max-width: 700px\)[\s\S]*?\.mobile-nav\s*\{[^}]*position:\s*fixed/);
    expect(themeCss).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition-duration:\s*\.01ms/);
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
