import { createHash } from 'crypto';

export function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}
