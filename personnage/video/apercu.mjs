// Usage : node apercu.mjs <Composition> <sortie.png> <image1> <image2> ...
// Recompile une seule fois, rend les images demandées et les colle en planche.
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import path from 'node:path';

const [id, sortie, ...frames] = process.argv.slice(2);
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.js')});
const composition = await selectComposition({serveUrl, id, browserExecutable});
const fichiers = [];
for (const frame of frames) {
  const output = `out/_${frame}.png`;
  await renderStill({serveUrl, composition, frame: Number(frame), output, scale: 0.3, browserExecutable});
  fichiers.push(output);
}
if (fichiers.length === 1) {
  execFileSync('cp', [fichiers[0], sortie]);
  process.exit(0);
}
const par = Math.min(6, fichiers.length);
const lignes = Math.ceil(fichiers.length / par);
const args = ['-loglevel', 'error', '-y', ...fichiers.flatMap((f) => ['-i', f])];
const layout = fichiers.map((_, i) => `${(i % par) * 324}_${Math.floor(i / par) * 576}`).join('|');
args.push('-filter_complex', `xstack=inputs=${fichiers.length}:layout=${layout}:fill=black`, sortie);
execFileSync('ffmpeg', args);
console.log('ok', sortie);
