const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const outDir = path.join(__dirname, '..', 'docs', 'screenshots');
fs.mkdirSync(outDir, { recursive: true });

const pages = [
  ['/', 'dashboard'],
  ['/evolution/nodes', 'claw-pool'],
  ['/tasks', 'tasks'],
  ['/employees', 'employees'],
  ['/manage/model-keys', 'model-keys'],
  ['/manage/model-keys/distribute', 'key-distribution'],
  ['/strategy', 'strategy'],
  ['/meetings', 'meetings'],
  ['/community/channels', 'community'],
  ['/evolution/assets', 'evolution'],
  ['/settings', 'settings'],
];

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 800 });

  // Get auth token
  await page.goto('http://127.0.0.1:3100/', { waitUntil: 'networkidle2', timeout: 15000 });
  const resp = await page.evaluate(async () => {
    const r = await fetch('/auth/desktop-init', { method: 'POST', headers: {'Content-Type':'application/json'} });
    return await r.json();
  });
  console.log('Token:', resp.token ? 'OK' : 'FAIL');

  // Store token
  await page.evaluate((t) => localStorage.setItem('grc_token', t), resp.token);

  for (const [url, name] of pages) {
    try {
      await page.goto('http://127.0.0.1:3100' + url, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, 2000));
      const filePath = path.join(outDir, name + '.png');
      await page.screenshot({ path: filePath });
      const stat = fs.statSync(filePath);
      console.log('OK:', name, stat.size, 'bytes');
    } catch(e) {
      console.log('FAIL:', name, e.message.substring(0, 80));
    }
  }

  await browser.close();
  console.log('All done');
})();
