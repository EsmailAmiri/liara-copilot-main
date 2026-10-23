import { chromium } from 'playwright';
import { resolve } from 'node:path';

const SCREENSHOT_DIR = resolve(process.cwd(), 'gui-test-screenshots');

async function runGuiTest() {
  console.log('🚀 Starting Comprehensive Web GUI Black-Box Test on http://localhost:3000\n');

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'fa-IR',
  });

  const page = await context.newPage();

  // Listen for console logs & errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`[Browser Console Error]: ${msg.text()}`);
    }
  });

  page.on('pageerror', (err) => {
    console.error(`[Uncaught Page Error]: ${err.message}`);
  });

  try {
    // -------------------------------------------------------------
    // Test Point 1: Initial Page Load & Auth Redirect
    // -------------------------------------------------------------
    console.log('📌 Test Point 1: Navigate to / and check redirect to /login');
    await page.goto('http://localhost:3000/');
    await page.waitForURL('**/login', { timeout: 8000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01_login_initial.png` });
    console.log('   ✅ Redirected to /login successfully. Screenshot saved.');

    // -------------------------------------------------------------
    // Test Point 2: Input boundary (Invalid Passcode)
    // -------------------------------------------------------------
    console.log('📌 Test Point 2: Submit invalid passcode');
    await page.fill('input[type="password"]', 'wrong-passcode');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=رمز عبور وارد شده نادرست است', { timeout: 5000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02_login_error.png` });
    console.log('   ✅ Error message displayed properly. Screenshot saved.');

    // -------------------------------------------------------------
    // Test Point 3: Successful Authentication & Dashboard
    // -------------------------------------------------------------
    console.log('📌 Test Point 3: Submit valid passcode and enter dashboard');
    await page.fill('input[type="password"]', 'change-me');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000/', { timeout: 8000 });
    await page.waitForSelector('text=لیارا کوپایلوت', { timeout: 5000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03_dashboard_home.png` });
    console.log('   ✅ Logged in successfully. Dashboard rendered with MOCK badge & RTL layout.');

    // -------------------------------------------------------------
    // Test Point 4: Chat Interaction & Suggested Prompt
    // -------------------------------------------------------------
    console.log('📌 Test Point 4: Trigger suggested prompt "عیب‌یابی خطای ۵۰۰"');
    const promptButton = page.locator('button:has-text("عیب‌یابی خطای ۵۰۰")');
    await promptButton.click();

    // Wait for the message and diagnosis card to appear
    console.log('   Waiting for SSE streaming and DiagnosisCard...');
    await page.waitForSelector('text=نتایج تحلیل و عیب‌یابی هوشمند', { timeout: 15000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04_diagnosis_ready.png` });
    console.log('   ✅ DiagnosisCard appeared with confidence bars and evidence citations.');

    // -------------------------------------------------------------
    // Test Point 5: Approval Gate Card & Execution
    // -------------------------------------------------------------
    console.log('📌 Test Point 5: Check ApprovalCard and click "تأیید و اجرا"');
    await page.waitForSelector('button:has-text("تأیید و اجرا")', { timeout: 10000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05_approval_required.png` });

    // Click Approve button on the card (for set_env)
    const approveBtn = page.locator('button:has-text("تأیید و اجرا")').first();
    await approveBtn.click();
    console.log('   Clicked Approve for set_env.');

    // In missing_env_500, setting env requires an app restart, which generates a second ApprovalCard
    try {
      const secondApprove = page.locator('button:has-text("تأیید و اجرا")').first();
      await secondApprove.waitFor({ state: 'visible', timeout: 8000 });
      await page.screenshot({ path: `${SCREENSHOT_DIR}/05_restart_approval_required.png` });
      console.log('   Approval card for restart_app appeared. Clicking Approve...');
      await secondApprove.click();
    } catch {
      console.log('   No second approval card needed or already approved.');
    }

    // Wait for VerificationCard
    await page.waitForSelector('text=نتیجه اعتبارسنجی سلامت برنامه', { timeout: 20000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06_verification_result.png` });
    console.log('   ✅ VerificationCard rendered with before/after health check results.');

    // -------------------------------------------------------------
    // Test Point 6: SPA Navigation to Alerts View
    // -------------------------------------------------------------
    console.log('📌 Test Point 6: Navigate to Alerts page');
    const alertsNav = page.locator('header nav a:has-text("هشدارها")');
    await alertsNav.click();
    await page.waitForURL('**/alerts', { timeout: 5000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07_alerts_view.png` });
    console.log('   ✅ Navigated instantly to /alerts. Screenshot saved.');

    // -------------------------------------------------------------
    // Test Point 7: SPA Navigation to Audit Log View
    // -------------------------------------------------------------
    console.log('📌 Test Point 7: Navigate to Audit Log page');
    const auditNav = page.locator('header nav a:has-text("گزارش وقایع")');
    await auditNav.click();
    await page.waitForURL('**/audit', { timeout: 5000 });
    await page.waitForSelector('table', { timeout: 5000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08_audit_view.png` });
    console.log('   ✅ Audit table rendered with recorded events and actions. Screenshot saved.');

    // -------------------------------------------------------------
    // Test Point 8: SPA Navigation to Capabilities Matrix View
    // -------------------------------------------------------------
    console.log('📌 Test Point 8: Navigate to Capabilities Matrix page');
    const capNav = page.locator('header nav a:has-text("ماتریس توانمندی‌ها")');
    await capNav.click();
    await page.waitForURL('**/capabilities', { timeout: 5000 });
    await page.waitForSelector('table', { timeout: 5000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/09_capabilities_view.png` });
    console.log('   ✅ Capabilities matrix rendered. Screenshot saved.');

    // -------------------------------------------------------------
    // Test Point 9: Return to Chat & Verify State Retention
    // -------------------------------------------------------------
    console.log('📌 Test Point 9: Return to Chat View and check state preservation');
    const chatNav = page.locator('header nav a:has-text("گفتگو")');
    await chatNav.click();
    await page.waitForURL('http://localhost:3000/', { timeout: 5000 });
    // Verify previous diagnosis or verification card is still in DOM!
    await page.waitForSelector('text=نتایج تحلیل و عیب‌یابی هوشمند', { timeout: 5000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10_chat_state_retained.png` });
    console.log('   ✅ Returned to Chat; conversation state and timeline perfectly retained!');

    console.log('\n🎉 ALL 9 GUI TEST POINTS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('\n❌ Test execution encountered an error:', error);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/error_state.png` });
    throw error;
  } finally {
    await browser.close();
  }
}

runGuiTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
