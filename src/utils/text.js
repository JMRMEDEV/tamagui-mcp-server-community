export function normalizeWhitespace(text) {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function estimateTokens(text) {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

export function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}
