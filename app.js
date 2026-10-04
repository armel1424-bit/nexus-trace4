/* NEXUS TRACE — application */
(function () {
  var NT = window.NT;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var scenarios = NT.scenarios.slice().sort(function (a, b) { return a.id - b.id; });
  var PHASES = [
    { k: 'OBSERVE', t: 'Observe' }, { k: 'TRACE', t: 'Trace' }, { k: 'COMPRENDS', t: 'Comprends' },
    { k: 'MODIFIE', t: 'Modifie' }, { k: 'TESTE', t: 'Teste' }, { k: 'EXPLIQUE', t: 'Explique' }
  ];
  var LEVELS = {
    ok: { cls: 'ok', t: 'Tout va bien' },
    degraded: { cls: 'warn', t: 'Dégradé' },
    down: { cls: 'bad', t: 'Échec' }
  };
  var TONES = { good: 'bon', warn: 'attention', bad: 'problème' };

  var stage, S, st, res, run, mode = 'guided', phase = 0;
  var problemState = null, before = null, chosen = null, token = 0;
  var progress = NT.store.get('nt.progress.v1', {});

  /* ------------------------------------------------------------------ */
  function prog(id) {
    if (!progress[id]) progress[id] = { phases: [false, false, false, false, false, false], done: false };
    return progress[id];
  }
  function mark(i) {
    var p = prog(S.id);
    if (!p.phases[i]) {
      p.phases[i] = true;
      if (i === 5) p.done = true;
      NT.store.set('nt.progress.v1', progress);
      renderChips(); renderNav(); renderOverall();
    }
  }

  /* ------------------------------------------------------------------ */
  function renderNav() {
    var ul = $('#navList');
    ul.innerHTML = '';
    scenarios.forEach(function (s) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#scenario-' + s.id;
      a.className = 'navitem' + (S && S.id === s.id ? ' current' : '') + (prog(s.id).done ? ' done' : '');
      if (S && S.id === s.id) a.setAttribute('aria-current', 'page');
      a.innerHTML = '<span class="num">' + s.id + '</span><span class="txt"><strong>' + NT.esc(s.title) + '</strong><small>' + NT.esc(s.short) + '</small></span>' +
        '<span class="check" aria-label="' + (prog(s.id).done ? 'terminé' : 'à faire') + '">' + (prog(s.id).done ? '✓' : '') + '</span>';
      li.appendChild(a);
      ul.appendChild(li);
    });
  }
  function renderOverall() {
    var n = scenarios.filter(function (s) { return prog(s.id).done; }).length;
    $('#overall').textContent = n + ' / ' + scenarios.length + ' scénarios terminés';
    $('#overallBar').style.width = (n / scenarios.length * 100) + '%';
  }

  /* ------------------------------------------------------------------ */
  function labelOf(id) { var n = stage.nodeEls[id]; return n ? n.baseLabel : id; }
  function setField(k, v, cls) {
    var e = $('#f-' + k);
    e.textContent = v || '—';
    e.className = 'val' + (cls ? ' ' + cls : '');
  }
  function resetFields() {
    ['origin', 'dest', 'stage', 'flow', 'resp'].forEach(function (k) { setField(k, ''); });
    setField('time', '0 ms'); setField('status', 'Prêt', 'idle');
  }
  function setCaption(html) { $('#caption').innerHTML = html; }

  function speed() { return parseFloat($('#speed').value) || 1; }

  /* ------------------------------------------------------------------ */
  function stopRun() {
    token++;
    if (run && run.timer) clearTimeout(run.timer);
    if (run) { run.playing = false; run.busy = false; }
    if (stage) { stage.cancelPacket(); }
  }

  function applyNodes(map) {
    Object.keys(stage.nodeEls).forEach(function (id) { stage.setNode(id, (map && map[id]) || { state: 'ok' }); });
  }
  function applyLinks(showPath) {
    Object.keys(stage.linkEls).forEach(function (id) {
      var s = res.links && res.links[id];
      stage.setLink(id, s === 'down' ? 'down' : (showPath && s === 'path' ? 'path' : null));
    });
  }
  function applyIdle() {
    applyNodes(res.start || res.nodes || {});
    applyLinks(false);
    stage.setActive([]);
  }

  function renderMetrics(visible) {
    var box = $('#metrics'), v = $('#verdict');
    if (!visible) {
      box.innerHTML = ''; v.className = 'verdict empty'; v.innerHTML = '<span>Le résultat apparaît à la fin de la simulation.</span>';
      return;
    }
    box.innerHTML = res.metrics.map(function (x) {
      return '<div class="metric ' + (x.tone || '') + '"><span class="k">' + NT.esc(x.label) + '</span><span class="v">' + NT.esc(x.value) +
        (x.tone ? '<span class="sr-only"> (' + TONES[x.tone] + ')</span>' : '') + '</span></div>';
    }).join('');
    var lv = LEVELS[res.verdict.level] || LEVELS.ok;
    v.className = 'verdict ' + lv.cls;
    v.innerHTML = '<strong>' + lv.t + '</strong><span>' + NT.rich(res.verdict.text) + '</span>';
  }

  function renderTraffic() {
    var body = $('#trafficBody');
    body.innerHTML = '';
    var total = res.steps.reduce(function (a, s) { return a + s.ms; }, 0) || 1;
    var off = 0;
    res.steps.forEach(function (s, i) {
      var tr = document.createElement('tr');
      tr.className = 'pending ' + (s.status || 'ok');
      var left = off / total * 100, w = Math.max(s.ms / total * 100, s.ms > 0 ? 1.2 : 0);
      off += s.ms;
      tr.innerHTML = '<td class="i">' + (i + 1) + '</td><td class="what"><strong>' + NT.esc(NT.plain(s.label)) + '</strong><small>' + NT.esc(labelOf(s.from) + (s.from === s.to ? '' : ' → ' + labelOf(s.to))) + '</small></td>' +
        '<td class="flow">' + NT.esc(s.flow || '') + '</td><td class="dur">' + (s.ms ? NT.fmtMs(s.ms) : '—') + '</td>' +
        '<td class="bar"><span style="margin-left:' + left.toFixed(2) + '%;width:' + w.toFixed(2) + '%"></span></td>';
      body.appendChild(tr);
    });
    $('#trafficTotal').textContent = 'Temps total simulé : ' + NT.fmtMs(total);
  }

  /* ------------------------------------------------------------------ */
  var handlers = {
    onNode: function (id) {
      var ns = S.onNodeClick && S.onNodeClick(NT.clone(st), id);
      if (ns) { st = ns; rebuild({ metrics: true }); syncFree(); }
    },
    nodeClickable: function (id) { return !!(S.onNodeClick && S.onNodeClick(NT.clone(st), id)); },
    onLink: function (id) {
      var ns = S.onLinkClick && S.onLinkClick(NT.clone(st), id);
      if (ns) { st = ns; rebuild({ metrics: true }); syncFree(); }
    }
  };

  function rebuild(opts) {
    stopRun();
    res = S.sim(st);
    var layout = S.layout(st);
    layout.links.forEach(function (l) { if (l.clickable && !S.onLinkClick) l.clickable = false; });
    stage.render(layout, handlers);
    $('#stageHint').textContent = S.onNodeClick || S.onLinkClick ? (S.freeHint || '') : '';
    applyIdle();
    newRun();
    renderMetrics(!!(opts && opts.metrics));
    $('#compare').innerHTML = '';
  }

  function newRun() {
    stopRun();
    res = S.sim(st);
    applyIdle();
    run = { steps: res.steps, i: 0, elapsed: 0, done: false, playing: false, busy: false, timer: null, token: token };
    resetFields();
    renderTraffic();
    setCaption('<span class="muted">Lance la simulation ou avance étape par étape pour suivre la requête.</span>');
    updateControls();
  }

  function updateControls() {
    var finished = run && run.done;
    $('#btnPlay').disabled = !!(run && run.playing);
    $('#btnPause').disabled = !(run && run.playing);
    $('#btnStep').disabled = !!(run && run.playing);
    $('#btnPlay').textContent = finished ? 'Rejouer' : (run && run.i > 0 ? 'Reprendre' : 'Lancer');
    var left = run ? run.steps.length - run.i : 0;
    $('#stepInfo').textContent = run ? 'Étape ' + Math.min(run.i + (finished ? 0 : 1), run.steps.length) + ' sur ' + run.steps.length : '';
    var sb = $('#guideStep');
    if (sb) { sb.disabled = !!(run && run.playing); sb.textContent = finished ? 'Rejouer pas à pas' : 'Étape suivante'; }
    var gp = $('#guidePlay'); if (gp) gp.disabled = !!(run && run.playing);
  }

  function playAuto() {
    if (run.done) newRun();
    run.playing = true; updateControls(); exec();
  }
  function stepOnce() {
    if (run.done) newRun();
    run.playing = false; updateControls(); exec();
  }
  function pause() { if (run) { run.playing = false; if (run.timer) clearTimeout(run.timer); updateControls(); } }

  function exec() {
    if (!run || run.busy) return;
    if (run.i >= run.steps.length) { finish(); return; }
    var s = run.steps[run.i], tk = ++token;
    run.token = tk; run.busy = true;
    setField('origin', labelOf(s.from)); setField('dest', labelOf(s.to));
    setField('stage', s.stage); setField('flow', s.flow);
    setField('status', 'En cours', 'run');
    setCaption('<strong>' + NT.rich(s.label) + '</strong><span>' + NT.rich(s.note || '') + '</span>');
    stage.setActive([s.from, s.to]);
    followActive(s);
    var path = [s.from].concat(s.via || [], [s.to]);
    var dur = (s.from === s.to ? 700 : 450 + (path.length - 1) * 300) / speed();
    stage.movePacket(path, dur, s.status, function () {
      if (tk !== token) return;
      run.elapsed += s.ms;
      if (s.apply) Object.keys(s.apply).forEach(function (id) { stage.setNode(id, s.apply[id]); });
      setField('time', NT.fmtMs(run.elapsed));
      setField('status', s.status === 'fail' ? 'Échec' : (s.status === 'warn' ? 'Ralenti' : 'OK'), s.status === 'fail' ? 'bad' : (s.status === 'warn' ? 'warn' : 'ok'));
      if (s.response) setField('resp', s.response, s.status === 'fail' ? 'bad' : '');
      var row = $('#trafficBody').children[run.i];
      if (row) { row.classList.remove('pending'); row.classList.add('shown'); }
      run.i++; run.busy = false;
      updateControls();
      if (run.i >= run.steps.length) { run.timer = setTimeout(finish, 250); return; }
      if (run.playing) run.timer = setTimeout(exec, 220 / speed());
    });
  }

  /* Sur petit écran, la scène défile : on garde l’échange en cours à l’image. */
  function followActive(s) {
    var v = $('#viewArch');
    if (!v || v.hidden || v.scrollWidth <= v.clientWidth + 2) return;
    var g = stage.geo[s.to]; if (!g) return;
    var scale = $('#stage').getBoundingClientRect().width / 920;
    var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    v.scrollTo({ left: Math.max(0, g.x * scale - v.clientWidth / 2), behavior: calm ? 'auto' : 'smooth' });
  }

  function finish() {
    if (!run || run.done) return;
    run.done = true; run.playing = false; run.busy = false;
    stage.setActive([]);
    if (!res.steps.some(function (s) { return s.apply; })) applyNodes(res.nodes || {});
    applyLinks(true);
    renderMetrics(true);
    setField('status', LEVELS[res.verdict.level].t, LEVELS[res.verdict.level].cls);
    updateControls();
    if (mode === 'guided') {
      if (phase === 0) mark(0);
      if (phase === 1) mark(1);
      if (phase === 4) { mark(4); renderCompare(); }
    }
  }

  /* ------------------------------------------------------------------ */
  function renderCompare() {
    var c = $('#compare');
    if (!before) { c.innerHTML = ''; return; }
    var rows = res.metrics.map(function (a) {
      var b = before.metrics.filter(function (x) { return x.key === a.key; })[0];
      return '<tr><th scope="row">' + NT.esc(a.label) + '</th><td class="' + (b ? b.tone : '') + '">' + NT.esc(b ? b.value : '—') + '</td><td class="' + a.tone + '">' + NT.esc(a.value) + '</td></tr>';
    }).join('');
    c.innerHTML = '<h3>Avant et après ton choix</h3><table class="cmp"><thead><tr><th scope="col">Mesure</th><th scope="col">Avant</th><th scope="col">Après</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  /* ------------------------------------------------------------------ */
  function renderChips() {
    var p = prog(S.id);
    $$('#chips .chip').forEach(function (b, i) {
      b.classList.toggle('current', i === phase);
      b.classList.toggle('done', !!p.phases[i]);
      if (i === phase) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
  }

  function renderGuide() {
    var g = $('#guide');
    var chips = '<ol id="chips" class="chips" aria-label="Étapes du scénario">' + PHASES.map(function (p, i) {
      return '<li><button type="button" class="chip" data-phase="' + i + '"><span class="n">' + (i + 1) + '</span>' + p.t + '</button></li>';
    }).join('') + '</ol>';
    var body = '';
    if (phase === 0) {
      body = '<h3>Observe</h3><p>' + NT.rich(S.observe) + '</p><div class="actions"><button type="button" id="guidePlay" class="btn primary">Lancer la simulation</button></div>';
    } else if (phase === 1) {
      body = '<h3>Trace</h3><p>Avance <strong>une étape à la fois</strong>. Lis la note sous la scène avant de continuer : elle dit ce que fait chaque composant et pourquoi.</p>' +
        '<div class="actions"><button type="button" id="guideStep" class="btn primary">Étape suivante</button></div>';
    } else if (phase === 2) {
      body = '<h3>Comprends</h3><ul class="learn">' + S.learn.map(function (x) { return '<li>' + NT.rich(x) + '</li>'; }).join('') + '</ul>' +
        S.why.map(function (w) { return '<p class="why"><strong>' + NT.esc(w.brick) + '</strong> existe pour ' + NT.esc(w.problem) + '.</p>'; }).join('') +
        '<p class="muted">Ce scénario prolonge le chapitre ' + S.chapter + ' du livre.</p>';
    } else if (phase === 3) {
      var d = S.decision;
      body = '<h3>Modifie</h3><p class="problem">' + NT.rich(d.problemText) + '</p><p><strong>' + NT.rich(d.question) + '</strong></p><div class="choices" role="radiogroup" aria-label="' + NT.esc(d.question) + '">' +
        d.choices.map(function (c) {
          return '<button type="button" role="radio" aria-checked="' + (chosen && chosen.id === c.id) + '" class="choice' + (chosen && chosen.id === c.id ? ' picked' : '') + '" data-id="' + c.id + '">' + NT.esc(c.label) + '</button>';
        }).join('') + '</div><div id="feedback" aria-live="polite">' + feedbackHtml() + '</div>';
    } else if (phase === 4) {
      body = '<h3>Teste</h3>' + (chosen
        ? '<p>Ton choix : <strong>' + NT.esc(chosen.label) + '</strong></p><div class="actions"><button type="button" id="guidePlay" class="btn primary">Relancer le test</button></div>'
        : '<p>Choisis d’abord une modification à l’étape <strong>Modifie</strong>, puis reviens la tester ici.</p><div class="actions"><button type="button" class="btn" data-go="3">Aller à Modifie</button></div>');
    } else {
      var e = S.explain;
      body = '<h3>Explique</h3><p><strong>' + NT.rich(e.q) + '</strong></p><div class="choices" role="radiogroup" aria-label="' + NT.esc(e.q) + '">' +
        e.options.map(function (o, i) { return '<button type="button" role="radio" aria-checked="false" class="choice" data-opt="' + i + '">' + NT.esc(o.t) + '</button>'; }).join('') +
        '</div><div id="feedback" aria-live="polite"></div>';
    }
    var nav = '<div class="phase-nav">' +
      (phase > 0 ? '<button type="button" class="btn ghost" data-go="' + (phase - 1) + '">← ' + PHASES[phase - 1].t + '</button>' : '<span></span>') +
      (phase < 5 ? '<button type="button" class="btn ghost" data-go="' + (phase + 1) + '">' + PHASES[phase + 1].t + ' →</button>' : (S.id < scenarios.length ? '<a class="btn ghost" href="#scenario-' + (S.id + 1) + '">Scénario suivant →</a>' : '<span></span>')) + '</div>';
    g.innerHTML = chips + '<div class="phase-body">' + body + '</div>' + nav;
    renderChips();
    updateControls();
  }

  function feedbackHtml() {
    if (!chosen) return '';
    var map = { good: ['good', 'Bonne réponse'], partial: ['warn', 'Partiellement'], bad: ['bad', 'Pas adapté'] };
    var v = map[chosen.verdict] || map.partial;
    return '<div class="fb ' + v[0] + '"><strong>' + v[1] + '</strong><span>' + NT.rich(chosen.feedback) + '</span></div>' +
      '<div class="actions"><button type="button" class="btn primary" data-go="4">Tester ce choix</button></div>';
  }

  function setPhase(p) {
    phase = p;
    if (p === 0 || p === 1) { st = S.initial(); rebuild({ metrics: false }); }
    if (p === 3) {
      problemState = S.problem ? S.problem() : S.initial();
      st = NT.clone(problemState);
      chosen = null;
      rebuild({ metrics: true });
      before = res;
    }
    if (p === 4 && chosen) {
      st = chosen.apply(NT.clone(problemState));
      rebuild({ metrics: false });
    }
    renderGuide();
    if (p === 2) mark(2);
    if (p === 4 && chosen) setTimeout(function () { if (phase === 4 && mode === 'guided') playAuto(); }, 350);
  }

  function onGuideClick(e) {
    var t = e.target.closest('button, a'); if (!t) return;
    if (t.dataset.phase !== undefined) { setPhase(+t.dataset.phase); return; }
    if (t.dataset.go !== undefined) { setPhase(+t.dataset.go); return; }
    if (t.id === 'guidePlay') { playAuto(); return; }
    if (t.id === 'guideStep') { stepOnce(); return; }
    if (t.classList.contains('choice') && t.dataset.id) {
      chosen = S.decision.choices.filter(function (c) { return c.id === t.dataset.id; })[0];
      st = chosen.apply(NT.clone(problemState));
      rebuild({ metrics: true });
      mark(3);
      renderGuide();
      return;
    }
    if (t.classList.contains('choice') && t.dataset.opt !== undefined) {
      var o = S.explain.options[+t.dataset.opt];
      $$('.choice', $('#guide')).forEach(function (b) { b.classList.remove('picked', 'right', 'wrong'); b.setAttribute('aria-checked', 'false'); });
      t.classList.add('picked', o.ok ? 'right' : 'wrong'); t.setAttribute('aria-checked', 'true');
      $('#feedback').innerHTML = '<div class="fb ' + (o.ok ? 'good' : 'bad') + '"><strong>' + (o.ok ? 'Exact' : 'Pas tout à fait') + '</strong><span>' + NT.rich(o.fb) + '</span></div>' +
        (o.ok ? '<p class="muted">Scénario terminé. ' + (S.id < scenarios.length ? 'Passe au suivant quand tu veux.' : 'Tu as parcouru les huit scénarios.') + '</p>' : '');
      if (o.ok) mark(5);
    }
  }

  /* ------------------------------------------------------------------ */
  function renderFree() {
    var f = $('#free');
    f.innerHTML = '<h3>Mode libre</h3><p class="muted">Modifie l’architecture comme tu veux, puis lance la simulation. Le résultat se met à jour tout de suite.</p>' +
      (S.freeHint ? '<p class="hint">' + NT.esc(S.freeHint) + '</p>' : '') + '<div id="ctrls" class="ctrls"></div>' +
      '<div class="actions"><button type="button" id="freeReset" class="btn">Revenir au départ</button></div>';
    var box = $('#ctrls');
    S.controls.forEach(function (c) {
      var wrap = document.createElement('div');
      wrap.className = 'ctrl';
      var id = 'c-' + c.key;
      if (c.type === 'toggle') {
        wrap.innerHTML = '<label class="switch"><input type="checkbox" id="' + id + '"><span class="track" aria-hidden="true"></span><span class="lbl">' + NT.esc(c.label) + (c.help ? '<small>' + NT.esc(c.help) + '</small>' : '') + '</span></label>';
      } else if (c.type === 'select') {
        wrap.innerHTML = '<label for="' + id + '" class="lbl">' + NT.esc(c.label) + '</label><select id="' + id + '">' + c.options.map(function (o) {
          var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o;
          return '<option value="' + NT.esc(v) + '">' + NT.esc(t) + '</option>';
        }).join('') + '</select>';
      } else {
        wrap.innerHTML = '<label for="' + id + '" class="lbl">' + NT.esc(c.label) + ' <output id="o-' + c.key + '"></output></label><input type="range" id="' + id + '" min="' + c.min + '" max="' + c.max + '" step="' + c.step + '">';
      }
      box.appendChild(wrap);
      var input = $('#' + id);
      input.addEventListener('input', function () {
        var v = c.type === 'toggle' ? input.checked : (c.type === 'range' || c.num ? +input.value : input.value);
        st[c.key] = v;
        syncFree();
        rebuild({ metrics: true });
      });
    });
    $('#freeReset').addEventListener('click', function () { st = S.initial(); rebuild({ metrics: true }); syncFree(); });
    syncFree();
  }
  function syncFree() {
    if (!S) return;
    S.controls.forEach(function (c) {
      var input = $('#c-' + c.key); if (!input) return;
      if (c.type === 'toggle') input.checked = !!st[c.key]; else input.value = st[c.key];
      var o = $('#o-' + c.key); if (o) o.textContent = NT.num(st[c.key]) + (c.unit || '');
    });
  }

  function setMode(m) {
    mode = m;
    $('#modeGuided').setAttribute('aria-pressed', String(m === 'guided'));
    $('#modeFree').setAttribute('aria-pressed', String(m === 'free'));
    $('#guide').hidden = m !== 'guided';
    $('#free').hidden = m !== 'free';
    if (m === 'free') { rebuild({ metrics: true }); syncFree(); }
    else setPhase(phase);
  }

  /* ------------------------------------------------------------------ */
  function loadScenario(id) {
    S = scenarios.filter(function (s) { return s.id === id; })[0] || scenarios[0];
    mode = 'guided'; phase = 0; chosen = null; before = null;
    st = S.initial();
    $('#sTitle').textContent = S.title;
    $('#sObjective').textContent = S.objective;
    $('#sChapter').textContent = 'Scénario ' + S.id + ' sur ' + scenarios.length + ' · chapitre ' + S.chapter + ' du livre';
    document.title = 'Scénario ' + S.id + ' : ' + S.title + ' · NEXUS TRACE';
    $('#modeGuided').setAttribute('aria-pressed', 'true'); $('#modeFree').setAttribute('aria-pressed', 'false');
    $('#guide').hidden = false; $('#free').hidden = true;
    renderNav();
    rebuild({ metrics: false });
    renderFree();
    renderGuide();
    $('#viewArch').hidden = false; $('#viewTraffic').hidden = true;
    $('#tabArch').setAttribute('aria-selected', 'true'); $('#tabTraffic').setAttribute('aria-selected', 'false');
  }

  function fromHash() {
    var m = /scenario-(\d+)/.exec(location.hash);
    var id = m ? +m[1] : 1;
    if (!S || S.id !== id) loadScenario(id);
  }

  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    NT.store.set('nt.theme', t);
    $('#themeBtn').setAttribute('aria-pressed', String(t === 'dark'));
    $('#themeBtn').textContent = t === 'dark' ? 'Thème clair' : 'Thème sombre';
  }

  function init() {
    stage = new NT.Stage($('#stage'));
    var saved = NT.store.get('nt.theme', null);
    setTheme(saved || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    $('#themeBtn').addEventListener('click', function () { setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); });
    var dlg = $('#about');
    $('#aboutBtn').addEventListener('click', function () { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); });
    $('#aboutClose').addEventListener('click', function () { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); });
    $('#btnPlay').addEventListener('click', playAuto);
    $('#btnStep').addEventListener('click', stepOnce);
    $('#btnPause').addEventListener('click', pause);
    $('#btnReset').addEventListener('click', function () {
      st = (mode === 'guided' && phase === 3 && problemState) ? NT.clone(problemState) : S.initial();
      chosen = (phase === 3) ? null : chosen;
      rebuild({ metrics: mode === 'free' || phase === 3 }); syncFree();
      if (mode === 'guided') renderGuide();
    });
    $('#tabArch').addEventListener('click', function () { showView('arch'); });
    $('#tabTraffic').addEventListener('click', function () { showView('traffic'); });
    $('#modeGuided').addEventListener('click', function () { setMode('guided'); });
    $('#modeFree').addEventListener('click', function () { setMode('free'); });
    $('#guide').addEventListener('click', onGuideClick);
    window.addEventListener('hashchange', fromHash);
    renderOverall();
    fromHash();
  }
  function showView(v) {
    var arch = v === 'arch';
    $('#viewArch').hidden = !arch; $('#viewTraffic').hidden = arch;
    if (arch && stage) stage.fit();
    $('#tabArch').setAttribute('aria-selected', String(arch)); $('#tabTraffic').setAttribute('aria-selected', String(!arch));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
