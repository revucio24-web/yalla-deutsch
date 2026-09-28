import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

describe('PWA contract', () => {
  it('defines an installable standalone manifest', () => {
    const manifest = JSON.parse(readFileSync(resolve(root, 'public/manifest.webmanifest'), 'utf8'));
    expect(manifest.name).toBe('Yalla Deutsch');
    expect(manifest.start_url).toBe('./');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.some((icon: { sizes: string }) => icon.sizes === '192x192')).toBe(true);
    expect(manifest.icons.some((icon: { sizes: string }) => icon.sizes === '512x512')).toBe(true);
    expect(() => readFileSync(resolve(root, 'public/icon-192.png'))).not.toThrow();
    expect(() => readFileSync(resolve(root, 'public/icon-512.png'))).not.toThrow();
  });

  it('uses a same-origin GET-only offline cache', () => {
    const worker = readFileSync(resolve(root, 'public/sw.js'), 'utf8');
    expect(worker).toContain("request.method !== 'GET'");
    expect(worker).toContain('url.origin !== self.location.origin');
    expect(worker).toMatch(/CACHE_NAME\s*=\s*'yalla-deutsch-[^']+'/);
    expect(worker).toContain('caches.open(CACHE_NAME)');
  });

  it('links the manifest and registers the service worker', () => {
    const html = readFileSync(resolve(root, 'index.html'), 'utf8');
    const main = readFileSync(resolve(root, 'src/main.tsx'), 'utf8');
    expect(html).toContain('rel="manifest"');
    expect(main).toContain("serviceWorker.register('./sw.js')");
  });
});
