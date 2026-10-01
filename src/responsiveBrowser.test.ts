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
  const configured = process.env.CHROME_BIN ?? process.env.CHROMIUM_BIN;
  const candidates = configured
    ? [configured]
    : ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable'];
  const available = candidates.find((candidate) => spawnSync(candidate, ['--version'], { stdio: 'ignore' }).status === 0);
  if (!available) {
    const reason = configured
      ? `Configured browser "${configured}" did not start successfully.`
      : 'No Chromium/Chrome binary was found on PATH.';
    throw new Error(`${reason} The responsive browser suite requires an installed system browser; install Chromium/Chrome or set CHROME_BIN to its executable path (CHROMIUM_BIN is also accepted). Run it with pnpm test:browser.`);
  }
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
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try {
      const response = await fetch(targetsUrl);
      targets = await response.json() as typeof targets;
      if (targets.some((target) => target.type === 'page')) break;
    } catch {
      targets = [];
    }
    if (child.exitCode !== null || child.signalCode !== null) break;
    if (attempt < 149) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const pageTarget = targets.find((target) => target.type === 'page');
  if (!pageTarget) {
    child.kill('SIGTERM');
    throw new Error(`Chromium created no page target within 15 seconds: ${startupLog.slice(-1000)}`);
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
      mobile: true,
      screenWidth: width,
      screenHeight: height,
    });
    await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  }

  async function click(selector: string) {
    await evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!(element instanceof HTMLElement)) throw new Error('Missing element: ' + ${JSON.stringify(selector)}); element.click(); return true; })()`);
    await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  }

  async function touchTap(selector: string) {
    const point = await evaluate<{ x: number; y: number }>(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!(element instanceof HTMLElement)) throw new Error('Missing element: ' + ${JSON.stringify(selector)}); const rect = element.getBoundingClientRect(); return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; })()`);
    await command('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1, configuration: 'mobile' });
    await command('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: point.y, id: 1, radiusX: 1, radiusY: 1, force: 1 }] });
    await command('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await evaluate('new Promise((resolve) => requestAnimationFrame(resolve))');
  }

  async function pressKey(key: 'Tab' | 'Enter') {
    const keyCode = key === 'Tab' ? 9 : 13;
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, ...(key === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}) });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
    await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  }

  async function tabUntil(selector: string, maxTabs = 20): Promise<boolean> {
    for (let index = 0; index < maxTabs; index += 1) {
      await pressKey('Tab');
      if (await evaluate<boolean>(`document.activeElement instanceof HTMLElement && document.activeElement.matches(${JSON.stringify(selector)})`)) return true;
    }
    return false;
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
    touchTap,
    pressKey,
    tabUntil,
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

  it('preserves first-run state and keeps wrong-answer feedback, answer controls, and keyboard focus visible in Chromium', async () => {
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
      const activeBrowser = await launchChromium(`http://127.0.0.1:${address.port}/`, join(tempDir, 'chrome-profile'));
      browser = activeBrowser;
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
      const readDialogGeometry = () => activeBrowser.evaluate<{
        width: number;
        height: number;
        scrollY: number;
        navTop: number;
        feedbackTop: number;
        feedbackBottom: number;
        feedbackText: string;
        choices: Array<{ top: number; bottom: number; disabled: boolean }>;
        focusedChoice: number;
        focusTop: number | null;
        focusBottom: number | null;
        focusVisible: boolean;
        focusOutlineWidth: number;
      }>(`(() => {
        const navigation = document.querySelector('.mobile-nav');
        const message = document.querySelector('.dialog-feedback');
        const choices = [...document.querySelectorAll('.dialog-choice')];
        const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const feedbackRect = message?.getBoundingClientRect();
        const focusRect = focused?.getBoundingClientRect();
        return {
          width: innerWidth,
          height: innerHeight,
          scrollY,
          navTop: navigation?.getBoundingClientRect().top ?? innerHeight,
          feedbackTop: feedbackRect?.top ?? -1,
          feedbackBottom: feedbackRect?.bottom ?? -1,
          feedbackText: message?.textContent?.trim() ?? '',
          choices: choices.map((choice) => {
            const rect = choice.getBoundingClientRect();
            return { top: rect.top, bottom: rect.bottom, disabled: choice.disabled };
          }),
          focusedChoice: choices.indexOf(focused),
          focusTop: focusRect?.top ?? null,
          focusBottom: focusRect?.bottom ?? null,
          focusVisible: focused?.matches(':focus-visible') ?? false,
          focusOutlineWidth: focused ? Number.parseFloat(getComputedStyle(focused).outlineWidth) : 0,
        };
      })()`);

      await browser.evaluate(`(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        const navigation = document.querySelector('.mobile-nav').getBoundingClientRect();
        const answer = document.querySelector('.dialog-choice-row:nth-child(2) .dialog-choice').getBoundingClientRect();
        window.scrollBy({ top: Math.max(0, answer.bottom - (navigation.top - 12)), behavior: 'instant' });
        return true;
      })()`);
      const beforeWrongTap = await readDialogGeometry();
      expect(beforeWrongTap.choices[1].top).toBeGreaterThanOrEqual(0);
      expect(beforeWrongTap.choices[1].bottom).toBeLessThanOrEqual(beforeWrongTap.navTop - 8);
      await browser.touchTap('.dialog-choice-row:nth-child(2) .dialog-choice');
      const feedbackAt640 = await readDialogGeometry();
      expect(feedbackAt640.width).toBe(320);
      expect(feedbackAt640.height).toBe(640);
      expect(feedbackAt640.feedbackText).toContain('ليس هذا الرد الأنسب');
      expect(feedbackAt640.feedbackTop).toBeGreaterThanOrEqual(0);
      expect(feedbackAt640.feedbackBottom, 'the complete wrong-answer message is above the fixed navigation at 320×640').toBeLessThanOrEqual(feedbackAt640.navTop - 8);
      expect(feedbackAt640.scrollY, 'the app automatically brings feedback into view after the tap').toBeGreaterThan(beforeWrongTap.scrollY);
      expect(feedbackAt640.choices[2].disabled, 'the third answer remains enabled after a wrong tap').toBe(false);
      expect(feedbackAt640.choices[2].top).toBeGreaterThanOrEqual(0);
      expect(feedbackAt640.choices[2].bottom, 'the third answer clears the fixed navigation at 320×640').toBeLessThanOrEqual(feedbackAt640.navTop - 8);
      expect(feedbackAt640.focusedChoice, 'the tapped answer retains keyboard focus after automatic scrolling').toBe(1);
      expect(feedbackAt640.focusTop).toBeGreaterThanOrEqual(0);
      expect(feedbackAt640.focusBottom).toBeLessThanOrEqual(feedbackAt640.navTop - 8);

      await browser.pressKey('Tab');
      const keyboardAt640 = await readDialogGeometry();
      expect(keyboardAt640.focusedChoice, 'Tab reaches the next available answer').toBe(2);
      expect(keyboardAt640.focusVisible).toBe(true);
      expect(keyboardAt640.focusOutlineWidth).toBeGreaterThanOrEqual(3);
      expect(keyboardAt640.focusTop).toBeGreaterThanOrEqual(0);
      expect(keyboardAt640.focusBottom).toBeLessThanOrEqual(keyboardAt640.navTop - 8);
      expect(keyboardAt640.feedbackBottom).toBeLessThanOrEqual(keyboardAt640.navTop - 8);
      await browser.pressKey('Enter');
      const keyboardAnswerAt640 = await readDialogGeometry();
      expect(keyboardAnswerAt640.focusedChoice).toBe(2);
      expect(keyboardAnswerAt640.feedbackBottom).toBeLessThanOrEqual(keyboardAnswerAt640.navTop - 8);

      await browser.setViewport(320, 720);
      await browser.touchTap('.dialog-choice-row:nth-child(2) .dialog-choice');
      const feedbackAt720 = await readDialogGeometry();
      expect(feedbackAt720.width).toBe(320);
      expect(feedbackAt720.height).toBe(720);
      expect(feedbackAt720.feedbackText).toContain('ليس هذا الرد الأنسب');
      expect(feedbackAt720.feedbackTop).toBeGreaterThanOrEqual(0);
      expect(feedbackAt720.feedbackBottom, 'the complete wrong-answer message is above the fixed navigation at 320×720').toBeLessThanOrEqual(feedbackAt720.navTop - 8);
      expect(feedbackAt720.choices[2].disabled).toBe(false);
      expect(feedbackAt720.choices[2].top).toBeGreaterThanOrEqual(0);
      expect(feedbackAt720.choices[2].bottom).toBeLessThanOrEqual(feedbackAt720.navTop - 8);
      expect(feedbackAt720.focusedChoice).toBe(1);
      expect(feedbackAt720.focusTop).toBeGreaterThanOrEqual(0);
      expect(feedbackAt720.focusBottom).toBeLessThanOrEqual(feedbackAt720.navTop - 8);
      await browser.pressKey('Tab');
      const keyboardAt720 = await readDialogGeometry();
      expect(keyboardAt720.focusedChoice).toBe(2);
      expect(keyboardAt720.focusVisible).toBe(true);
      expect(keyboardAt720.focusOutlineWidth).toBeGreaterThanOrEqual(3);
      expect(keyboardAt720.focusTop).toBeGreaterThanOrEqual(0);
      expect(keyboardAt720.focusBottom).toBeLessThanOrEqual(keyboardAt720.navTop - 8);
      expect(keyboardAt720.feedbackBottom).toBeLessThanOrEqual(keyboardAt720.navTop - 8);
      await browser.pressKey('Enter');
      const keyboardAnswerAt720 = await readDialogGeometry();
      expect(keyboardAnswerAt720.focusedChoice).toBe(2);
      expect(keyboardAnswerAt720.feedbackBottom).toBeLessThanOrEqual(keyboardAnswerAt720.navTop - 8);

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

      await browser.setViewport(320, 720);
      await browser.evaluate(`window.scrollTo({ top: 0, behavior: 'instant' }); true`);
      expect(await browser.tabUntil('.dialog-next-btn'), 'Tab reaches Weiter after a correct answer at 320×720').toBe(true);
      const nextAt720 = await browser.evaluate<{ text: string; disabled: boolean; top: number; bottom: number; navTop: number; focused: boolean; focusVisible: boolean; outlineWidth: number }>(`(() => {
        const next = document.querySelector('.dialog-next-btn');
        const nav = document.querySelector('.mobile-nav');
        const rect = next.getBoundingClientRect();
        return {
          text: next.textContent?.trim() ?? '',
          disabled: next.disabled,
          top: rect.top,
          bottom: rect.bottom,
          navTop: nav.getBoundingClientRect().top,
          focused: document.activeElement === next,
          focusVisible: next.matches(':focus-visible'),
          outlineWidth: Number.parseFloat(getComputedStyle(next).outlineWidth),
        };
      })()`);
      expect(nextAt720.text).toContain('Weiter');
      expect(nextAt720.disabled).toBe(false);
      expect(nextAt720.focused).toBe(true);
      expect(nextAt720.focusVisible).toBe(true);
      expect(nextAt720.outlineWidth).toBeGreaterThanOrEqual(3);
      expect(nextAt720.top).toBeGreaterThanOrEqual(0);
      expect(nextAt720.bottom).toBeLessThanOrEqual(nextAt720.navTop - 8);

      await browser.pressKey('Enter');
      const advancedByKeyboard = await browser.evaluate<{ heading: string; nextExists: boolean }>(`(() => ({ heading: document.querySelector('.dialog-step-label')?.textContent?.trim() ?? '', nextExists: Boolean(document.querySelector('.dialog-next-btn')) }))()`);
      expect(advancedByKeyboard.heading).toContain('SCHRITT 2 / 3');
      expect(advancedByKeyboard.nextExists).toBe(false);
    } finally {
      await browser?.close();
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
