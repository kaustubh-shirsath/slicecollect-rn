const { chromium } = require('playwright');
const path = require('path');

const OUT = '/Users/kaustubhsatishshirsath/Desktop/slicefield-screenshots';
const BASE = 'http://localhost:8081';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  // Login
  await page.goto(BASE);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${OUT}/01_login.png` });
  console.log('01_login done');

  // Fill login and submit
  await page.fill('input[placeholder="Enter your employee ID"]', 'AGENT001');
  await page.fill('input[placeholder="Enter password"]', 'password');
  await page.click('text=Login');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/02_home.png` });
  console.log('02_home done');

  // My Cases / Allocations
  try {
    const casesBtn = page.locator('text=My Cases').first();
    await casesBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/03_allocations.png` });
    console.log('03_allocations done');
  } catch(e) { console.log('allocations nav failed:', e.message); }

  // Smart Route
  try {
    const routeBtn = page.locator('text=Smart Route').or(page.locator('text=Route')).first();
    await routeBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/06_smart_route.png` });
    console.log('06_smart_route done');
  } catch(e) { console.log('route nav failed:', e.message); }

  // My Collections
  try {
    const colBtn = page.locator('text=My Collections').or(page.locator('text=Collections')).first();
    await colBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/09_my_collections.png` });
    console.log('09_my_collections done');
  } catch(e) { console.log('collections nav failed:', e.message); }

  // Profile
  try {
    const profBtn = page.locator('text=Profile').first();
    await profBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/12_profile.png` });
    console.log('12_profile done');
  } catch(e) { console.log('profile nav failed:', e.message); }

  await browser.close();
  console.log('Done');
})();
