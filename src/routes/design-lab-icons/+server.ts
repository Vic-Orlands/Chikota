import gallery from '../../../static/design-lab-icons/index.html?raw';

export const trailingSlash = 'always';

export function GET() {
  return new Response(gallery, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
