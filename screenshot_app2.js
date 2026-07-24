const { chromium } = require('playwright');
const OUT = '/Users/kaustubhsatishshirsath/Desktop/slicefield-screenshots';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  await page.goto('http://localhost:8081');
  await page.waitForLoadState('networkidle');
  await page.fill('input[placeholder="Enter your employee ID"]', 'AGENT001');
  await page.fill('input[placeholder="Enter password"]', 'password');
  await page.click('text=Login');
  await page.waitForTimeout(2000);

  // Print all clickable text on screen
  const texts = await page.evaluate(() => {
    return [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && e.innerText?.trim()).map(e => e.innerText.trim()).filter(t => t.length < 30);
  });
  console.log(JSON.stringify([...new Set(texts)], null, 2));

  await browser.close();
})();
