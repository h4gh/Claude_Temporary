const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const files = process.argv.slice(2);
  const b = await chromium.launch();
  for (const f of files) {
    const p = await b.newPage({ deviceScaleFactor: 2 });
    await p.goto('file://' + path.resolve(f));
    await p.evaluate(() => document.fonts.ready);
    const box = await p.$eval('#canvas', e => ({ w: e.offsetWidth, h: e.offsetHeight }));
    await p.setViewportSize({ width: box.w, height: box.h });
    const out = f.replace('.html', '');
    await p.locator('#canvas').screenshot({ path: out + '.png' });
    await p.pdf({ path: out + '.pdf', width: box.w + 'px', height: box.h + 'px', printBackground: true, pageRanges: '1' });
    await p.close();
    console.log('rendered', out);
  }
  await b.close();
})();
