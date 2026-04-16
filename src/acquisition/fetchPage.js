import { BASE_URL, CRAWL_DELAY_MS } from '../config/project.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function fetchPage(route) {
  const url = `${BASE_URL}${route}`;
  await sleep(CRAWL_DELAY_MS);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'tamagui-mcp-server-community/1.0' },
    redirect: 'follow',
  });
  if (!res.ok) return null;
  return { url, html: await res.text(), status: res.status };
}
