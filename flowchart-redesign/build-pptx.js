// Converts the rendered HTML flowchart into a natively editable PowerPoint slide.
// Geometry is read from the browser layout (1 CSS px = 1 pt on the slide).
// Usage: NODE_PATH=<dir with pptxgenjs> node build-pptx.js variant-A-corporate.html out.pptx
const { chromium } = require('playwright');
const pptxgen = require('pptxgenjs');
const path = require('path');

const FONT = 'Arial';
const IN = px => px / 72;

(async () => {
  const [src, out] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1131 } });
  await page.goto('file://' + path.resolve(src));
  await page.evaluate(() => document.fonts.ready);

  const data = await page.evaluate(() => {
    const root = document.getElementById('canvas');
    const C = root.getBoundingClientRect();
    const hex = c => {
      const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
      if (!m || (m[4] !== undefined && +m[4] === 0)) return null;
      return [m[1], m[2], m[3]].map(v => (+v).toString(16).padStart(2, '0')).join('').toUpperCase();
    };
    const R = r => ({ x: r.left - C.left, y: r.top - C.top, w: r.width, h: r.height });
    const boxes = [], texts = [], polys = [], wires = [], squares = [];
    for (const el of root.querySelectorAll('*')) {
      if (el.closest('svg')) {
        if (el.tagName === 'polygon') polys.push({ ...R(el.closest('svg').getBoundingClientRect()), stroke: hex(getComputedStyle(el).stroke) || '0E2841', sw: parseFloat(el.getAttribute('stroke-width')) || 1.5 });
        if (el.tagName === 'path' && el.closest('svg.wires') && el.parentNode.tagName === 'svg')
          wires.push({ d: el.getAttribute('d'), color: el.getAttribute('stroke').replace('#','').toUpperCase(), w: +el.getAttribute('stroke-width') });
        continue;
      }
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const side = s => ({ w: parseFloat(cs[`border${s}Width`]), c: hex(cs[`border${s}Color`]), st: cs[`border${s}Style`] });
      boxes.push({ ...R(r), bg: hex(cs.backgroundColor), radius: cs.borderRadius,
        t: side('Top'), r: side('Right'), b: side('Bottom'), l: side('Left') });
      if (el.matches('.record span')) squares.push({ x: r.left - C.left, y: r.top - C.top + r.height / 2 - 6.5 });
      for (const n of el.childNodes) {
        if (n.nodeType !== 3 || !n.textContent.trim()) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        const tr = rg.getBoundingClientRect();
        let t = n.textContent.replace(/\s+/g, ' ').trim();
        if (cs.textTransform === 'uppercase') t = t.toUpperCase();
        texts.push({ ...R(tr), t, size: parseFloat(cs.fontSize), bold: +cs.fontWeight >= 600, light: +cs.fontWeight <= 300,
          color: hex(cs.color), ls: parseFloat(cs.letterSpacing) || 0, lh: cs.lineHeight,
          align: cs.textAlign === 'center' ? 'center' : 'left', lines: Math.round(tr.height / (parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2)) });
      }
    }
    return { boxes, texts, polys, wires, squares, W: C.width, H: C.height };
  });
  await browser.close();

  const pres = new pptxgen();
  pres.defineLayout({ name: 'FLOW', width: IN(data.W), height: IN(data.H) });
  pres.layout = 'FLOW';
  pres.title = 'BSA LWR Case Welding Area Investigation';
  const s = pres.addSlide();
  s.background = { color: 'FFFFFF' };
  const S = pres.ShapeType;

  // Boxes: fill + uniform border, plus any thicker single sides drawn as bars.
  for (const b of data.boxes) {
    const sides = [b.t, b.r, b.b, b.l];
    const visible = sides.filter(x => x.w > 0 && x.c && x.st !== 'none');
    const thin = visible.length ? Math.min(...visible.map(x => x.w)) : 0;
    const uniform = visible.length === 4;
    const round = b.radius === '50%' || parseFloat(b.radius) >= b.h / 2;
    if (b.bg || uniform) {
      const line = uniform ? { color: b.t.c, width: thin, dashType: b.t.st === 'dashed' ? 'dash' : 'solid' } : { type: 'none' };
      s.addShape(round ? S.ellipse : S.rect, { x: IN(b.x), y: IN(b.y), w: IN(b.w), h: IN(b.h),
        fill: b.bg ? { color: b.bg } : { type: 'none' }, line });
    }
    const bar = (cond, o, c) => cond && s.addShape(S.rect, { ...o, fill: { color: c }, line: { type: 'none' } });
    const extra = x => x.w > 0 && x.c && x.st !== 'none' && (!uniform || x.w > thin);
    bar(extra(b.l), { x: IN(b.x), y: IN(b.y), w: IN(b.l.w), h: IN(b.h) }, b.l.c);
    bar(extra(b.r), { x: IN(b.x + b.w - b.r.w), y: IN(b.y), w: IN(b.r.w), h: IN(b.h) }, b.r.c);
    bar(extra(b.t), { x: IN(b.x), y: IN(b.y), w: IN(b.w), h: IN(b.t.w) }, b.t.c);
    bar(extra(b.b), { x: IN(b.x), y: IN(b.y + b.h - b.b.w), w: IN(b.w), h: IN(b.b.w) }, b.b.c);
  }
  for (const q of data.squares)
    s.addShape(S.rect, { x: IN(q.x), y: IN(q.y), w: IN(13), h: IN(13), fill: { color: 'FFFFFF' }, line: { color: '0E2841', width: 1.1 } });
  for (const p of data.polys)
    s.addShape(S.diamond, { x: IN(p.x), y: IN(p.y), w: IN(p.w), h: IN(p.h), fill: { color: 'FFFFFF' }, line: { color: p.stroke, width: p.sw } });

  // Connectors: split each orthogonal SVG path into straight segments, arrowhead on the last.
  for (const w of data.wires) {
    const tok = w.d.match(/[MHV][^MHV]*/g);
    let x = 0, y = 0; const segs = [];
    for (const t of tok) {
      const v = t.slice(1).trim().split(',').map(Number);
      if (t[0] === 'M') { [x, y] = v; continue; }
      const nx = t[0] === 'H' ? v[0] : x, ny = t[0] === 'V' ? v[0] : y;
      segs.push([x, y, nx, ny]); x = nx; y = ny;
    }
    segs.forEach(([x1, y1, x2, y2], i) => {
      const last = i === segs.length - 1;
      s.addShape(S.line, { x: IN(Math.min(x1, x2)), y: IN(Math.min(y1, y2)), w: IN(Math.abs(x2 - x1)), h: IN(Math.abs(y2 - y1)),
        flipH: x2 < x1, flipV: y2 < y1,
        line: { color: w.color, width: w.w, endArrowType: last ? 'triangle' : undefined } });
    });
  }

  // Text on top of everything.
  for (const t of data.texts) {
    const slack = t.w * 0.1;
    const x = t.align === 'center' ? t.x - slack / 2 : t.x;
    const lh = parseFloat(t.lh);
    s.addText(t.t, { x: IN(x), y: IN(t.y), w: IN(t.w + slack), h: IN(t.h), margin: 0, isTextBox: true,
      fontFace: FONT, fontSize: t.size, bold: t.bold, color: t.color, align: t.align, valign: 'middle',
      charSpacing: t.ls ? t.ls : undefined, lineSpacing: !isNaN(lh) && t.lines > 1 ? lh : undefined, wrap: true, fit: 'none' });
  }

  await pres.writeFile({ fileName: out });
  console.log('wrote', out, data.boxes.length, 'boxes', data.texts.length, 'texts', data.wires.length, 'wires');
})();
