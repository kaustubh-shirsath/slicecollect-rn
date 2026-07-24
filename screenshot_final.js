const { chromium } = require('playwright');
const OUT = '/Users/kaustubhsatishshirsath/Desktop/slicefield-screenshots';

const tab = (page, name) => page.getByRole('tab', { name: new RegExp(name, 'i') }).first();

async function ss(page, file) {
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${file}` });
  console.log('✓', file);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  // Login
  await page.goto('http://localhost:8081');
  await page.waitForLoadState('networkidle');
  await ss(page, '01_login.png');

  const inputs = page.locator('input');
  await inputs.first().fill('EMP-DBR-001');
  await inputs.nth(1).fill('000000');
  await page.locator('text=Login →').click();
  await page.waitForTimeout(3000);
  await ss(page, '02_home.png');

  // Cases
  await tab(page, 'Cases').click();
  await page.waitForTimeout(2000);
  await ss(page, '03_allocations.png');

  // Try to find and click a case card (any pressable/link in case list)
  try {
    // Find all links/pressables excluding tabs
    const links = page.locator('a:not([role="tab"])');
    const count = await links.count();
    console.log('links found:', count);
    if (count > 0) {
      await links.first().click();
      await ss(page, '04_customer_detail.png');

      // Disposition button
      try {
        await page.locator('text=/Mark Disposition|Add Feedback|Disposition/i').first().click();
        await page.waitForTimeout(1000);
        await ss(page, '05_disposition.png');
        await page.goBack(); await page.waitForTimeout(800);
      } catch(e) { console.log('disp:', e.message.slice(0,80)); }

      // Settlement
      try {
        await page.locator('text=/Settlement/i').first().click();
        await page.waitForTimeout(1000);
        await ss(page, '07_settlement.png');
        await page.goBack(); await page.waitForTimeout(800);
      } catch(e) { console.log('settle:', e.message.slice(0,80)); }

      // Payment Link
      try {
        await page.locator('text=/Payment Link/i').first().click();
        await page.waitForTimeout(1000);
        await ss(page, '08_payment_link.png');
        await page.goBack(); await page.waitForTimeout(800);
      } catch(e) { console.log('paylink:', e.message.slice(0,80)); }

      await page.goBack(); await page.waitForTimeout(800);
    }
  } catch(e) { console.log('case card:', e.message.slice(0,80)); }

  // Route
  await tab(page, 'Route').click();
  await page.waitForTimeout(2000);
  await ss(page, '06_smart_route.png');

  // Visits
  await tab(page, 'Visits').click();
  await page.waitForTimeout(2000);
  await ss(page, '09_my_collections.png');

  // Profile (avatar button top right of home)
  await tab(page, 'Home').click();
  await page.waitForTimeout(1500);
  try {
    // Profile is usually accessible via a "G" or avatar at top right
    const avatarBtn = page.locator('text=G').first(); // Gakul's initial
    await avatarBtn.click();
    await page.waitForTimeout(1000);
    await ss(page, '12_profile.png');
  } catch(e) {
    console.log('profile via avatar:', e.message.slice(0,60));
    // Try clicking top right corner (profile icon position)
    await page.mouse.click(360, 50);
    await page.waitForTimeout(1000);
    await ss(page, '12_profile.png');
  }

  await browser.close();
  console.log('DONE');
})();
