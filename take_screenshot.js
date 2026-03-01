const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  // Inject localStorage BEFORE any page scripts run
  await page.evaluateOnNewDocument(() => {
    const userId = 'screenshot-user-01';
    const users = [{
      id: userId,
      email: 'demo@linguivance.app',
      name: 'Demo',
      pw: 'dummy',
      isAdmin: true
    }];
    const appData = {
      dictionary: [],
      unknown: [],
      readings: [],
      weekActivity: { Mon: 1, Tue: 1, Wed: 1, Thu: 0, Fri: 1, Sat: 0, Sun: 0 },
      stats: { completed: {}, correct: 42, total: 60 },
      profile: { name: 'Demo', avatar: '🌍', goal: 10 },
      settings: { darkMode: false, notifications: false, sound: true },
      onboardingDone: true,
      todayWords: 3,
      todayDate: new Date().toDateString(),
      badges: [],
      streak: 7,
      level: 'Tree',
    };

    localStorage.setItem('lv_auth_users', JSON.stringify(users));
    localStorage.setItem('lv_auth_session', userId);
    localStorage.setItem('master_eng_v13', JSON.stringify(appData));
    localStorage.setItem('lv_install_dismissed', '1');

    console.log('[INJECT] localStorage set before page scripts');
  });

  const filePath = path.resolve(__dirname, 'index.html');
  const fileUrl = 'file:///' + filePath.replace(/\\/g, '/');
  console.log('Navigating to:', fileUrl);

  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait a bit for everything to render
  await new Promise(r => setTimeout(r, 2000));

  // Log auth state
  const authState = await page.evaluate(() => {
    const authScreen = document.getElementById('authScreen');
    const onboarding = document.getElementById('onboarding');
    const homeScreen = document.getElementById('home');
    const tabBar = document.getElementById('tabBar');
    const session = localStorage.getItem('lv_auth_session');
    return {
      authVisible: authScreen ? window.getComputedStyle(authScreen).display !== 'none' : 'no element',
      onboardingActive: onboarding ? onboarding.classList.contains('active') : 'no element',
      homeActive: homeScreen ? homeScreen.classList.contains('active') : 'no element',
      tabBarDisplay: tabBar ? window.getComputedStyle(tabBar).display : 'no element',
      session
    };
  });
  console.log('State:', JSON.stringify(authState, null, 2));

  // If still showing auth, try to force home state
  if (authState.authVisible === true || authState.authVisible === 'flex') {
    console.log('Auth still visible, forcing home state via JS...');
    await page.evaluate(() => {
      const authScreen = document.getElementById('authScreen');
      if (authScreen) authScreen.style.display = 'none';
      const tabBar = document.getElementById('tabBar');
      if (tabBar) tabBar.style.display = '';
      const onboarding = document.getElementById('onboarding');
      if (onboarding) onboarding.classList.remove('active');
      // Activate home screen if not active
      const home = document.getElementById('home');
      if (home && !home.classList.contains('active')) {
        home.classList.add('active');
      }
    });
    await new Promise(r => setTimeout(r, 500));
  }

  const screenshotPath = path.join(__dirname, 'screenshots', 'home.png');
  fs.mkdirSync(path.join(__dirname, 'screenshots'), { recursive: true });

  await page.screenshot({
    path: screenshotPath,
    fullPage: false,
    type: 'png'
  });

  const stat = fs.statSync(screenshotPath);
  console.log('Screenshot saved:', screenshotPath, '(' + stat.size + ' bytes)');

  await browser.close();
})();
