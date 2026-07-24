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
  await ss(page, '03_allocations.png');

  // Find any element with a customer name from our dataset
  const el = await page.evaluate(() => {
    const all = [...document.querySelectorAll('div, span')];
    const match = all.find(e => e.innerText?.trim().length > 5 && e.innerText?.trim().length < 40 && (e.innerText.includes('DPD') || e.innerText.match(/[A-Z][a-z]+ [A-Z][a-z]+/) ));
    if (match) {
      const r = match.getBoundingClientRect();
      return { text: match.innerText.trim(), x: r.x + r.width/2, y: r.y + r.height/2 };
    }
    return null;
  });
  console.log('found element:', el);

  if (el) {
    await page.mouse.click(el.x, el.y);
    await page.waitForTimeout(2000);
    await ss(page, '04_customer_detail.png');

    // Now look for action buttons
    const btns = await page.evaluate(() => {
      return [...document.querySelectorAll('div, span')].filter(e => {
        const t = e.innerText?.trim();
        return t && t.length < 30 && (t.includes('Disposition') || t.includes('Settlement') || t.includes('Payment'));
      }).map(e => {
        const r = e.getBoundingClientRect();
        return { text: e.innerText.trim(), x: r.x + r.width/2, y: r.y + r.height/2 };
      });
    });
    console.log('buttons:', btns.slice(0,10));

    for (const btn of btns) {
      if (btn.text.includes('Disposition')) {
        await page.mouse.click(btn.x, btn.y);
        await page.waitForTimeout(2000);
        await ss(page, '05_disposition.png');
        await page.goBack(); await page.waitForTimeout(1000);
      }
    }
    for (const btn of btns) {
      if (btn.text.includes('Settlement')) {
        await page.mouse.click(btn.x, btn.y);
        await page.waitForTimeout(2000);
        await ss(page, '07_settlement.png');
        await page.goBack(); await page.waitForTimeout(1000);
      }
    }
    for (const btn of btns) {
      if (btn.text.includes('Payment')) {
        await page.mouse.click(btn.x, btn.y);
        await page.waitForTimeout(2000);
        await ss(page, '08_payment_link.png');
        await page.goBack(); await page.waitForTimeout(1000);
      }
    }
  }

  await browser.close();
})();
