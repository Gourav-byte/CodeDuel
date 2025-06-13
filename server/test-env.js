const puppeteer = require('puppeteer');

(async () => {
  try {

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    const url = 'https://codeforces.com/problemset/problem/4/A';

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    await browser.close();
    console.log('Puppeteer is working fine!');

  } catch (error) {
    console.error('Puppeteer test failed:', error.message);
    process.exit(1);
  }
})();