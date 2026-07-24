const { chromium } = require('playwright');
const OUT = '/Users/kaustubhsatishshirsath/Desktop/slicefield-screenshots';

async function ss(page, file) {
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${file}` });
  console.log(file);
}

const tab = (page, name) => page.getByRole('tab', { name: new RegExp(name, 'i') }).first();

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  await page.goto('http://localhost:8081');
  await page.waitForLoadState('networkidle');
  await ss(page, '01_login.png');

  const inputs = page.locator('input');
  await inputs.first().fill('AGENT001');
  await inputs.nth(1).fill('password123');
  await page.locator('text=Login →').click();
  await page.waitForTimeout(2500);
  await ss(page, '02_home.png');

  // Cases / Allocations
  await tab(page, 'Cases').click();
  await ss(page, '03_allocations.png');

  // Customer Detail — tap first case card
  try {
    await page.locator('[role="button"]').first().click();
    await ss(page, '04_customer_detail.png');

    // Disposition
    try {
      await page.locator('text=/Mark Disposition|Add Feedback|Record Visit/i').first().click();
      await ss(page, '05_disposition.png');
      await page.goBack(); await page.waitForTimeout(500);
    } catch(e) { console.log('disp:', e.message.slice(0,60)); }

    // Settlement
    try {
      await page.locator('text=/Settlement|Raise Settlement/i').first().click();
      await ss(page, '07_settlement.png');
      await page.goBack(); await page.waitForTimeout(500);
    } catch(e) { console.log('settlement:', e.message.slice(0,60)); }

    // Payment Link
    try {
      await page.locator('text=/Payment Link|Generate Payment/i').first().click();
      await ss(page, '08_payment_link.png');
      await page.goBack(); await page.waitForTimeout(500);
    } catch(e) { console.log('paylink:', e.message.slice(0,60)); }

    await page.goBack(); await page.waitForTimeout(500);
  } catch(e) { console.log('detail:', e.message.slice(0,80)); }

  // Route
  await tab(page, 'Route').click();
  await ss(page, '06_smart_route.png');

  // Visits
  await tab(page, 'Visits').click();
  await ss(page, '09_my_collections.png');

  // Profile - last tab or icon
  try {
    await tab(page, 'Profile').click();
    await ss(page, '12_profile.png');
  } catch(e) {
    // Try clicking avatar/profile icon
    try {
      await page.locator('text=A').first().click();
      await ss(page, '12_profile.png');
    } catch(e2) { console.log('profile:', e2.message.slice(0,60)); }
  }

  await browser.close();
  console.log('ALL DONE');
})();
