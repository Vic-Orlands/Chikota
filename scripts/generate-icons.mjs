import * as icons from '@radix-ui/react-icons';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdirSync, writeFileSync } from 'node:fs';
const aliases = {
  Search: 'MagnifyingGlass',
  Filter: 'MixerHorizontal',
  LayoutGrid: 'Grid',
  List: 'Rows',
  CheckSquare: 'Checkbox',
  Trash2: 'Trash',
  X: 'Cross2',
  Link: 'Link2',
  Bookmark: 'Bookmark',
  BookmarkFilled: 'BookmarkFilled',
  AllSides: 'AllSides',
  Plus: 'Plus',
  User: 'Person',
  Briefcase: 'Backpack',
  Sparkles: 'Star',
  BookOpen: 'Reader',
  Hash: 'Tokens',
  Palette: 'Mix',
  Folder: 'Stack',
  Star: 'Star',
  Heart: 'Heart',
  Zap: 'LightningBolt',
  Home: 'Home',
  Code: 'Code',
  Music: 'SpeakerLoud',
  Camera: 'Camera',
  Coffee: 'Cube',
  Gamepad2: 'Cube',
  Globe: 'Globe',
  Mail: 'EnvelopeClosed',
  Phone: 'Mobile',
  Settings: 'Gear',
  Sun: 'Sun',
  Moon: 'Moon',
  Monitor: 'Desktop',
  Info: 'InfoCircled',
  ExternalLink: 'ExternalLink',
  Bell: 'Bell',
  BellOff: 'Bell',
  Clock: 'Clock',
  Calendar: 'Calendar',
  Pencil: 'Pencil1',
  Copy: 'Copy',
  CircleCheckBig: 'CheckCircled',
  AlertTriangle: 'ExclamationTriangle',
  ArrowRight: 'ArrowRight',
  ArrowLeft: 'ArrowLeft',
  LogOut: 'Exit',
  Tags: 'Tokens',
  Edit2: 'Pencil2',
  Check: 'Check',
  MoreVertical: 'DotsVertical',
  Pin: 'DrawingPin',
  ArrowUpRight: 'ArrowTopRight',
  ChevronDown: 'ChevronDown',
  Download: 'Download',
  Upload: 'Upload',
  Archive: 'Archive',
  Cross2: 'Cross2',
  Reader: 'Reader',
  Stack: 'Stack',
  DotsHorizontal: 'DotsHorizontal',
  Keyboard: 'Keyboard',
  CheckCircled: 'CheckCircled',
  CircleCheckIcon: 'CheckCircled',
  InfoIcon: 'InfoCircled',
  Loader2Icon: 'Update',
  OctagonXIcon: 'CrossCircled',
  TriangleAlertIcon: 'ExclamationTriangle',
  XIcon: 'Cross2'
};
const root = 'src/lib/components/icons/radix';
mkdirSync(root, { recursive: true });
for (const [name, source] of Object.entries(aliases)) {
  const svg = renderToStaticMarkup(createElement(icons[source + 'Icon']));
  const inner = svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'));
  writeFileSync(
    `${root}/${name}.svelte`,
    `<script lang="ts">\nimport type { SVGAttributes } from 'svelte/elements';\nlet { size = 16, ...props }: SVGAttributes<SVGSVGElement> & { size?: number | string } = $props();\n</script>\n<svg width={size} height={size} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>${inner}</svg>\n`
  );
}
writeFileSync(
  `${root}/index.ts`,
  Object.keys(aliases)
    .map((n) => `export { default as ${n} } from './${n}.svelte';`)
    .join('\n') + '\n'
);
