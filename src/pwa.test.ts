import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

function readProjectFile(path: string) {
  return readFileSync(resolve(root, path), 'utf8');
}

describe('PWA contract', () => {
  it('defines an installable standalone manifest', () => {
    const manifest = JSON.parse(readProjectFile('public/manifest.webmanifest'));
    expect(manifest.name).toBe('Yalla Deutsch');
    expect(manifest.start_url).toBe('./');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.some((icon: { sizes: string }) => icon.sizes === '192x192')).toBe(true);
    expect(manifest.icons.some((icon: { sizes: string }) => icon.sizes === '512x512')).toBe(true);
    expect(() => readProjectFile('public/icon-192.png')).not.toThrow();
    expect(() => readProjectFile('public/icon-512.png')).not.toThrow();
  });

  it('only removes this app’s prior caches and handles same-scope GET requests', () => {
    const worker = readProjectFile('public/sw.js');
    expect(worker).toContain("request.method !== 'GET'");
    expect(worker).toContain('url.origin !== APP_SCOPE.origin');
    expect(worker).toContain('!url.pathname.startsWith(scopePath)');
    expect(worker).toContain("request.mode === 'navigate'");
    expect(worker).toMatch(/CACHE_NAME\s*=\s*'yalla-deutsch-v3'/);
    expect(worker).toMatch(/key\.startsWith\(CACHE_PREFIX\)\s*&&\s*key !== CACHE_NAME/);
    expect(worker).toContain('cache.match(request)');
    expect(worker).toContain('cache.addAll(APP_SHELL)');
  });

  it('injects the current Vite JavaScript and CSS bundles into the production precache', () => {
    const worker = readProjectFile('public/sw.js');
    const buildScript = readProjectFile('scripts/inject-precache.mjs');
    const packageJson = JSON.parse(readProjectFile('package.json'));
    expect(worker).toContain('const BUILD_ASSETS = [];');
    expect(buildScript).toContain("/\\.(?:js|css)$/i");
    expect(buildScript).toContain('const BUILD_ASSETS = ${JSON.stringify(files)};');
    expect(packageJson.scripts.build).toContain('scripts/inject-precache.mjs');
  });

  it('keeps Arabic as the document language and RTL base direction', () => {
    const html = readProjectFile('index.html');
    expect(html).toContain('<html lang="ar" dir="rtl">');
  });

  it('marks mixed German and Arabic UI text for screen readers', () => {
    const app = readProjectFile('src/App.tsx');
    const mission = readProjectFile('src/MissionView.tsx');
    expect(app).toContain('<small lang="de">{item.de}</small>');
    expect(app).toContain('<span lang="ar">{item.ar}<small lang="de">{item.de}</small>');
    expect(mission).toContain('<span lang="ar">{feedback.arabic}</span>');
    expect(mission).toContain('<span lang="de">{feedback.german}</span>');
  });

  it('links the manifest and registers the service worker', () => {
    const html = readProjectFile('index.html');
    const main = readProjectFile('src/main.tsx');
    expect(html).toContain('rel="manifest"');
    expect(main).toContain("serviceWorker.register('./sw.js')");
  });
});
