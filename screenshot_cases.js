const { chromium } = require('playwright');
const OUT = '/Users/kaustubhsatishshirsath/Desktop/slicefield-screenshots';
const tab = (page, name) => page.getByRole('tab', { name: new RegExp(name, 'i') }).first();
async function ss(page, file) { await page.waitForTimeout(1200); await page.screenshot({ path: `${OUT}/${file}` }); console.log('✓', file); }

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

  // Print all divs with customer-looking text
  const info = await page.evaluate(() => {
    const all = [...document.querySelectorAll('div')];
    return all.filter(d => d.innerText?.includes('DPD') || d.innerText?.includes('₹') && d.innerText.length < 200)
      .slice(0, 5)
      .map(d => ({ text: d.innerText.trim().slice(0, 100), class: d.className.slice(0, 60) }));
  });
  console.log(JSON.stringify(info, null, 2));

  // Try clicking at y=250 (where a case card would be)
  await page.mouse.click(195, 250);
  await page.waitForTimeout(1500);
  const url = page.url();
  console.log('after click url:', url);
  await ss(page, '04_customer_detail_attempt.png');

  await browser.close();
})();
