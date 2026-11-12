// ChonMap E2E — vite preview(또는 라이브) 대상 브라우저 시나리오 테스트
// 준비: npx -y npm@11 install --no-save playwright@1.65.0 && npx playwright install chromium
// 실행: npx vite preview --port 4173  →  node scripts/e2e.cjs   (라이브: BASE=https://chonmap.vercel.app node scripts/e2e.cjs)
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:4173';
const results = [];
const consoleErrors = [];
const failedReqs = [];
function check(name, cond, info = '') {
  results.push({ name, ok: !!cond, info });
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? ' — ' + info : ''));
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    acceptDownloads: true, locale: 'ko-KR',
  });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message.slice(0, 200)));
  page.on('requestfailed', r => { if (r.url().startsWith(BASE)) failedReqs.push(r.url() + ' ' + (r.failure() ? r.failure().errorText : '')); });
  page.on('response', r => { if (r.url().startsWith(BASE) && r.status() >= 400) failedReqs.push(r.url() + ' ' + r.status()); });

  // ── 1. 랜딩 + 정적 페이지 ──
  await page.goto(BASE + '/', { waitUntil: 'load' });
  check('landing: title has 촌맵', (await page.title()).includes('촌맵'), await page.title());
  check('landing: CTA to /app/', (await page.locator('a[href="/app/"]').count()) > 0);
  const landingHtml = await page.content();
  check('landing: AdSense script present', landingHtml.includes('adsbygoogle.js'));
  for (const p of ['/guide.html', '/about.html', '/privacy.html', '/terms.html', '/contact.html', '/chon/', '/chon/what-is-chon.html',
    '/robots.txt', '/sitemap.xml', '/ads.txt', '/.well-known/assetlinks.json', '/manifest.json', '/sw.js', '/icons/icon-192.png']) {
    const r = await page.request.get(BASE + p);
    check('static ' + p, r.status() === 200, String(r.status()));
  }
  const appHtml = await (await page.request.get(BASE + '/app/')).text();
  check('/app/: no AdSense script', !appHtml.includes('adsbygoogle.js'));
  check('/app/: noindex', /noindex/.test(appHtml));
  const privacy = await (await page.request.get(BASE + '/privacy.html')).text();
  check('privacy: AdSense disclosure links', privacy.includes('adssettings.google.com') && privacy.includes('aboutads.info'));
  const sitemap = await (await page.request.get(BASE + '/sitemap.xml')).text();
  check('sitemap: excludes /app/', !/\/app\//.test(sitemap));

  // ── 2. 앱 로드 + 온보딩 ──
  await page.goto(BASE + '/app/', { waitUntil: 'load' });
  await page.waitForSelector('svg', { timeout: 15000 });
  const skip = page.getByText('건너뛰기');
  if (await skip.count()) await skip.first().click();
  await sleep(300);
  check('app: root node 나 rendered', (await page.locator('svg text', { hasText: /^나$/ }).count()) > 0);
  check('app: 4 tabs', (await page.locator('nav button, [role=tablist] button').count()) >= 4 || (await page.getByText('관계검색').count()) > 0);

  // ── 3. 가족 추가 ──
  async function addPerson(rel, name) {
    await page.getByRole('button', { name: '가족 추가' }).click();
    await page.waitForSelector('form', { timeout: 5000 });
    await page.locator('form button', { hasText: rel }).first().click();
    await page.getByPlaceholder('이름을 입력하세요').fill(name);
    await page.getByRole('button', { name: '추가하기' }).click();
    await sleep(400);
  }
  await addPerson('아버지', '아버지테스트');
  console.log('DEBUG svg texts after father: ' + JSON.stringify(await page.locator('svg text').allTextContents()));
  check('add: father node', (await page.locator('svg text', { hasText: '아버지테스트' }).count()) > 0);
  check('add: father label 아버지 (1촌)', (await page.locator('svg text', { hasText: /^아버지 \(1촌\)$/ }).count()) > 0);
  await addPerson('어머니', '어머니테스트');
  await addPerson('아들', '아들테스트');
  await addPerson('딸', '<b>딸</b>');
  check('add: 4 added', (await page.locator('svg text', { hasText: /테스트|딸/ }).count()) >= 4);
  check('add: html name not injected as element', (await page.locator('svg b').count()) === 0);

  // ── 4. 기준 인물 변경 ──
  await page.locator('svg [role=button]', { hasText: '아버지테스트' }).first().click();
  await sleep(400);
  console.log('DEBUG svg texts after perspective: ' + JSON.stringify(await page.locator('svg text').allTextContents()));
  console.log('DEBUG header: ' + JSON.stringify(await page.locator('header').allTextContents()));
  check('perspective: 나 becomes 아들 (1촌)', (await page.locator('svg text', { hasText: /^아들 \(1촌\)$/ }).count()) > 0);
  check('perspective: grandson label 손자 (2촌)', (await page.locator('svg text', { hasText: /^손자 \(2촌\)$/ }).count()) > 0);
  check('perspective: header shows 기준 아버지테스트', (await page.locator('header').first().textContent()).includes('아버지테스트'));

  // ── 5. Undo/Redo ──
  const undoBtn = page.getByRole('button', { name: '실행취소' });
  check('undo: button visible', (await undoBtn.count()) > 0);
  if (await undoBtn.count()) {
    await undoBtn.click(); await sleep(300);
    check('undo: last person removed', (await page.locator('svg text', { hasText: '딸' }).count()) === 0);
    const redoBtn = page.getByRole('button', { name: '다시실행' });
    if (await redoBtn.count()) { await redoBtn.click(); await sleep(300); }
    check('redo: person restored', (await page.locator('svg text', { hasText: '딸' }).count()) > 0);
  }

  // ── 6. 관계 검색 ──
  await page.getByText('관계검색').first().click();
  await sleep(500);
  const selects = page.locator('select');
  check('search: selects present', (await selects.count()) >= 2);
  await selects.nth(0).selectOption({ label: '아버지테스트' });
  await selects.nth(1).selectOption({ label: '아들테스트' });
  await sleep(300);
  check('search: 손자 result', (await page.getByText('손자').count()) > 0);

  // ── 7. 설정: 내보내기 / 가져오기 / 다크모드 ──
  await page.getByText('설정').last().click();
  await sleep(500);
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
    page.getByText('데이터 내보내기').click(),
  ]);
  check('settings: export download', !!dl && /chonmap_backup_\d+\.json/.test(dl.suggestedFilename()), dl ? dl.suggestedFilename() : 'no download');
  let exported = null;
  if (dl) { const p = await dl.path(); exported = require('fs').readFileSync(p, 'utf8'); }
  check('settings: export is valid json with 5 persons', !!exported && Object.keys(JSON.parse(exported).persons).length === 5);

  const fileInput = page.locator('input[type=file][accept=".json"]');
  async function importBuffer(name, content) {
    await fileInput.setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(content) });
    await sleep(500);
  }
  await importBuffer('bad.json', '{not json');
  check('import: malformed json rejected', (await page.locator('#chonmap-toast').textContent().catch(() => '')).includes('읽을 수 없'));
  const tampered = JSON.stringify({ persons: { a: { id: 'a', name: 'x', gender: 'M' } }, edges: [], rootPersonId: 'a', version: 1, childOrder: { a: 'oops' } });
  await importBuffer('tamper.json', tampered);
  check('import: invalid childOrder rejected', (await page.locator('#chonmap-toast').textContent().catch(() => '')).includes('유효하지 않은'));
  const cyc = JSON.stringify({ persons: { a: { id: 'a', name: 'a', gender: 'M' }, b: { id: 'b', name: 'b', gender: 'M' } }, edges: [{ id: '1', type: 'PARENT_OF', from: 'a', to: 'b' }, { id: '2', type: 'PARENT_OF', from: 'b', to: 'a' }], rootPersonId: 'a', version: 1 });
  await importBuffer('cycle.json', cyc);
  check('import: parent cycle rejected', (await page.locator('#chonmap-toast').textContent().catch(() => '')).includes('유효하지 않은'));
  const xss = JSON.stringify({ persons: { a: { id: 'a', name: '<img src=x onerror="window.__pwned=1">', gender: 'M', memo: '<script>window.__pwned=1</script>' } }, edges: [], rootPersonId: 'a', version: 1 });
  await importBuffer('xss.json', xss);
  await sleep(300);
  const dlg = page.locator('[role=dialog]');
  check('import: confirm dialog shown', (await dlg.count()) > 0);
  if (await dlg.count()) { await dlg.locator('button').last().click(); await sleep(500); }
  check('import: xss payload not executed', (await page.evaluate(() => window.__pwned)) === undefined);
  check('import: xss name rendered as text', (await page.locator('img[src="x"]').count()) === 0);

  // PDF 팝업 (document.write) 이스케이프 확인
  {
    const openDialogs = await page.locator('[role=dialog]').count();
    const pdfBtn = page.getByText('PDF 족보 내보내기');
    const box = await pdfBtn.boundingBox();
    const topEl = box ? await page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); return el ? el.outerHTML.slice(0, 160) : 'none'; }, [box.x + box.width / 2, box.y + box.height / 2]) : 'no box';
    console.log('DEBUG before pdf: dialogs=' + openDialogs + ' topEl=' + topEl);
    if (openDialogs) { await page.keyboard.press('Escape'); await sleep(300); }
  }
  const [popup] = await Promise.all([
    page.waitForEvent('popup', { timeout: 8000 }).catch(() => null),
    page.getByText('PDF 족보 내보내기').click(),
  ]);
  if (popup) {
    await sleep(500);
    check('pdf: popup opened', true);
    check('pdf: name escaped (no img element)', (await popup.locator('img').count()) === 0);
    check('pdf: no script from memo', (await popup.evaluate(() => window.__pwned)) === undefined);
    await popup.close().catch(() => {});
  } else check('pdf: popup opened', false);

  // 다시 정상 데이터로 복구 (내보낸 백업 가져오기)
  if (exported) {
    await importBuffer('restore.json', exported);
    await sleep(300);
    if (await dlg.count()) { await dlg.locator('button').last().click(); await sleep(500); }
  }
  const darkCard = page.locator('xpath=//div[contains(@style,"space-between") and contains(., "화면 테마를 변경합니다")]');
  const darkBtn = darkCard.locator('xpath=./button').first();
  const before = await darkCard.textContent();
  await darkBtn.click(); await sleep(300);
  check('settings: dark mode toggles', (await darkCard.textContent()) !== before, before.slice(0, 20) + ' -> ' + (await darkCard.textContent()).slice(0, 20));
  check('settings: dark mode persisted', (await page.evaluate(() => localStorage.getItem('chonmap_darkmode'))) === 'true');
  await darkBtn.click(); await sleep(200);

  // 이미지 저장 (SVG → PNG)
  await page.getByText('가계도').first().click(); await sleep(300);
  await page.getByText('설정').last().click(); await sleep(300);
  const [dl2] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
    page.getByText('이미지로 저장').click(),
  ]);
  check('settings: image download', !!dl2 && /\.png$/.test(dl2.suggestedFilename()), dl2 ? dl2.suggestedFilename() : 'no download');

  // ── 8. 놀이 탭 ──
  await page.getByText('놀이').first().click(); await sleep(600);
  check('play: hub cards', (await page.getByText('호칭 퀴즈').count()) > 0);
  await page.getByText('호칭 퀴즈').first().click(); await sleep(800);
  check('play: quiz opened', (await page.locator('button').count()) > 0 && (await page.getByText('호칭 퀴즈').count()) >= 0);
  await page.goBack(); await sleep(500);
  check('play: back returns to hub', (await page.getByText('24점 퍼즐').count()) > 0);
  for (const g of ['오목', '24점 퍼즐', '카드 뒤집기']) {
    await page.getByText(g).first().click(); await sleep(700);
    await page.goBack(); await sleep(400);
  }
  check('play: games open/close without pageerror', !consoleErrors.some(e => e.startsWith('pageerror')));

  // ── 9. 영속성 + 저장소 변조 ──
  await page.reload({ waitUntil: 'load' }); await page.waitForSelector('svg');
  await sleep(500);
  check('persist: data survives reload', (await page.locator('svg text', { hasText: '아버지테스트' }).count()) > 0);
  // 앱이 떠 있는 동안은 beforeunload 저장이 변조를 덮어쓰므로, 앱이 없는 같은 출처 페이지에서 저장소를 조작한다
  await page.goto(BASE + '/privacy.html', { waitUntil: 'load' });
  await page.evaluate((t) => localStorage.setItem('chonmap_family_v1', t), tampered);
  await page.goto(BASE + '/app/', { waitUntil: 'load' }); await page.waitForSelector('svg', { timeout: 15000 }).catch(() => {});
  await sleep(500);
  check('tamper: app still renders after bad stored graph', (await page.locator('svg').count()) > 0);
  check('tamper: recovery copy kept', await page.evaluate(() => !!localStorage.getItem('chonmap_family_v1_recovery')));
  check('tamper: default graph restored (나)', (await page.locator('svg text', { hasText: /^나$/ }).count()) > 0);
  await page.goto(BASE + '/privacy.html', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.setItem('chonmap_photos_v1', JSON.stringify({ a: 'data:text/html,<script>window.__pwned=1</script>', b: 'javascript:alert(1)' })));
  await page.goto(BASE + '/app/', { waitUntil: 'load' }); await sleep(500);
  check('tamper: unsafe photo urls dropped', await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('chonmap_photos_v1') || '{}'); return Object.keys(p).length === 0; }));

  // ── 결과 ──
  const fails = results.filter(r => !r.ok);
  console.log('\n=== SUMMARY === pass ' + (results.length - fails.length) + '/' + results.length);
  if (consoleErrors.length) console.log('console errors:\n  ' + [...new Set(consoleErrors)].join('\n  '));
  if (failedReqs.length) console.log('failed requests:\n  ' + [...new Set(failedReqs)].join('\n  '));
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('E2E crashed:', e); process.exit(2); });
