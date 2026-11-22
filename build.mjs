import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const sourceDirectory = new URL('./', import.meta.url);

export async function buildSite(outputDirectory = new URL('./dist/', sourceDirectory)) {
  // Dependencies precede their importers so every module uses matching assets.
  const modules = ['timer.js', 'session.js', 'history.js', 'calendar.js', 'app.js'];
  const names = ['index.html', ...modules, 'styles.css', 'icon.svg'];
  const contents = await Promise.all(names.map(name => readFile(new URL(name, sourceDirectory), 'utf8')));
  const sources = Object.fromEntries(names.map((name, index) => [name, contents[index]]));
  const output = outputDirectory instanceof URL ? fileURLToPath(outputDirectory) : outputDirectory;
  const fingerprint = (name, text) => name.replace(/(\.[^.]+)$/, '.'
    + createHash('sha256').update(text).digest('hex').slice(0, 16) + '$1');
  // Keep unversioned aliases loadable for older source references.
  const files = { ...sources };
  const versioned = new Map();
  for (const name of [...modules, 'styles.css', 'icon.svg']) {
    let text = sources[name];
    if (name.endsWith('.js')) {
      text = text.replace(/from '\.\/([^']+)'/g, (_, dependency) => {
        if (!versioned.has(dependency)) throw new Error('Unresolved build dependency: ' + dependency);
        return `from './${versioned.get(dependency)}'`;
      });
    }
    const filename = fingerprint(name, text);
    versioned.set(name, filename);
    files[filename] = text;
  }
  files['index.html'] = sources['index.html'];
  for (const name of ['app.js', 'styles.css', 'icon.svg']) {
    files['index.html'] = files['index.html'].replaceAll('./' + name, './' + versioned.get(name));
  }
  await mkdir(output, { recursive: true });
  await Promise.all(Object.entries(files).map(([name, text]) => writeFile(resolve(output, name), text)));
  return Object.keys(files);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const files = await buildSite();
  console.log('Built versioned static site in dist/: ' + files.join(', '));
}
