import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transform } from 'esbuild';
import { clsx } from 'clsx';

const source = resolve(process.argv[2] || '/tmp/chikota-design-lab');
const destination = resolve('static/design-lab-icons');
const require = createRequire(import.meta.url);
const revision = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const groups = [
  ['Interface', 'packages/ui/src/icons'],
  ['Social & links', 'packages/ui/src/components/icons']
];
const icons = [];
await mkdir(`${destination}/icons`, { recursive: true });
for (const [group, directory] of groups) {
  for (const file of (await readdir(`${source}/${directory}`)).filter((file) => file.endsWith('.tsx')).sort()) {
    const input = await readFile(`${source}/${directory}/${file}`, 'utf8');
    const { code } = await transform(input, { loader: 'tsx', format: 'cjs', jsx: 'transform' });
    const module = { exports: {} };
    new Function('require', 'module', 'exports', 'React', code)((id) => id === '../lib/utils' ? { cn: clsx } : require(id), module, module.exports, React);
    const components = Object.entries(module.exports).filter(([name]) => name !== '__esModule');
    if (components.length !== 1) throw new Error(`Expected one icon in ${file}`);
    const [component, Icon] = components[0];
    const name = basename(file, '.tsx');
    let svg = renderToStaticMarkup(React.createElement(Icon, { width: 24, height: 24 }));
    if (!svg.startsWith('<svg')) throw new Error(`Invalid SVG: ${file}`);
    if (!svg.includes('xmlns=')) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    await writeFile(`${destination}/icons/${name}.svg`, svg);
    icons.push({ name, component, group, svg, path: `${directory}/${file}` });
  }
}
const template = await readFile('scripts/design-lab-gallery.html', 'utf8');
const cards = icons.map((icon) => `<li class="icon-card" data-name="${icon.name}" data-group="${icon.group}">
  <div class="preview">${icon.svg}</div>
  <span class="icon-name">${icon.name}</span>
  <div class="card-actions"><button type="button" data-copy="${icon.name}" aria-label="Copy ${icon.name} SVG">Copy SVG</button><a href="icons/${icon.name}.svg" download="${icon.name}.svg" aria-label="Download ${icon.name} SVG">↓</a></div>
</li>`).join('\n');
await writeFile(`${destination}/index.html`, template.replaceAll('{{COUNT}}', String(icons.length)).replace('{{CARDS}}', cards).replaceAll('{{REVISION}}', revision));
await writeFile(`${destination}/manifest.json`, JSON.stringify({ repository: 'https://github.com/deep93333/design-lab', revision, icons: icons.map(({ svg, ...icon }) => icon) }, null, 2) + '\n');
await writeFile(`${destination}/README.md`, `# Design Lab icon gallery\n\n${icons.length} icons from https://github.com/deep93333/design-lab at commit ${revision}.\n\nIncludes every TSX icon in packages/ui/src/icons and packages/ui/src/components/icons. SVG artwork is rendered directly from the original React components.\n\nOpen index.html or visit /design-lab-icons/ on the development server. All assets are local.\n\nRegenerate with: node scripts/import-design-lab-icons.mjs /path/to/design-lab\n\nThe upstream repository does not contain a license file in this snapshot. This import does not grant additional rights to the artwork.\n`);
console.log(`Imported ${icons.length} icons at ${revision}`);
