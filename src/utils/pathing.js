import { join } from 'path';
import { DIRS } from '../config/project.js';

export function canonicalizeRoute(url) {
  try {
    const u = new URL(url, 'https://tamagui.dev');
    return u.pathname.replace(/\/+$/, '') || '/';
  } catch {
    return url.replace(/\/+$/, '') || '/';
  }
}

export function routeToLocalPath(route) {
  const clean = route.replace(/^\//, '');
  return join(DIRS.llms, clean, 'llms.txt');
}

export function routeToLlmsUrl(route) {
  return `https://tamagui.dev${route}/llms.txt`;
}
