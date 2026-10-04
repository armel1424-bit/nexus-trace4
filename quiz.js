/* NEXUS TRACE — interface du parcours de décisions */
(function () {
  var NQ = window.NQ;
  var SC = NQ.scenarios;
  var TOTAL = SC.length;
  var app = document.getElementById('app');
  var progressEl = document.getElementById('progress');

  /* ---------- état et stockage (localStorage uniquement) ---------- */
  var saved = { done: {}, first: {} };
  function load() {
    try {
      var raw = localStorage.getItem(NQ.STORE_KEY);
      if (raw) { var o = JSON.parse(raw); if (o && o.done) saved = { done: o.done || {}, first: o.first || {} }; }
    } catch (e) { /* stockage indisponible : on continue sans */ }
  }
  function save() { try { localStorage.setItem(NQ.STORE_KEY, JSON.stringify(saved)); } catch (e) {} }
  function reset() { saved = { done: {}, first: {} }; try { localStorage.removeItem(NQ.STORE_KEY); } catch (e) {} }

  function doneCount() { var c = 0; for (var i = 1; i <= TOTAL; i++) if (saved.done[i]) c++; return c; }
  function firstCount() { var c = 0; for (var i = 1; i <= TOTAL; i++) if (saved.done[i] && saved.first[i]) c++; return c; }
  function allDone() { return doneCount() === TOTAL; }
  function unlocked(id) { return allDone() || id === 1 || !!saved.done[id - 1]; }
  function nextTodo() { for (var i = 1; i <= TOTAL; i++) if (!saved.done[i]) return i; return null; }
  function byId(id) { return SC[id - 1]; }

  /* session courante */
  var cur = null; /* { id, qi, answered, result, clean, tried:[], sel:[] , tab, step } */

  /* ---------- utilitaires ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }
  var LOCK = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 11V8a5 5 0 0 1 10 0v3h1.5A1.5 1.5 0 0 1 20 12.5v7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5v-7A1.5 1.5 0 0 1 5.5 11H7zm2 0h6V8a3 3 0 0 0-6 0v3z" fill="currentColor"/></svg>';
  var CHECK = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.3 8.3 18.9 6.9z" fill="currentColor"/></svg>';
  var STATE_LABEL = { down: 'en panne', warn: 'attention', 'new': 'nouveau', hot: 'observé' };
  var STATE_MARK = { down: '✕', warn: '!', 'new': '+' };

  /* ---------- progression d’en-tête ---------- */
  function renderProgress() {
    var d = doneCount();
    progressEl.innerHTML =
      '<span class="pg-num"><strong>' + d + ' / ' + TOTAL + '</strong> scénarios maîtrisés</span>' +
      '<span class="pg-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + TOTAL + '" aria-valuenow="' + d + '" aria-label="Progression"><span style="width:' + (d / TOTAL * 100) + '%"></span></span>';
  }

  /* ---------- schéma (vue Architecture) ---------- */
  function sceneHTML(scene, compact) {
    var out = '<div class="scene' + (compact ? ' compact' : '') + '">';
    scene.forEach(function (blk, bi) {
      if (bi > 0) out += '<div class="vlink" aria-hidden="true">↓</div>';
      out += '<div class="blk"><div class="blk-t">' + esc(blk.t) + (blk.note ? ' <span class="blk-note">· ' + esc(blk.note) + '</span>' : '') + '</div>';
      out += '<div class="nodes ' + blk.mode + '">';
      blk.nodes.forEach(function (nd, i) {
        if (blk.mode === 'chain' && i > 0) {
          var cut = blk.cut === i - 1 || nd.st === 'down' || blk.nodes[i - 1].st === 'down';
          out += '<span class="arr' + (cut ? ' cut' : '') + '" aria-hidden="true">' + (cut ? '✕' : '→') + '</span>';
        }
        out += '<div class="node st-' + nd.st + '"><span class="n-l">' + esc(nd.l) + '</span>' +
          (nd.s ? '<span class="n-s">' + esc(nd.s) + '</span>' : '') +
          (STATE_MARK[nd.st] ? '<span class="n-m" aria-hidden="true">' + STATE_MARK[nd.st] + '</span><span class="sr">(' + STATE_LABEL[nd.st] + ')</span>' : '') +
          '</div>';
      });
      out += '</div></div>';
    });
    return out + '</div>';
  }

  /* ---------- trace (vue Trace) ---------- */
  var KIND = { reseau: 'Réseau', serveur: 'Serveur', client: 'Navigateur' };
  function traceHTML(steps, active, pointer) {
    var max = 0, total = 0, hasMs = false;
    steps.forEach(function (st) { if (st.ms !== null) { hasMs = true; total += st.ms; if (st.ms > max) max = st.ms; } });
    var out = '<ol class="trace">';
    steps.forEach(function (st, i) {
      var on = pointer && i === active;
      out += '<li class="tstep' + (on ? ' on' : '') + '"' + (on ? ' aria-current="step"' : '') + '>' +
        '<span class="t-n">' + (i + 1) + '</span><div class="t-b"><div class="t-h"><strong>' + esc(st.t) + '</strong>' +
        (st.kind ? '<span class="t-k k-' + st.kind + '">' + KIND[st.kind] + '</span>' : '') + '</div>' +
        '<div class="t-d">' + esc(st.d) + '</div>' +
        (st.ms !== null ? '<div class="t-bar"><span style="width:' + Math.max(2, st.ms / max * 100) + '%"></span><em>' + st.ms + ' ms</em></div>' : '') +
        '</div></li>';
    });
    out += '</ol>';
    if (hasMs) out += '<p class="t-total">Total simulé : <strong>' + total + ' ms</strong> <span>(ordres de grandeur pédagogiques)</span></p>';
    return out;
  }

  /* ---------- écran d’accueil ---------- */
  function renderHome(notice) {
    cur = null;
    var d = doneCount(), todo = nextTodo();
    var h = '';
    h += '<section class="hero">';
    h += '<p class="eyebrow">DIGITAL MINDS 04 · NEXUS</p>';
    h += '<h1>NEXUS TRACE</h1>';
    h += '<p class="tagline">Voir ce qui se passe réellement derrière une connexion</p>';
    h += '<p class="hook">« J’ouvre un site. Trace ce qui se passe. »</p>';
    h += '<p class="lead">8 scénarios. 8 décisions. Une infrastructure qui évolue avec tes choix.</p>';
    h += '<div class="hero-pg"><strong>' + d + ' / ' + TOTAL + '</strong> scénarios maîtrisés' + (d ? ' · maîtrise immédiate : ' + firstCount() + ' / ' + d : '') + '</div>';
    if (notice) h += '<p class="notice" role="status">' + esc(notice) + '</p>';
    if (allDone()) h += '<p class="free-badge">Mode libre déverrouillé : rejoue n’importe quel scénario.</p>';
    h += '<button class="btn primary big" id="start">' + (allDone() ? 'Rejouer depuis le début' : d ? 'Reprendre au scénario ' + todo : 'Commencer') + '</button>';
    h += '</section>';
    h += '<section class="how"><h2>Comment ça marche</h2><ol class="how-list">' +
      '<li><b>Situation.</b> Tu vois une infrastructure et un problème.</li>' +
      '<li><b>Décision.</b> Tu choisis. Aucun risque : une mauvaise réponse explique, puis tu réessaies.</li>' +
      '<li><b>Pourquoi.</b> Chaque réponse est expliquée, avec ce qui change dans l’architecture.</li></ol>' +
      '<p class="note">Tout est simulé dans ton navigateur. Aucun compte, aucune donnée envoyée. Ta progression reste sur cet appareil.</p></section>';
    h += '<section class="list"><h2>Les 8 scénarios</h2><ol class="cards">';
    SC.forEach(function (s) {
      var lock = !unlocked(s.id), dn = !!saved.done[s.id];
      h += '<li><button class="scard' + (dn ? ' done' : '') + (lock ? ' locked' : '') + '" data-open="' + s.id + '"' + (lock ? ' aria-disabled="true"' : '') + '>' +
        '<span class="s-n">' + s.id + '</span><span class="s-t"><strong>' + esc(s.title) + '</strong><small>Chapitre ' + s.chapter + (lock ? ' · verrouillé' : dn ? ' · maîtrisé' : '') + '</small></span>' +
        '<span class="s-i">' + (lock ? LOCK : dn ? CHECK : '›') + '</span></button></li>';
    });
    h += '</ol></section>';
    h += resetBlock();
    app.innerHTML = h;
    document.title = 'NEXUS TRACE — Voir ce qui se passe réellement derrière une connexion';
    wireCommon();
    document.getElementById('start').addEventListener('click', function () { go(allDone() ? 1 : todo); });
    window.scrollTo(0, 0);
  }

  function resetBlock() {
    return '<footer class="foot"><div id="resetZone"><button class="btn ghost" id="resetAsk">Réinitialiser ma progression</button></div>' +
      '<p class="note">Progression gardée uniquement dans ce navigateur (localStorage). Rien n’est envoyé.</p></footer>';
  }

  function wireCommon() {
    Array.prototype.forEach.call(app.querySelectorAll('[data-open]'), function (b) {
      b.addEventListener('click', function () { go(+b.getAttribute('data-open')); });
    });
    var ask = document.getElementById('resetAsk');
    if (ask) ask.addEventListener('click', function () {
      var z = document.getElementById('resetZone');
      z.innerHTML = '<p class="warn-t">Effacer toute ta progression sur cet appareil ?</p><button class="btn danger" id="resetYes">Oui, tout effacer</button> <button class="btn ghost" id="resetNo">Annuler</button>';
      document.getElementById('resetYes').addEventListener('click', function () { reset(); renderProgress(); if (location.hash) history.replaceState(null, '', location.pathname); renderHome('Progression effacée.'); });
      document.getElementById('resetNo').addEventListener('click', function () { z.innerHTML = '<button class="btn ghost" id="resetAsk2">Réinitialiser ma progression</button>'; document.getElementById('resetAsk2').addEventListener('click', function () { wireCommonReset(); }); wireCommonReset(); });
    });
  }
  function wireCommonReset() { route(); }

  /* ---------- navigation ---------- */
  function go(id) {
    if (location.hash !== '#scenario-' + id) { location.hash = '#scenario-' + id; } else { route(); }
  }
  function route() {
    var m = /^#scenario-(\d+)$/.exec(location.hash);
    if (!m) { renderHome(); return; }
    var id = +m[1];
    if (id < 1 || id > TOTAL) { renderHome(); return; }
    if (!unlocked(id)) {
      var t = nextTodo();
      renderHome('Le scénario ' + id + ' se débloque après la validation du scénario ' + (id - 1) + '. Reprends au scénario ' + t + '.');
      return;
    }
    openScenario(id);
  }

  /* ---------- écran de scénario ---------- */
  function openScenario(id) {
    cur = { id: id, qi: 0, answered: false, result: null, clean: true, tried: [], sel: [], tab: 'arch', step: 0 };
    renderScenario();
    window.scrollTo(0, 0);
  }

  function navChips() {
    var h = '<nav class="chips" aria-label="Scénarios">';
    SC.forEach(function (s) {
      var lock = !unlocked(s.id), on = cur && cur.id === s.id, dn = !!saved.done[s.id];
      h += '<button class="chip' + (on ? ' on' : '') + (dn ? ' done' : '') + (lock ? ' locked' : '') + '" data-open="' + s.id + '"' + (on ? ' aria-current="true"' : '') + (lock ? ' aria-disabled="true"' : '') +
        ' aria-label="Scénario ' + s.id + (lock ? ' verrouillé' : dn ? ' maîtrisé' : '') + '">' + (lock ? LOCK : dn && !on ? CHECK : s.id) + '</button>';
    });
    return h + '</nav>';
  }

  function loopStrip() {
    var active = cur.answered ? 5 : 3;
    var h = '<ol class="loop" aria-label="Boucle d’apprentissage">';
    NQ.LOOP.forEach(function (w, i) { h += '<li class="' + (i < active ? 'past' : i === active ? 'now' : '') + '"' + (i === active ? ' aria-current="step"' : '') + '>' + w + '</li>'; });
    return h + '</ol>';
  }

  function renderScenario() {
    var s = byId(cur.id), q = s.questions[cur.qi];
    var multi = q.kind === 'multi';
    var h = '';
    h += '<div class="topbar"><button class="back" id="back">← Parcours</button>' + navChips() + '</div>';
    h += '<section class="sc-card"><p class="eyebrow">Scénario ' + s.id + ' / ' + TOTAL + ' · chapitre ' + s.chapter + (allDone() ? ' · mode libre' : '') + '</p>' +
      '<h1 class="sc-title" tabindex="-1" id="scTitle">' + esc(s.title) + '</h1><p class="sc-goal">' + esc(s.goal) + '</p>' + loopStrip() + '</section>';

    var scene = s.scene, trace = s.trace;
    h += '<section class="viz" aria-label="Visualisation de l’infrastructure"><div class="tabs" role="tablist">' +
      '<button role="tab" id="tabArch" aria-selected="' + (cur.tab === 'arch') + '" aria-controls="panArch" class="' + (cur.tab === 'arch' ? 'on' : '') + '">ARCHITECTURE</button>' +
      '<button role="tab" id="tabTrace" aria-selected="' + (cur.tab === 'trace') + '" aria-controls="panTrace" class="' + (cur.tab === 'trace' ? 'on' : '') + '">TRACE</button></div>' +
      '<div id="panArch" role="tabpanel" aria-labelledby="tabArch"' + (cur.tab === 'arch' ? '' : ' hidden') + '><p class="viz-q">Qui parle à qui ? Quels composants existent ?</p>' + sceneHTML(scene) + '</div>' +
      '<div id="panTrace" role="tabpanel" aria-labelledby="tabTrace"' + (cur.tab === 'trace' ? '' : ' hidden') + '><p class="viz-q">Le trajet de la requête, étape par étape.</p>' +
      '<div id="traceBody">' + traceHTML(trace, cur.step, true) + '</div>' +
      '<div class="stepper"><button class="btn mini" id="prevStep" aria-label="Étape précédente">‹ Précédente</button><span id="stepInfo">Étape ' + (cur.step + 1) + ' / ' + trace.length + '</span><button class="btn mini" id="nextStep" aria-label="Étape suivante">Suivante ›</button></div></div></section>';

    h += '<section class="qzone">';
    if (s.questions.length > 1) h += '<p class="qcount">Question ' + (cur.qi + 1) + ' sur ' + s.questions.length + '</p>';
    h += '<div class="block"><span class="lab">SITUATION</span><p class="situation">' + fmt(q.situation) + '</p></div>';
    h += '<div class="block"><span class="lab">DÉCISION</span><h2 class="ask" id="ask">' + esc(q.ask) + '</h2>' + (multi ? '<p class="hint">Plusieurs réponses possibles.</p>' : '') + '</div>';
    h += '<div class="choices" role="' + (multi ? 'group' : 'group') + '" aria-labelledby="ask" id="choices">';
    q.choices.forEach(function (c, i) {
      var L = String.fromCharCode(65 + i);
      h += '<button class="choice' + (q.kind === 'action' ? ' action' : '') + '" data-i="' + i + '"' + (multi ? ' role="checkbox" aria-checked="false"' : '') + '><span class="c-l">' + (multi ? '' : L) + '</span><span class="c-t">' + esc(c.t) + '</span></button>';
    });
    h += '</div>';
    if (multi) h += '<button class="btn primary" id="validate" disabled>Valider ma sélection</button>';
    h += '<div id="result" aria-live="polite"></div>';
    h += '</section>';
    h += resetBlock();
    app.innerHTML = h;
    document.title = 'Scénario ' + s.id + ' — ' + s.title + ' · NEXUS TRACE';
    wireCommon();
    wireScenario(q);
  }

  function wireScenario(q) {
    var s = byId(cur.id);
    document.getElementById('back').addEventListener('click', function () { location.hash = ''; history.replaceState(null, '', location.pathname); route(); });
    function setTab(t) {
      cur.tab = t;
      document.getElementById('tabArch').setAttribute('aria-selected', t === 'arch');
      document.getElementById('tabTrace').setAttribute('aria-selected', t === 'trace');
      document.getElementById('tabArch').classList.toggle('on', t === 'arch');
      document.getElementById('tabTrace').classList.toggle('on', t === 'trace');
      document.getElementById('panArch').hidden = t !== 'arch';
      document.getElementById('panTrace').hidden = t !== 'trace';
    }
    document.getElementById('tabArch').addEventListener('click', function () { setTab('arch'); });
    document.getElementById('tabTrace').addEventListener('click', function () { setTab('trace'); });
    function showStep() {
      document.getElementById('traceBody').innerHTML = traceHTML(s.trace, cur.step, true);
      document.getElementById('stepInfo').textContent = 'Étape ' + (cur.step + 1) + ' / ' + s.trace.length;
    }
    document.getElementById('prevStep').addEventListener('click', function () { if (cur.step > 0) { cur.step--; showStep(); } });
    document.getElementById('nextStep').addEventListener('click', function () { if (cur.step < s.trace.length - 1) { cur.step++; showStep(); } });

    var btns = Array.prototype.slice.call(document.querySelectorAll('#choices .choice'));
    if (q.kind === 'multi') {
      var validate = document.getElementById('validate');
      btns.forEach(function (bt) {
        bt.addEventListener('click', function () {
          if (cur.answered) return;
          var on = bt.classList.toggle('sel');
          bt.setAttribute('aria-checked', on);
          validate.disabled = !btns.some(function (x) { return x.classList.contains('sel'); });
        });
      });
      validate.addEventListener('click', function () {
        if (cur.answered) return;
        var sel = btns.map(function (x) { return x.classList.contains('sel'); });
        answerMulti(q, sel, btns);
      });
    } else {
      btns.forEach(function (bt) {
        bt.addEventListener('click', function () { if (!cur.answered) answerSingle(q, +bt.getAttribute('data-i'), btns); });
      });
    }
  }

  /* ---------- réponses ---------- */
  function verdictOf(ok) { return ok === true ? 'good' : ok === 'part' ? 'part' : 'bad'; }
  var VERDICT_TXT = { good: 'Bonne logique', part: 'Partiellement juste', bad: 'Pas tout à fait' };

  function answerSingle(q, i, btns) {
    var c = q.choices[i], v = verdictOf(c.ok);
    cur.answered = true; cur.result = v;
    btns.forEach(function (b, k) { b.disabled = true; b.classList.toggle('picked', k === i); });
    btns[i].classList.add('is-' + v);
    if (v !== 'good') cur.clean = false;
    var html = panel(v, '<p>' + fmt(c.why) + '</p>', q, c.change, consequence(c.cons || c.change, c.outcome, v));
    finishAnswer(q, v, html);
  }

  function answerMulti(q, sel, btns) {
    var allOk = q.choices.every(function (c, k) { return !!c.ok === sel[k]; });
    var v = allOk ? 'good' : 'bad';
    cur.answered = true; cur.result = v;
    btns.forEach(function (b, k) {
      b.disabled = true;
      var c = q.choices[k], right = !!c.ok === sel[k];
      b.classList.add(right ? 'is-good' : 'is-bad');
      var tag = document.createElement('span'); tag.className = 'c-r';
      tag.textContent = right ? '✓' : '✕'; b.appendChild(tag);
    });
    document.getElementById('validate').hidden = true;
    if (v !== 'good') cur.clean = false;
    var why = '<ul class="why-list">' + q.choices.map(function (c, k) {
      var right = !!c.ok === sel[k];
      var verb = c.ok ? (sel[k] ? 'Bien vu : à mettre en cache / à repérer.' : 'Oublié : il fallait le sélectionner.') : (sel[k] ? 'À ne pas sélectionner.' : 'Bien vu : à laisser de côté.');
      return '<li class="' + (right ? 'ok' : 'ko') + '"><span aria-hidden="true">' + (right ? '✓' : '✕') + '</span><div><strong>' + esc(c.t) + '</strong><br><span class="v">' + verb + '</span> ' + esc(c.why) + '</div></li>';
    }).join('') + '</ul>';
    var change = allOk ? q.okCons : q.badCons;
    var outcome = allOk ? q.outcomeOk : null;
    finishAnswer(q, v, panel(v, why, q, change, consequence(change, outcome, v)));
  }

  function consequence(text, outcome, v) {
    var h = '<div class="block cons"><span class="lab">CONSÉQUENCE</span>';
    if (outcome && outcome.scene) h += sceneHTML(outcome.scene, true);
    if (outcome && outcome.trace) h += traceHTML(outcome.trace, 0, false);
    return h + '<p class="cons-t">' + fmt(text) + '</p></div>';
  }

  function panel(v, whyHTML, q, change, consHTML) {
    var h = '<section class="why ' + v + '" id="why" tabindex="-1" aria-label="Explication">';
    h += '<h3>POURQUOI ?</h3><p class="verdict v-' + v + '">' + VERDICT_TXT[v] + '</p>';
    h += '<div class="w-sec"><span class="lab">1 · Explication</span>' + whyHTML + '</div>';
    h += '<div class="w-sec"><span class="lab">2 · Principe NEXUS</span><p>' + fmt(q.principle) + '</p></div>';
    h += '<div class="w-sec"><span class="lab">3 · Ce qui change dans l’architecture</span><p>' + fmt(change || 'Rien ne change dans l’architecture.') + '</p></div>';
    if (q.others) h += '<div class="w-sec"><span class="lab">4 · Et les autres choix ?</span><p>' + fmt(q.others) + '</p></div>';
    return h + '</section>' + consHTML;
  }

  function finishAnswer(q, v, html) {
    var s = byId(cur.id);
    var last = cur.qi === s.questions.length - 1;
    var h = html;
    if (v === 'good') {
      if (last) {
        completeScenario();
        var nxt = cur.id < TOTAL ? cur.id + 1 : null;
        h += '<div class="done-card" role="status"><strong>Scénario ' + s.id + ' maîtrisé' + (cur.clean ? ' du premier coup' : '') + '.</strong> ' +
          (nxt ? 'Le scénario ' + nxt + ' est déverrouillé.' : 'Tu as terminé les 8 scénarios : le mode libre est déverrouillé.') + '</div>';
        h += nxt ? '<button class="btn primary big" id="cont">CONTINUER · scénario ' + nxt + ' →</button>' : '<button class="btn primary big" id="cont">TERMINER LE PARCOURS</button>';
      } else {
        h += '<button class="btn primary big" id="cont">CONTINUER →</button>';
      }
    } else {
      h += '<div class="retry-card">Pas de pénalité : ta progression est conservée.</div><button class="btn primary big" id="retry">RÉESSAYER</button>';
    }
    var r = document.getElementById('result');
    r.innerHTML = h;
    renderProgress();
    var loop = document.querySelector('.loop');
    if (loop) { var li = loop.querySelectorAll('li'); for (var k = 0; k < li.length; k++) li[k].className = k < 5 ? 'past' : 'now'; }
    var w = document.getElementById('why'); if (w) { w.focus({ preventScroll: true }); w.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    var cont = document.getElementById('cont'), retry = document.getElementById('retry');
    if (cont) cont.addEventListener('click', function () {
      if (!last) { cur.qi++; cur.answered = false; cur.result = null; cur.step = 0; renderScenario(); window.scrollTo(0, 0); }
      else if (cur.id < TOTAL) go(cur.id + 1);
      else { location.hash = ''; history.replaceState(null, '', location.pathname); route(); }
    });
    if (retry) retry.addEventListener('click', function () { cur.answered = false; cur.result = null; renderScenario(); document.getElementById('ask').scrollIntoView({ block: 'center' }); });
  }

  function completeScenario() {
    var id = cur.id;
    if (!saved.done[id]) { saved.done[id] = true; saved.first[id] = !!cur.clean; save(); }
    /* rafraîchit la navigation : le scénario suivant se déverrouille aussitôt */
    var nav = document.querySelector('.chips');
    if (nav) {
      nav.outerHTML = navChips();
      Array.prototype.forEach.call(document.querySelectorAll('.chips [data-open]'), function (b) {
        b.addEventListener('click', function () { go(+b.getAttribute('data-open')); });
      });
    }
  }

  /* ---------- démarrage ---------- */
  load();
  renderProgress();
  window.addEventListener('hashchange', route);
  document.getElementById('brand').addEventListener('click', function (e) { e.preventDefault(); history.replaceState(null, '', location.pathname); route(); });
  route();
})();
