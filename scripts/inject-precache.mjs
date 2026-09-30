import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const assetRoot = path.join(dist, 'assets');
const workerPath = path.join(dist, 'sw.js');
const marker = 'const BUILD_ASSETS = [];';

async function listBuildAssets(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listBuildAssets(fullPath);
    return entry.isFile() && /\.(?:js|css)$/i.test(entry.name) ? [fullPath] : [];
  }));
  return files.flat();
}

const files = (await listBuildAssets(assetRoot))
  .map((file) => `./${path.relative(dist, file).split(path.sep).join('/')}`)
  .sort();
if (!files.some((file) => file.endsWith('.js')) || !files.some((file) => file.endsWith('.css'))) {
  throw new Error('Build precache generation expected at least one JavaScript and one CSS bundle.');
}

const worker = await readFile(workerPath, 'utf8');
if (!worker.includes(marker)) {
  throw new Error(`Service worker template marker not found in ${workerPath}.`);
}
await writeFile(workerPath, worker.replace(marker, `const BUILD_ASSETS = ${JSON.stringify(files)};`));
