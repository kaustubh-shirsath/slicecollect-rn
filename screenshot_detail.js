const { chromium } = require('playwright');
const OUT = '/Users/kaustubhsatishshirsath/Desktop/slicefield-screenshots';

const tab = (page, name) => page.getByRole('tab', { name: new RegExp(name, 'i') }).first();

async function ss(page, file) {
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${file}` });
  console.log(file);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  await page.goto('http://localhost:8081');
  await page.waitForLoadState('networkidle');
  const inputs = page.locator('input');
  await inputs.first().fill('AGENT001');
  await inputs.nth(1).fill('password123');
  await page.locator('text=Login →').click();
  await page.waitForTimeout(2500);

  await tab(page, 'Cases').click();
  await page.waitForTimeout(1500);

  // Print all elements and their roles
  const els = await page.evaluate(() => {
    return [...document.querySelectorAll('[role]')].map(e => ({
      role: e.getAttribute('role'),
      text: e.innerText?.trim().slice(0, 50),
      tag: e.tagName
    })).filter(e => e.text);
  });
  console.log(JSON.stringify(els.slice(0, 30), null, 2));
})();
