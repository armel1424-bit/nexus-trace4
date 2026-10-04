/* NEXUS TRACE — scène SVG : nœuds, connexions, paquets animés */
(function () {
  var NT = window.NT;
  var NS = 'http://www.w3.org/2000/svg';
  var W = 920, H = 440;

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }
  function reduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function Stage(svg) {
    this.svg = svg;
    this.geo = {};
    this.nodeEls = {};
    this.linkEls = {};
    this.raf = null;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('role', 'img');
  }

  Stage.prototype.render = function (layout, handlers) {
    this.cancelPacket();
    var svg = this.svg, self = this;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    this.geo = {}; this.nodeEls = {}; this.linkEls = {};
    var grid = el('g', { 'class': 'grid' }, svg);
    for (var x = 40; x < W; x += 40) el('line', { x1: x, y1: 0, x2: x, y2: H }, grid);
    for (var y = 40; y < H; y += 40) el('line', { x1: 0, y1: y, x2: W, y2: y }, grid);

    layout.nodes.forEach(function (n) {
      var w = n.w || 148, h = n.h || 68;
      self.geo[n.id] = { x: n.x, y: n.y, w: w, h: h };
    });

    var linkLayer = el('g', { 'class': 'links' }, svg);
    var labelLayer = el('g', { 'class': 'link-labels' }, svg);
    layout.links.forEach(function (l) {
      var a = self.geo[l.a], b = self.geo[l.b];
      if (!a || !b) return;
      var g = el('g', { 'class': 'link' + (l.dashed ? ' dashed' : '') + (l.clickable ? ' clickable' : ''), 'data-id': l.id }, linkLayer);
      var line = el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, 'class': 'line' }, g);
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      var mark = el('text', { x: mx, y: my + 5, 'class': 'cut-mark', 'text-anchor': 'middle' }, g);
      mark.textContent = '✕';
      if (l.clickable && handlers && handlers.onLink) {
        var hit = el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, 'class': 'hit' }, g);
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');
        g.setAttribute('aria-label', 'Lien ' + l.id.replace('-', ' – ') + ' : couper ou rétablir');
        g.addEventListener('click', function () { handlers.onLink(l.id); });
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlers.onLink(l.id); } });
      }
      if (l.label) {
        var t = el('text', { x: mx, y: my - 8, 'class': 'link-label', 'text-anchor': 'middle' }, labelLayer);
        t.textContent = l.label;
      }
      self.linkEls[l.id] = g;
    });

    var nodeLayer = el('g', { 'class': 'nodes' }, svg);
    layout.nodes.forEach(function (n) {
      var g = self.geo[n.id];
      var grp = el('g', { 'class': 'node', 'data-id': n.id, transform: 'translate(' + (g.x - g.w / 2) + ',' + (g.y - g.h / 2) + ')' }, nodeLayer);
      el('rect', { width: g.w, height: g.h, rx: 10, ry: 10 }, grp);
      var rect = grp.firstChild;
      var tag = el('text', { x: 13, y: 20, 'class': 'tag' }, grp); tag.textContent = n.tag || '';
      var label = el('text', { x: 13, y: n.sub ? 41 : 48, 'class': 'label' }, grp); label.textContent = n.label;
      var sub = el('text', { x: 13, y: 58, 'class': 'sub' }, grp); sub.textContent = n.sub || '';
      var mark = el('text', { x: g.w - 12, y: 20, 'class': 'mark', 'text-anchor': 'end' }, grp);
      grp.setAttribute('aria-label', n.label + (n.sub ? ', ' + n.sub : ''));
      self.nodeEls[n.id] = { g: grp, rect: rect, tag: tag, label: label, sub: sub, mark: mark, baseSub: n.sub || '', baseLabel: n.label };
      if (handlers && handlers.onNode && handlers.nodeClickable && handlers.nodeClickable(n.id)) {
        grp.classList.add('clickable');
        grp.setAttribute('tabindex', '0');
        grp.setAttribute('role', 'button');
        grp.setAttribute('aria-label', n.label + ' : faire tomber ou relever');
        grp.addEventListener('click', function () { handlers.onNode(n.id); });
        grp.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlers.onNode(n.id); } });
      }
    });
    this.packetLayer = el('g', { 'class': 'packets' }, svg);
    this.fit();
  };

  /* Élargit chaque nœud si son texte dépasse (la mesure exige que le SVG soit affiché). */
  Stage.prototype.fit = function () {
    var self = this;
    Object.keys(this.nodeEls).forEach(function (id) {
      var n = self.nodeEls[id], g = self.geo[id];
      var need = 0;
      try { need = Math.max(n.label.getComputedTextLength(), n.tag.getComputedTextLength(), n.sub.getComputedTextLength() + 0) + 30; } catch (e) { need = 0; }
      if (need > g.w) {
        g.w = Math.ceil(need);
        n.rect.setAttribute('width', g.w);
        n.mark.setAttribute('x', g.w - 12);
        n.g.setAttribute('transform', 'translate(' + (g.x - g.w / 2) + ',' + (g.y - g.h / 2) + ')');
      }
    });
  };

  var MARKS = { down: '✕', warn: '!' };
  Stage.prototype.setNode = function (id, o) {
    var n = this.nodeEls[id]; if (!n) return;
    ['ok', 'warn', 'down'].forEach(function (c) { n.g.classList.remove(c); });
    var state = (o && o.state) || 'ok';
    n.g.classList.add(state);
    n.mark.textContent = MARKS[state] || '';
    n.sub.textContent = o && o.sub !== undefined ? o.sub : n.baseSub;
  };
  Stage.prototype.setLink = function (id, state) {
    var l = this.linkEls[id]; if (!l) return;
    l.classList.remove('path', 'down');
    if (state) l.classList.add(state);
  };
  Stage.prototype.setActive = function (ids) {
    var self = this;
    Object.keys(this.nodeEls).forEach(function (k) { self.nodeEls[k].g.classList.remove('active'); });
    (ids || []).forEach(function (k) { if (self.nodeEls[k]) self.nodeEls[k].g.classList.add('active'); });
  };

  Stage.prototype.cancelPacket = function () {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    if (this.packetLayer) while (this.packetLayer.firstChild) this.packetLayer.removeChild(this.packetLayer.firstChild);
  };

  /* Déplace un paquet le long de path (liste d’identifiants), avec un sillage. */
  Stage.prototype.movePacket = function (path, duration, status, done) {
    var self = this;
    this.cancelPacket();
    var pts = path.map(function (id) { return self.geo[id]; }).filter(Boolean);
    if (!pts.length) { done(); return; }
    var same = pts.length === 1 || (pts.length === 2 && pts[0] === pts[1]);
    var cls = 'packet ' + (status || 'ok');
    if (same) {
      var g0 = pts[0];
      var ring = el('circle', { cx: g0.x, cy: g0.y, r: 8, 'class': 'pulse ' + (status || 'ok') }, this.packetLayer);
      if (reduced()) { setTimeout(done, 0); return; }
      var t0 = performance.now();
      var tick0 = function (now) {
        var p = Math.min(1, (now - t0) / duration);
        ring.setAttribute('r', 8 + p * 34);
        ring.style.opacity = String(1 - p);
        if (p < 1) self.raf = requestAnimationFrame(tick0); else { self.raf = null; done(); }
      };
      this.raf = requestAnimationFrame(tick0);
      return;
    }
    var segs = [], total = 0;
    for (var i = 0; i < pts.length - 1; i++) {
      var dx = pts[i + 1].x - pts[i].x, dy = pts[i + 1].y - pts[i].y, len = Math.sqrt(dx * dx + dy * dy);
      segs.push({ a: pts[i], b: pts[i + 1], len: len, start: total }); total += len;
    }
    var trail = [];
    for (var k = 0; k < 5; k++) trail.push(el('circle', { r: 7 - k * 1.1, 'class': cls + ' trail', opacity: (0.5 - k * 0.09) }, this.packetLayer));
    var head = el('circle', { r: 8, 'class': cls }, this.packetLayer);
    function at(d) {
      d = Math.max(0, Math.min(total, d));
      for (var j = 0; j < segs.length; j++) {
        var s = segs[j];
        if (d <= s.start + s.len || j === segs.length - 1) {
          var f = s.len ? (d - s.start) / s.len : 0;
          return { x: s.a.x + (s.b.x - s.a.x) * f, y: s.a.y + (s.b.y - s.a.y) * f };
        }
      }
    }
    function ease(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
    if (reduced()) {
      var e = at(total); head.setAttribute('cx', e.x); head.setAttribute('cy', e.y);
      setTimeout(function () { self.cancelPacket(); done(); }, 0);
      return;
    }
    var t1 = performance.now();
    var tick = function (now) {
      var p = Math.min(1, (now - t1) / duration);
      var d = ease(p) * total;
      var c = at(d);
      head.setAttribute('cx', c.x); head.setAttribute('cy', c.y);
      trail.forEach(function (t, idx) {
        var q = at(d - (idx + 1) * 14);
        t.setAttribute('cx', q.x); t.setAttribute('cy', q.y);
      });
      if (p < 1) self.raf = requestAnimationFrame(tick);
      else { self.raf = null; self.cancelPacket(); done(); }
    };
    this.raf = requestAnimationFrame(tick);
  };

  NT.Stage = Stage;
})();
