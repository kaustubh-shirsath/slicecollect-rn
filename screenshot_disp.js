const { chromium } = require('playwright');
const OUT = '/Users/kaustubhsatishshirsath/Desktop/slicefield-screenshots';
const tab = (page, name) => page.getByRole('tab', { name: new RegExp(name, 'i') }).first();
async function ss(page, file) { await page.waitForTimeout(1500); await page.screenshot({ path: `${OUT}/${file}` }); console.log('✓', file); }

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  await page.goto('http://localhost:8081');
  await page.waitForLoadState('networkidle');
  const inputs = page.locator('input');
  await inputs.first().fill('Gakul_Khanikar');
  await inputs.nth(1).fill('000000');
  await page.locator('text=Login →').click();
  await page.waitForTimeout(3000);

  await tab(page, 'Cases').click();
  await page.waitForTimeout(2000);

  // Click case card
  await page.mouse.click(195, 400);
  await page.waitForTimeout(2000);

  // Click "Add Feedback" button (x=195, y=788 area but it's disposition)
  await page.mouse.click(110, 788); // left button = Add Feedback
  await page.waitForTimeout(2000);
  await ss(page, '05_disposition.png');

  await browser.close();
})();
