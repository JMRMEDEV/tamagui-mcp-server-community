export const ALLOWED_PREFIXES = ['/docs/', '/ui/'];

export function isAllowedRoute(route) {
  return ALLOWED_PREFIXES.some(p => route.startsWith(p));
}

export function shouldSkip(url) {
  if (!url) return true;
  if (url.startsWith('#')) return true;
  if (url.includes('github.com')) return true;
  if (url.includes('discord')) return true;
  if (url.includes('twitter.com') || url.includes('x.com')) return true;
  if (url.includes('figma.com')) return true;
  if (/\.(png|jpg|svg|gif|ico|css|js|woff|woff2)$/i.test(url)) return true;
  return false;
}
