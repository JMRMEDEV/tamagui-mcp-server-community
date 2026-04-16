import { CRAWL_DELAY_MS } from '../config/project.js';
import { routeToLlmsUrl, routeToLocalPath } from '../utils/pathing.js';
import { writeText } from '../utils/fs.js';
import { sha256 } from '../utils/hash.js';
import { log } from '../utils/logger.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function downloadLlmsFile(route) {
  const llmsUrl = routeToLlmsUrl(route);
  const localPath = routeToLocalPath(route);
  await sleep(CRAWL_DELAY_MS);
  try {
    const res = await fetch(llmsUrl, {
      headers: { 'User-Agent': 'tamagui-mcp-server-community/1.0' },
      redirect: 'follow',
    });
    if (!res.ok) {
      log.warn(`Failed to download ${llmsUrl}: ${res.status}`);
      return null;
    }
    const text = await res.text();
    if (!text.trim()) {
      log.warn(`Empty llms.txt for ${route}`);
      return null;
    }
    writeText(localPath, text);
    return {
      route,
      llmsUrl,
      localPath,
      hash: sha256(text),
      byteSize: Buffer.byteLength(text),
      downloadedAt: new Date().toISOString(),
      status: 'ok',
    };
  } catch (err) {
    log.error(`Error downloading ${llmsUrl}:`, err.message);
    return null;
  }
}
