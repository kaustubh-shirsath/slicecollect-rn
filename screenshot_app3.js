const { chromium } = require('playwright');
const OUT = '/Users/kaustubhsatishshirsath/Desktop/slicefield-screenshots';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  await page.goto('http://localhost:8081');
  await page.waitForLoadState('networkidle');
  
  // Login using keyboard navigation
  const inputs = page.locator('input');
  await inputs.first().fill('AGENT001');
  await inputs.nth(1).fill('password123');
  await page.locator('text=Login →').click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/02_home.png` });

  // Get text on screen after login
  const texts = await page.evaluate(() => {
    return [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && e.innerText?.trim()).map(e => e.innerText.trim()).filter(t => t.length < 40);
  });
  console.log(JSON.stringify([...new Set(texts)].slice(0, 50), null, 2));

  await browser.close();
})();
