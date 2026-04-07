/* eslint-disable no-console */
import * as avenuedelabrique from './websites/avenuedelabrique.js';
import * as vinted from './websites/vinted.js';
import * as dealabs from './websites/dealabs.js';
import fs from 'node:fs/promises';

async function saveJson(filename, data) {
  await fs.writeFile(filename, JSON.stringify(data, null, 2), 'utf-8');
}

async function scrapeADLB(website = 'https://www.avenuedelabrique.com/promotions-et-bons-plans-lego') {
  try {
    console.log(`🕵️‍♀️  browsing ${website} website`);
    const deals = await avenuedelabrique.scrape(website);
    console.log(deals);
    console.log('done');
    return;
  } catch (e) {
    console.error(e);
    return;
  }
}

async function scrapeDealabs(website = 'https://www.dealabs.com/groupe/lego') {
  try {
    console.log(`🕵️‍♀️  browsing ${website} website`);
    const deals = await dealabs.scrape(website);
    console.log(deals);
    await saveJson('./dealabs-lego.json', deals);
    console.log('JSON saved to dealabs-lego.json');
    console.log('done');
    return;
  } catch (e) {
    console.error(e);
    return;
  }
}

async function scrapeVinted(lego) {
  try {
    console.log(`🕵️‍♀️  scraping lego ${lego} from vinted.fr`);
    const sales = await vinted.scrape(lego);
    console.log(sales);
    console.log('done');
    return;
  } catch (e) {
    console.error(e);
    return;
  }
}

const [, , param] = process.argv;

if (param && param.includes('dealabs.com')) {
  scrapeDealabs(param);
} else if (param && /^\d+$/.test(param)) {
  scrapeVinted(param);
} else {
  scrapeADLB(param);
}