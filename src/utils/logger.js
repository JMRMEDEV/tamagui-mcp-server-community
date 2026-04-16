const PREFIX = '[tamagui-mcp]';
export const log = {
  info: (...args) => console.error(PREFIX, ...args),
  warn: (...args) => console.error(PREFIX, 'WARN', ...args),
  error: (...args) => console.error(PREFIX, 'ERROR', ...args),
};
