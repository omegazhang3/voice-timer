import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const sourceDirectory = new URL('./', import.meta.url);

export async function buildSite(outputDirectory = new URL('./dist/', sourceDirectory)) {
  const read = name => readFile(new URL(name, sourceDirectory), 'utf8');
  const [html, app, timer, session, styles, icon] = await Promise.all(
    ['index.html', 'app.js', 'timer.js', 'session.js', 'styles.css', 'icon.svg'].map(read),
  );
  const output = outputDirectory instanceof URL ? fileURLToPath(outputDirectory) : outputDirectory;
  const fingerprint = (name, extension, contents) => name + '.'
    + createHash('sha256').update(contents).digest('hex').slice(0, 16) + '.' + extension;

  const timerName = fingerprint('timer', 'js', timer);
  const sessionName = fingerprint('session', 'js', session);
  if (!app.includes("from './timer.js'")) throw new Error('Timer import missing from app.js');
  if (!app.includes("from './session.js'")) throw new Error('Session import missing from app.js');
  const versionedApp = app.replace("from './timer.js'", "from './" + timerName + "'")
    .replace("from './session.js'", "from './" + sessionName + "'");
  const appName = fingerprint('app', 'js', versionedApp);
  const stylesName = fingerprint('styles', 'css', styles);
  const iconName = fingerprint('icon', 'svg', icon);
  const versionedHtml = html
    .replaceAll('./app.js', './' + appName)
    .replaceAll('./styles.css', './' + stylesName)
    .replaceAll('./icon.svg', './' + iconName);

  const files = {
    'index.html': versionedHtml,
    // Keep older, cached HTML documents loadable during this transition.
    'app.js': app,
    'timer.js': timer,
    'session.js': session,
    'styles.css': styles,
    'icon.svg': icon,
    [appName]: versionedApp,
    [timerName]: timer,
    [sessionName]: session,
    [stylesName]: styles,
    [iconName]: icon,
  };
  await mkdir(output, { recursive: true });
  await Promise.all(Object.entries(files).map(([name, contents]) => writeFile(resolve(output, name), contents)));
  return Object.keys(files);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const files = await buildSite();
  console.log('Built versioned static site in dist/: ' + files.join(', '));
}
