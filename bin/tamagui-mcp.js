#!/usr/bin/env node
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { startServer } = await import(resolve(__dirname, '..', 'src', 'mcp', 'server.js'));
startServer();
