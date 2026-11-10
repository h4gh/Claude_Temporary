// Minimal orthogonal connector renderer for the flowchart drafts.
// Usage: link('#a', '#b', {from:'right', to:'left', color:'#333'})
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  let svg, defs, root;
  const markers = {};
  function init() {
    root = document.getElementById('canvas');
    svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'wires');
    Object.assign(svg.style, {position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 5});
    defs = document.createElementNS(NS, 'defs');
    svg.appendChild(defs);
    root.appendChild(svg);
  }
  function marker(color, size) {
    const id = 'm' + color.replace(/[^a-z0-9]/gi, '') + size;
    if (markers[id]) return id;
    const m = document.createElementNS(NS, 'marker');
    m.setAttribute('id', id);
    m.setAttribute('viewBox', '0 0 10 10');
    m.setAttribute('refX', '9'); m.setAttribute('refY', '5');
    m.setAttribute('markerWidth', size); m.setAttribute('markerHeight', size);
    m.setAttribute('orient', 'auto-start-reverse');
    m.setAttribute('markerUnits', 'userSpaceOnUse');
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', 'M0,0 L10,5 L0,10 z');
    p.setAttribute('fill', color);
    m.appendChild(p); defs.appendChild(m);
    markers[id] = 1; return id;
  }
  function pt(el, side, f) {
    const r = el.getBoundingClientRect(), c = root.getBoundingClientRect();
    const x = r.left - c.left, y = r.top - c.top;
    f = f == null ? 0.5 : f;
    switch (side) {
      case 'top': return [x + r.width * f, y];
      case 'bottom': return [x + r.width * f, y + r.height];
      case 'left': return [x, y + r.height * f];
      case 'right': return [x + r.width, y + r.height * f];
    }
  }
  window.link = function (a, b, o) {
    o = Object.assign({from: 'right', to: 'left', color: '#55606e', width: 1.6, arrow: 9, gap: 3}, o || {});
    if (!svg) init();
    const A = document.querySelector(a), B = document.querySelector(b);
    let [x1, y1] = pt(A, o.from, o.fromF), [x2, y2] = pt(B, o.to, o.toF);
    const g = o.gap;
    if (o.to === 'top') y2 -= g; if (o.to === 'bottom') y2 += g;
    if (o.to === 'left') x2 -= g; if (o.to === 'right') x2 += g;
    if (o.alignX) x1 = x2;      // force a straight vertical line
    if (o.straight) x2 = x1;    // drop straight down from the source
    const vFrom = o.from === 'top' || o.from === 'bottom';
    const vTo = o.to === 'top' || o.to === 'bottom';
    let d;
    if (vFrom && vTo) {
      const my = o.midY != null ? o.midY : (y1 + y2) / 2;
      d = x1 === x2 ? `M${x1},${y1} V${y2}` : `M${x1},${y1} V${my} H${x2} V${y2}`;
    } else if (!vFrom && !vTo) {
      const mx = o.midX != null ? o.midX : (x1 + x2) / 2;
      d = y1 === y2 ? `M${x1},${y1} H${x2}` : `M${x1},${y1} H${mx} V${y2} H${x2}`;
    } else if (vFrom) {
      d = `M${x1},${y1} V${y2} H${x2}`;
    } else {
      d = `M${x1},${y1} H${x2} V${y2}`;
    }
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d); p.setAttribute('fill', 'none');
    p.setAttribute('stroke', o.color); p.setAttribute('stroke-width', o.width);
    p.setAttribute('stroke-linejoin', 'round');
    if (o.dash) p.setAttribute('stroke-dasharray', o.dash);
    if (o.arrow) p.setAttribute('marker-end', `url(#${marker(o.color, o.arrow)})`);
    svg.appendChild(p);
    if (o.label) {
      const l = document.createElement('div');
      l.className = 'wire-label ' + (o.labelClass || '');
      l.textContent = o.label;
      const lx = (o.labelAt === 'end' ? x2 : x1) + (o.dx || 0);
      const ly = (o.labelAt === 'end' ? y2 : y1) + (o.dy || 0);
      Object.assign(l.style, {position: 'absolute', left: lx + 'px', top: ly + 'px', transform: 'translate(-50%,-50%)', zIndex: 6});
      root.appendChild(l);
    }
  };
})();
