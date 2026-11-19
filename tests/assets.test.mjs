import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
const root = resolve('client');
test('All local HTML and CSS assets, section links, and module imports resolve', async () => {
  const html = await readFile(resolve(root, 'index.html'), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'No duplicate IDs');
  for (const [, target] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (target === '#') continue;
    if (target.startsWith('#')) assert.ok(ids.includes(target.slice(1)), target);
    else await access(resolve(root, target));
  }
  async function walk(directory) {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, item.name);
      if (item.isDirectory()) await walk(path);
      else if (/\.(css|js)$/.test(item.name)) {
        const content = await readFile(path, 'utf8');
        const pattern = item.name.endsWith('.css') ? /url\(['"]?([^)'"\s]+)['"]?\)/g : /from\s+['"]([^'"]+)['"]/g;
        for (const [, reference] of content.matchAll(pattern)) await access(resolve(dirname(path), reference));
      }
    }
  }
  await walk(root);
});
