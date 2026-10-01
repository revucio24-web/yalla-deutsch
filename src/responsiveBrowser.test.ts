import react from '@vitejs/plugin-react';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import { describe, expect, it } from 'vitest';

const widths = [320, 700, 701, 768, 960, 961];
const baseCss = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
const themeCss = readFileSync(new URL('./child-theme.css', import.meta.url), 'utf8');

interface RenderedResult {
  viewportWidth: number;
  documentWidth: number;
  bodyWidth: number;
  navDisplay: string;
  navLeft: number;
  navRight: number;
  labels: Array<{
    text: string | null;
    fontSize: number;
    clientWidth: number;
    scrollWidth: number;
    left: number;
    right: number;
    buttonLeft: number;
    buttonRight: number;
  }>;
}

interface CdpMessage {
  id?: number;
  method?: string;
  params?: unknown;
  result?: Record<string, unknown>;
  error?: { message?: string };
}

function chromiumBinary(): string {
  const candidates = process.env.CHROMIUM_BIN
    ? [process.env.CHROMIUM_BIN]
    : ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable'];
  const available = candidates.find((candidate) => spawnSync(candidate, ['--version'], { stdio: 'ignore' }).status === 0);
  if (!available) throw new Error('Chromium is required for the rendered browser regressions; set CHROMIUM_BIN to its executable path.');
  return available;
}

function responsiveFixture(): string {
  const labels = ['الرئيسية', 'المدينة', 'المهام', 'كلمات', 'الحوارات', 'لعبة الأزواج'];
  const icons = ['⌂', '⌖', '✓', '▤', '◌', '🃏'];
  const navItems = labels.map((label, index) => `
    <button class="${index === 0 ? 'active' : ''}"${index === 0 ? ' aria-current="page"' : ''}>
      <span aria-hidden="true">${icons[index]}</span>
      <small lang="ar">${label}</small>
    </button>`).join('');
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>${baseCss}</style><style>${themeCss}</style></head>
<body><nav class="mobile-nav" aria-label="Mobile Hauptnavigation" lang="de">${navItems}</nav>
<script>
  window.__responsiveMeasurement = () => {
    const nav = document.querySelector('.mobile-nav');
    const navRect = nav.getBoundingClientRect();
    const labels = [...nav.querySelectorAll('small')].map((label) => {
      const rect = label.getBoundingClientRect();
      const buttonRect = label.closest('button').getBoundingClientRect();
      return {
        text: label.textContent,
        fontSize: Number.parseFloat(getComputedStyle(label).fontSize),
        clientWidth: label.clientWidth,
        scrollWidth: label.scrollWidth,
        left: rect.left,
        right: rect.right,
        buttonLeft: buttonRect.left,
        buttonRight: buttonRect.right,
      };
    });
    return JSON.stringify({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      navDisplay: getComputedStyle(nav).display,
      navLeft: navRect.left,
      navRight: navRect.right,
      labels,
    });
  };
</script></body></html>`;
}

async function launchChromium(pageUrl: string, profileDir: string) {
  const child: ChildProcess = spawn(chromiumBinary(), [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-address=127.0.0.1',
    '--remote-debugging-port=0',
    '--remote-allow-origins=*',
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let startupLog = '';
  const browserSocketUrl = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Chromium did not start DevTools: ${startupLog.slice(-1000)}`)), 15_000);
    child.stderr?.on('data', (chunk: Buffer) => {
      startupLog += chunk.toString();
      const match = startupLog.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/devtools\/browser\/[^\s]+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Chromium exited before DevTools was ready (code ${code}): ${startupLog.slice(-1000)}`));
    });
  });

  const debugUrl = new URL(browserSocketUrl);
  const targetsUrl = `http://${debugUrl.host}/json/list`;
  let targets: Array<{ type: string; webSocketDebuggerUrl: string }> = [];
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(targetsUrl);
      targets = await response.json() as typeof targets;
      if (targets.some((target) => target.type === 'page')) break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  const pageTarget = targets.find((target) => target.type === 'page');
  if (!pageTarget) {
    child.kill('SIGTERM');
    throw new Error(`Chromium created no page target: ${startupLog.slice(-1000)}`);
  }

  const socket = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener('open', () => resolve(), { once: true });
    socket.addEventListener('error', () => reject(new Error('Could not connect to Chromium DevTools')),
      { once: true });
  });

  let nextId = 0;
  const pending = new Map<number, { resolve: (value: CdpMessage['result']) => void; reject: (error: Error) => void }>();
  const eventWaiters = new Map<string, Array<(params: unknown) => void>>();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data)) as CdpMessage;
    if (message.id !== undefined) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message ?? 'Chromium DevTools command failed'));
      else request.resolve(message.result);
    } else if (message.method) {
      for (const resolve of eventWaiters.get(message.method) ?? []) resolve(message.params);
      eventWaiters.delete(message.method);
    }
  });

  function command(method: string, params: Record<string, unknown> = {}): Promise<CdpMessage['result']> {
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }

  function waitForEvent(method: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for Chromium event ${method}`)), 15_000);
      const waiters = eventWaiters.get(method) ?? [];
      waiters.push((params) => {
        clearTimeout(timer);
        resolve(params);
      });
      eventWaiters.set(method, waiters);
    });
  }

  async function evaluate<T>(expression: string): Promise<T> {
    const evaluation = await command('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (evaluation?.exceptionDetails) {
      throw new Error(`Chromium evaluation failed: ${JSON.stringify(evaluation.exceptionDetails)}`);
    }
    const result = evaluation?.result as { value?: T } | undefined;
    if (!result || !('value' in result)) throw new Error('Chromium returned no serializable value');
    return result.value as T;
  }

  async function setViewport(width: number, height: number) {
    await command('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: width,
      screenHeight: height,
    });
    await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  }

  async function click(selector: string) {
    await evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!(element instanceof HTMLElement)) throw new Error('Missing element: ' + ${JSON.stringify(selector)}); element.click(); return true; })()`);
    await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  }

  async function reload() {
    const loaded = waitForEvent('Page.loadEventFired');
    await command('Page.reload');
    await loaded;
    await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  }

  await command('Page.enable');
  await command('Runtime.enable');
  const loaded = waitForEvent('Page.loadEventFired');
  await command('Page.navigate', { url: pageUrl });
  await loaded;

  return {
    evaluate,
    setViewport,
    click,
    reload,
    async resultAt(width: number): Promise<RenderedResult> {
      await setViewport(width, 900);
      const serialized = await evaluate<string>('window.__responsiveMeasurement()');
      return JSON.parse(serialized) as RenderedResult;
    },
    async close() {
      socket.close();
      if (child.exitCode === null && child.signalCode === null) {
        const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
        child.kill('SIGTERM');
        await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 1500))]);
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      }
    },
  };
}

describe('rendered responsive navigation', () => {
  it('uses the effective CSS media-query cascade at each breakpoint without label or page overflow', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'yalla-responsive-browser-'));
    const htmlPath = join(tempDir, 'fixture.html');
    const profileDir = join(tempDir, 'chrome-profile');
    writeFileSync(htmlPath, responsiveFixture());
    const browser = await launchChromium(pathToFileURL(htmlPath).href, profileDir);

    try {
      for (const width of widths) {
        const rendered = await browser.resultAt(width);
        expect(rendered.viewportWidth, `actual Chromium viewport at ${width}px`).toBe(width);
        expect(rendered.documentWidth, `document width at ${width}px`).toBeLessThanOrEqual(width);
        expect(rendered.bodyWidth, `body width at ${width}px`).toBeLessThanOrEqual(width);

        if (width <= 960) {
          expect(rendered.navDisplay, `mobile navigation visibility at ${width}px`).not.toBe('none');
          expect(rendered.navLeft, `navigation left edge at ${width}px`).toBeGreaterThanOrEqual(0);
          expect(rendered.navRight, `navigation right edge at ${width}px`).toBeLessThanOrEqual(width);
          expect(rendered.labels, `all mobile labels exist at ${width}px`).toHaveLength(6);
          for (const label of rendered.labels) {
            expect(label.fontSize, `${label.text} effective rendered font size at ${width}px`).toBeGreaterThanOrEqual(12);
            expect(label.scrollWidth, `${label.text} horizontal text overflow at ${width}px`).toBeLessThanOrEqual(label.clientWidth);
            expect(label.left, `${label.text} left edge at ${width}px`).toBeGreaterThanOrEqual(label.buttonLeft);
            expect(label.right, `${label.text} right edge at ${width}px`).toBeLessThanOrEqual(label.buttonRight);
          }
        } else {
          expect(rendered.navDisplay, `mobile navigation hidden at ${width}px`).toBe('none');
        }
      }
    } finally {
      await browser.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('preserves the saved first-run avatar and makes bilingual dialog answers scroll-reachable in the real React app', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'yalla-app-browser-'));
    const server = await createServer({
      base: './',
      plugins: [react()],
      server: { host: '127.0.0.1', port: 0, strictPort: false, hmr: false, watch: null },
      logLevel: 'error',
    });
    let browser: Awaited<ReturnType<typeof launchChromium>> | undefined;

    try {
      await server.listen();
      const address = server.httpServer?.address();
      if (!address || typeof address === 'string') throw new Error('Vite test server did not expose its port');
      browser = await launchChromium(`http://127.0.0.1:${address.port}/`, join(tempDir, 'chrome-profile'));
      await browser.setViewport(320, 640);
      await browser.evaluate(`localStorage.setItem('yalla-deutsch-progress-v1', JSON.stringify({version:1,nickname:'',avatar:'🐼',xp:0,completed:[],stars:{},words:{},settings:{sound:false,hints:true,reduceMotion:false,largeText:false},dialogTrainer:{}})); true`);
      await browser.reload();
      await browser.click('.hero .primary-btn');

      const welcome = await browser.evaluate<{ heading: string; nickname: string; pandaSelected: string | null; foxSelected: string | null }>(`(() => ({ heading: document.querySelector('.welcome-panel h1')?.textContent ?? '', nickname: document.querySelector('#nickname')?.value ?? '', pandaSelected: [...document.querySelectorAll('.avatar-options button')].find((el) => el.textContent?.trim() === '🐼')?.getAttribute('aria-pressed') ?? null, foxSelected: [...document.querySelectorAll('.avatar-options button')].find((el) => el.textContent?.trim() === '🦊')?.getAttribute('aria-pressed') ?? null }))()`);
      expect(welcome.heading).toContain('هيا نتعلم');
      expect(welcome.nickname).toBe('');
      expect(welcome.pandaSelected, 'saved Panda is selected on the first-run welcome step').toBe('true');
      expect(welcome.foxSelected, 'first-run must not replace the saved Panda with the default Fox').toBe('false');

      await browser.click('.welcome-panel .quiet-btn');
      await browser.click('.mobile-nav button:nth-of-type(4)');
      const scenarioStartReachability = await browser.evaluate<{ width: number; height: number; scrollMax: number; endScrollY: number; navTop: number; lastButtonTop: number; lastButtonBottom: number; lastButtonNavOverlap: number }>(`(() => {
        document.documentElement.style.scrollBehavior = 'auto';
        const read = () => {
          const nav = document.querySelector('.mobile-nav').getBoundingClientRect();
          const buttons = [...document.querySelectorAll('.dialog-start-btn')];
          const last = buttons[buttons.length - 1].getBoundingClientRect();
          return { navTop: nav.top, top: last.top, bottom: last.bottom, overlap: Math.max(0, Math.min(last.bottom, nav.bottom) - Math.max(last.top, nav.top)) };
        };
        window.scrollTo({ top: 0, behavior: 'instant' });
        const start = read();
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
        const end = read();
        return { width: innerWidth, height: innerHeight, scrollMax: document.documentElement.scrollHeight - innerHeight, endScrollY: scrollY, navTop: end.navTop, lastButtonTop: end.top, lastButtonBottom: end.bottom, lastButtonNavOverlap: end.overlap, startButtonBottom: start.bottom };
      })()`);
      expect(scenarioStartReachability.width).toBe(320);
      expect(scenarioStartReachability.height).toBe(640);
      expect(scenarioStartReachability.scrollMax, 'dialog scenarios can be scrolled on a 320×640 phone').toBeGreaterThan(0);
      expect(scenarioStartReachability.endScrollY, 'the last scenario action can be reached by ordinary scrolling').toBeGreaterThan(0);
      expect(scenarioStartReachability.lastButtonTop).toBeGreaterThanOrEqual(0);
      expect(scenarioStartReachability.lastButtonBottom).toBeLessThanOrEqual(640);
      expect(scenarioStartReachability.lastButtonNavOverlap, 'the last scenario action clears the fixed bar at scroll end').toBe(0);
      await browser.evaluate(`window.scrollTo({ top: 0, behavior: 'instant' }); true`);
      await browser.click('.dialog-start-btn');
      await browser.click('.dialog-choice-row:nth-child(2) .dialog-choice');
      const feedback = await browser.evaluate<{ outerDir: string | null; outerLang: string | null; outerComputedDirection: string; germanText: string | null; germanDir: string | null; germanLang: string | null; germanComputedDirection: string | null; arabicText: string | null; arabicLang: string | null }>(`(() => { const outer = document.querySelector('.dialog-feedback'); const german = outer?.querySelector('[lang="de"]'); const arabic = outer?.querySelector('span[lang="ar"]:last-child'); return { outerDir: outer?.getAttribute('dir') ?? null, outerLang: outer?.getAttribute('lang') ?? null, outerComputedDirection: outer ? getComputedStyle(outer).direction : '', germanText: german?.textContent ?? null, germanDir: german?.getAttribute('dir') ?? null, germanLang: german?.getAttribute('lang') ?? null, germanComputedDirection: german ? getComputedStyle(german).direction : null, arabicText: arabic?.textContent ?? null, arabicLang: arabic?.getAttribute('lang') ?? null }; })()`);
      expect(feedback.outerDir).toBe('rtl');
      expect(feedback.outerLang).toBe('ar');
      expect(feedback.outerComputedDirection).toBe('rtl');
      expect(feedback.germanText).toBe('Einen Tee, bitte.');
      expect(feedback.germanDir).toBe('ltr');
      expect(feedback.germanLang).toBe('de');
      expect(feedback.germanComputedDirection).toBe('ltr');
      expect(feedback.arabicText).toBe('شايًا من فضلك.');
      expect(feedback.arabicLang).toBe('ar');

      for (const width of [320, 360, 390]) {
        await browser.setViewport(width, 640);
        const reachability = await browser.evaluate<{
          width: number;
          height: number;
          scrollMax: number;
          navTop: number;
          startLastChoiceBottom: number;
          startLastChoiceNavOverlap: number;
          endScrollY: number;
          endLastChoiceTop: number;
          endLastChoiceBottom: number;
          endLastChoiceNavOverlap: number;
          endFeedbackBottom: number;
          endFeedbackNavOverlap: number;
        }>(`(() => {
          document.documentElement.style.scrollBehavior = 'auto';
          const read = () => {
            const nav = document.querySelector('.mobile-nav').getBoundingClientRect();
            const choices = [...document.querySelectorAll('.dialog-choice')];
            const last = choices[choices.length - 1].getBoundingClientRect();
            const feedback = document.querySelector('.dialog-feedback')?.getBoundingClientRect();
            return { navTop: nav.top, lastTop: last.top, lastBottom: last.bottom, overlap: Math.max(0, Math.min(last.bottom, nav.bottom) - Math.max(last.top, nav.top)), feedbackBottom: feedback?.bottom ?? -1, feedbackOverlap: feedback ? Math.max(0, Math.min(feedback.bottom, nav.bottom) - Math.max(feedback.top, nav.top)) : -1 };
          };
          window.scrollTo({ top: 0, behavior: 'instant' });
          const start = read();
          window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
          const end = read();
          return { width: innerWidth, height: innerHeight, scrollMax: document.documentElement.scrollHeight - innerHeight, navTop: end.navTop, startLastChoiceBottom: start.lastBottom, startLastChoiceNavOverlap: start.overlap, endScrollY: scrollY, endLastChoiceTop: end.lastTop, endLastChoiceBottom: end.lastBottom, endLastChoiceNavOverlap: end.overlap, endFeedbackBottom: end.feedbackBottom, endFeedbackNavOverlap: end.feedbackOverlap };
        })()`);
        expect(reachability.width).toBe(width);
        expect(reachability.height).toBe(640);
        expect(reachability.scrollMax, `dialog can scroll at ${width}×640`).toBeGreaterThan(0);
        expect(reachability.endScrollY, `dialog reaches its scroll end at ${width}×640`).toBeGreaterThan(0);
        expect(reachability.endLastChoiceTop, `last answer is in the viewport at ${width}×640`).toBeGreaterThanOrEqual(0);
        expect(reachability.endLastChoiceBottom, `last answer clears the viewport at ${width}×640`).toBeLessThanOrEqual(640);
        expect(reachability.endLastChoiceNavOverlap, `last answer is not covered by the fixed bar at ${width}×640`).toBe(0);
        expect(reachability.endFeedbackBottom, `dialog feedback clears the fixed bar at ${width}×640`).toBeLessThanOrEqual(reachability.navTop);
        expect(reachability.endFeedbackNavOverlap, `dialog feedback is fully readable at the scroll end at ${width}×640`).toBe(0);
      }

      await browser.click('.dialog-choice-row:first-child .dialog-choice');
      for (const width of [320, 360, 390]) {
        await browser.setViewport(width, 640);
        const nextReachability = await browser.evaluate<{ width: number; height: number; scrollMax: number; endScrollY: number; navTop: number; nextTop: number; nextBottom: number; nextNavOverlap: number }>(`(() => {
          document.documentElement.style.scrollBehavior = 'auto';
          const read = () => {
            const nav = document.querySelector('.mobile-nav').getBoundingClientRect();
            const next = document.querySelector('.dialog-next-btn').getBoundingClientRect();
            return { navTop: nav.top, top: next.top, bottom: next.bottom, overlap: Math.max(0, Math.min(next.bottom, nav.bottom) - Math.max(next.top, nav.top)) };
          };
          window.scrollTo({ top: 0, behavior: 'instant' });
          window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
          const end = read();
          return { width: innerWidth, height: innerHeight, scrollMax: document.documentElement.scrollHeight - innerHeight, endScrollY: scrollY, navTop: end.navTop, nextTop: end.top, nextBottom: end.bottom, nextNavOverlap: end.overlap };
        })()`);
        expect(nextReachability.width).toBe(width);
        expect(nextReachability.height).toBe(640);
        expect(nextReachability.scrollMax, `post-answer dialog can scroll at ${width}×640`).toBeGreaterThan(0);
        expect(nextReachability.endScrollY, `Next is reachable at the scroll end at ${width}×640`).toBeGreaterThan(0);
        expect(nextReachability.nextTop, `Next is in the viewport at ${width}×640`).toBeGreaterThanOrEqual(0);
        expect(nextReachability.nextBottom, `Next clears the viewport at ${width}×640`).toBeLessThanOrEqual(640);
        expect(nextReachability.nextNavOverlap, `Next is not covered by the fixed bar at ${width}×640`).toBe(0);
      }
    } finally {
      await browser?.close();
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
