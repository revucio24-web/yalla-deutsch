import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import WordIllustration from './WordIllustration';
import MasteryIndicator from './MasteryIndicator';
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
      ['inactive mobile navigation on its darkest composited surface', cssProperty('.mobile-nav button', 'color'), '#f6f6f2'],
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
      ['city building labels on their paper chip', cssProperty('.building-label', 'color'), cssProperty('.building-label', 'background')],
      ['disabled city lesson titles', cssProperty('.lesson-row:disabled', 'color'), paper],
      ['disabled mission titles', cssProperty('.mission-row:disabled', 'color'), paper],
      ['disabled world-tile titles', cssProperty('.world-tile:disabled', 'color'), paper],
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

  it('measures resting form-field borders on their actual surfaces and preserves input focus', () => {
    const fields = ['.collection-tools input', '.edit-panel input', '.welcome-panel input'];
    for (const selector of fields) {
      const border = cssProperty(selector, 'border-color');
      const surface = cssProperty(selector, 'background');
      expect(border).toBe('var(--field-border)');
      expectPair(`${selector} resting border`, border, surface, 3);
      const placeholder = cssProperty('input::placeholder', 'color');
      expect(placeholder).toBe('var(--muted)');
      expectPair(`${selector} placeholder`, placeholder, surface, 4.5);
    }
    expect(cssProperty('input::placeholder', 'opacity')).toBe('1');
    expect(cssProperty('input:focus-visible', 'outline')).toBe('3px solid var(--focus-ring-light)');
    expect(cssProperty('input:focus-visible', 'outline-offset')).toBe('3px');
    expect(cssProperty('input:focus-visible', 'box-shadow')).toBe('0 0 0 6px var(--focus-ring-dark)');
  });

  it('measures actual card edges on light, colored, and dark surfaces plus their visible states', () => {
    const cardEdge = token('card-border');
    for (const surface of [token('paper'), token('page'), '#faf6ed', '#e7ece4', '#dfe4dd', '#dfe6dc', '#d7dfd5', '#d6ccb6', '#cfc6b1', '#d0c2a5', '#c9bda1', '#edf3ee']) {
      expectPair(`card edge on ${surface}`, cardEdge, surface, 3);
    }
    const cards = [
      '.next-card', '.level-card', '.mission-group', '.city-detail', '.word-card', '.stats-grid > div',
      '.progress-panel', '.district-progress', '.edit-panel', '.settings-panel', '.reset-panel',
      '.welcome-panel', '.finish-panel', '.review-panel', '.memory-game-panel', '.dialog-scenario-card',
      '.dialog-session-card', '.dialog-result-card', '.world-tile', '.city-scene', '.empty-state',
      '.task-card', '.guide-card', '.hint-stage', '.dialog-home-card', '.dialog-overview', '.memory-game-stats > div', '.memory-feedback',
    ];
    for (const selector of cards) {
      expect(cssProperty(selector, 'border-color'), `${selector} uses the contrast-safe card edge`).toBe('var(--card-border)');
    }
    const profileEdge = cssProperty('.profile-panel', 'border-color');
    expect(profileEdge).toBe('var(--line)');
    for (const surface of ['#203f3d', '#315d52']) expectPair(`dark profile-card edge on ${surface}`, profileEdge, surface, 3);
    for (const selector of ['.world-tile:disabled', '.lesson-row:disabled', '.mission-row:disabled']) {
      expect(cssProperty(selector, 'border-color')).toBe('var(--card-border)');
      expect(cssProperty(selector, 'opacity')).toBe('1');
    }
    for (const selector of ['.lesson-row:hover:not(:disabled)', '.mission-row:hover:not(:disabled)']) {
      const hoverEdge = cssProperty(selector, 'border-color');
      expect(hoverEdge).toBe('var(--answer-hover)');
      expectPair(`${selector} edge`, hoverEdge, '#f5f8f5', 3);
    }
    expect(cssProperty('.avatar-options button', 'border-color')).toBe('var(--card-border)');
    const selectedAvatarEdge = cssProperty('.avatar-options button.selected', 'border-color');
    expect(selectedAvatarEdge).toBe('var(--answer-selected)');
    expectPair('selected avatar edge', selectedAvatarEdge, '#e7f0eb', 3);
  });

  it('measures the guide and hint-stage borders against their effective filled surfaces', () => {
    expect(missionSource).toContain('<aside className="guide-card">');
    for (const selector of ['.guide-card', '.hint-stage']) {
      const border = cssProperty(selector, 'border-color');
      const surface = cssProperty(selector, 'background');
      expect(border, `${selector} uses the shared card edge`).toBe('var(--card-border)');
      expectPair(`${selector} edge on its effective surface`, border, surface, 3);
    }
  });

  it('renders mastery progress as a visible ratio and a semantic meter', () => {
    expect(appSource).toContain('<MasteryIndicator value={progress.words[word.id].mastery} />');
    for (const value of [0, 3, 5]) {
      const markup = renderToStaticMarkup(createElement(MasteryIndicator, { value }));
      expect(markup).toContain('role="meter"');
      expect(markup).toContain('aria-label="Lernstand"');
      expect(markup).toContain('aria-valuemin="0"');
      expect(markup).toContain('aria-valuemax="5"');
      expect(markup).toContain(`aria-valuenow="${value}"`);
      expect(markup).toContain(`aria-valuetext="${value} von 5"`);
      expect(markup).toContain(`class="mastery-value" aria-hidden="true">${value}/5</span>`);
      expect(markup.match(/<i aria-hidden="true"/g)).toHaveLength(5);
    }
    const valueColor = cssProperty('.mastery-value', 'color');
    expect(valueColor).toBe('var(--muted)');
    expectPair('visible mastery ratio on a word card', valueColor, token('paper'), 4.5);
  });

  it('keeps the profile avatar marker and pressed state synced to the selected avatar with an empty name draft', () => {
    const profileStart = appSource.indexOf("screen === 'profile' &&");
    const settingsStart = appSource.indexOf("screen === 'settings' &&", profileStart);
    expect(profileStart).toBeGreaterThanOrEqual(0);
    expect(settingsStart).toBeGreaterThan(profileStart);
    const profile = appSource.slice(profileStart, settingsStart);
    const avatarButtons = profile.match(/<div className="avatar-options">([\s\S]*?)<\/div>/)?.[1] ?? '';
    expect(avatarButtons).toContain("className={avatar === item ? 'selected' : ''}");
    expect(avatarButtons).toContain('aria-pressed={avatar === item}');
    expect(avatarButtons).toContain('onClick={() => setAvatar(item)}');
    expect(avatarButtons).not.toContain('nickname');
    expect(appSource).toMatch(/const openProfile = \(\) => \{ setAvatar\(progress\.avatar\); navigate\('profile'\); \};/);
    expect(appSource).toContain('onClick={openProfile}');
  });

  it('syncs a saved non-first avatar when the desktop sidebar opens profile with an empty nickname', () => {
    const sidebar = appSource.match(/<nav aria-label="Hauptnavigation"[\s\S]*?<\/nav>/)?.[0] ?? '';
    const nickname = '';
    const firstAvatar = '🦊';
    const savedAvatar = '🐼';

    expect(nickname).toBe('');
    expect(savedAvatar).not.toBe(firstAvatar);
    expect(sidebar).toContain("onClick={() => item.id === 'profile' ? openProfile() : navigate(item.id)}");
    expect(appSource).toMatch(/const openProfile = \(\) => \{ setAvatar\(progress\.avatar\); navigate\('profile'\); \};/);
    expect(appSource).toContain("className={avatar === item ? 'selected' : ''}");
    expect(appSource).toContain('aria-pressed={avatar === item}');
  });

  it('keeps the city scene visually aligned with the shared palette using CSS-drawn trees', () => {
    expect(cssProperty('.city-scene', 'border-color')).toBe('var(--card-border)');
    expect(themeCss).toContain('.city-scene { height: 318px; border-radius: 16px; }');
    expect(cssProperty('.building-roof', 'clip-path')).toBe('none');
    expect(cssProperty('.scene-tree', 'font-size')).toBe('0');
    expect(appSource).toContain('<span lang="de">{world.de}</span>');
    expect(cssProperty('.building-label > span', 'hyphens')).toBe('auto');
    expect(cssProperty('.building-label > span', 'overflow-wrap')).toBe('normal');
    expect(cssProperty('.scene-tree::before', 'content')).toBe('""');
    expect(cssProperty('.scene-tree::after', 'content')).toBe('""');
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
    expect(cssProperty('.mobile-nav small', 'font-size')).toBe('max(.75rem, 12px)');
    expect(cssProperty('.mobile-nav small', 'overflow-wrap')).toBe('anywhere');
    expect(cssProperty('.mobile-nav button', 'min-height')).toBe('60px');
    expect(cssProperty('.mobile-nav', 'min-height')).toBe('76px');
    expect(cssProperty('.mobile-nav', 'background')).toMatch(/^rgba\(\s*255,\s*254,\s*250,\s*\.96\s*\)$/);
    expect(cssProperty('.main-area', 'padding-bottom')).toBe('calc(124px + env(safe-area-inset-bottom))');
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

  it('keeps the mobile dialog start action ahead of detail copy with both language labels intact', () => {
    const identity = dialogSource.indexOf('<div className="dialog-scenario-identity">');
    const start = dialogSource.indexOf('<button className="primary-btn dialog-start-btn"');
    const description = dialogSource.indexOf('<p dir="ltr" lang="de">{item.description}</p>');
    expect(identity).toBeGreaterThanOrEqual(0);
    expect(start).toBeGreaterThan(identity);
    expect(description).toBeGreaterThan(start);
    expect(dialogSource).toContain('<h2 dir="ltr" lang="de">{item.title}</h2>');
    expect(dialogSource).toContain('<h3 lang="ar">{item.titleAr}</h3>');
    expect(themeCss).toContain('grid-template-areas: "icon title level";');
    expect(themeCss).toContain('.dialog-start-btn { margin-top: 6px; }');
    expect(themeCss).toContain('.dialog-page-top p { font-size: .82rem; line-height: 1.4; }');
    expect(themeCss).toContain('.dialog-session-card { padding: 14px 12px; }');
    expect(themeCss).toContain('.dialog-conversation { margin: 16px 0; }');
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
