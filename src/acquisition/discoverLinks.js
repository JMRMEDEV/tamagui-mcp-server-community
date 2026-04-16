import * as cheerio from 'cheerio';
import { isAllowedRoute, shouldSkip } from '../config/crawl-rules.js';
import { canonicalizeRoute } from '../utils/pathing.js';

export function discoverLinks(html, sourceRoute) {
  const $ = cheerio.load(html);
  const links = new Set();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (shouldSkip(href)) return;
    const route = canonicalizeRoute(href);
    if (isAllowedRoute(route) && route !== sourceRoute) {
      links.add(route);
    }
  });
  return [...links];
}

export function extractTitle(html) {
  const $ = cheerio.load(html);
  return $('h1').first().text().trim() || $('title').text().trim() || '';
}

export function extractLlmsLink(html) {
  const $ = cheerio.load(html);
  let llmsUrl = null;
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && href.endsWith('/llms.txt')) {
      llmsUrl = href;
    }
  });
  return llmsUrl;
}
