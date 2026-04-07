import { chromium } from 'playwright';

function toNumber(value) {
  if (!value) return null;

  const normalized = String(value)
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');

  const number = Number(normalized);
  return Number.isNaN(number) ? null : number;
}

function toInteger(value) {
  if (!value) return null;

  const match = String(value).match(/-?\d+/);
  return match ? parseInt(match[0], 10) : null;
}

function absoluteUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `https://www.dealabs.com${url}`;
}

export async function scrape(url = 'https://www.dealabs.com/groupe/lego') {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('article', { timeout: 15000 });
    //console.log(await page.title());
//console.log(await page.locator('a').count());



const deals = await page.evaluate(() => {
  const articles = Array.from(document.querySelectorAll('article'));

  return articles
    .map((article) => {
      const text = article.innerText?.trim() || '';

      const title =
  article.querySelector('a[href*="/bons-plans"]')?.getAttribute('title') ||
  article.querySelector('h3')?.textContent?.trim() ||
  null;

      const anchor = Array.from(article.querySelectorAll('a[href]')).find((a) => {
  const href = a.getAttribute('href') || '';
  return href.includes('/bons-plans') || href.includes('/deal');
});

      const price = text.match(/\d+[.,]?\d*\s?€/)?.[0] || null;
      const discount = text.match(/-?\d+\s?%/)?.[0] || null;
      const temperature = text.match(/\d+°/)?.[0] || null;

      const image =
        article.querySelector('img')?.src ||
        article.querySelector('img')?.getAttribute('data-src') ||
        null;

      return {
        title,
        price,
        discount,
        temperature,
        link: anchor ? anchor.href : null,
        image
      };
    })
    .filter((deal) => deal.title && deal.link);
});

    return deals
      .filter((deal) => deal.title && deal.link)
      .map((deal) => ({
        title: deal.title,
        price: toNumber(deal.price),
        discount: Math.abs(toInteger(deal.discount)),
        temperature: toInteger(deal.temperature),
        link: absoluteUrl(deal.link),
        image: deal.image,
        source: 'dealabs'
      }));
  } finally {
    await browser.close();
  }
}