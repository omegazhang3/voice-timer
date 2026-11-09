import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildSite } from '../build.mjs';

test('published page bypasses a stale unversioned speech module', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'voice-timer-build-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await buildSite(directory);
  await writeFile(join(directory, 'package.json'), JSON.stringify({ type: 'module' }));

  // Reproduce a client still resolving the original timer.js to an old release.
  await writeFile(join(directory, 'timer.js'), 'export function spokenTime(seconds) { return seconds + " seconds elapsed."; }');
  const html = await readFile(join(directory, 'index.html'), 'utf8');
  const entryPath = html.match(/<script type="module" src="([^"]+)"/)[1];
  const entryURL = new URL(entryPath, pathToFileURL(join(directory, 'index.html')));
  const app = await readFile(entryURL, 'utf8');
  const timerPath = app.match(/from '([^']+)'/)[1];
  const publishedTimer = await import(new URL(timerPath, entryURL).href);

  assert.equal(publishedTimer.spokenTime(5, true), '5 seconds.');
  assert.equal(publishedTimer.spokenTime(65, true), '65 seconds.');
  assert.equal(publishedTimer.spokenTime(5), '5 seconds elapsed.');
});
