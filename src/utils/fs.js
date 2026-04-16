import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { dirname } from 'path';

export function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

export function writeJson(path, data) {
  ensureDir(dirname(path));
  writeFileSync(path, JSON.stringify(data, null, 2));
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

export function writeText(path, text) {
  ensureDir(dirname(path));
  writeFileSync(path, text, 'utf-8');
}

export function readText(path) {
  return readFileSync(path, 'utf-8');
}

export { existsSync };
