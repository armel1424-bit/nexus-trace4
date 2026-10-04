/* NEXUS TRACE — scénarios 5 à 8 */
(function () {
  var root = typeof window !== 'undefined' ? window : globalThis;
  var NT = root.NT;

  function step(from, to, label, ms, o) {
    return Object.assign({ from: from, to: to, label: label, ms: ms || 0, status: 'ok' }, o || {});
  }
  function m(key, label, value, tone) { return { key: key, label: label, value: String(value), tone: tone || '' }; }

  /* =====================================================================
     SCÉNARIO 5 — Plusieurs serveurs (chapitre 16)
     ===================================================================== */
  var WEIGHTS = [1, 3, 1, 1, 3, 1, 1, 1, 3, 1, 1, 1];

  NT.scenarios.push({
    id: 5, key: 'load-balancer', chapter: 16,
    title: 'Plusieurs serveurs',
    short: 'Répartir la charge',
    objective: 'Comprendre qui choisit le serveur qui répond, et ce qu’il faut pour que plusieurs serveurs soient interchangeables.',
    observe: 'Douze requêtes arrivent à une seule adresse publique. Certaines sont légères, d’autres lourdes. Lance la simulation et regarde le load balancer choisir.',
    freeHint: 'Fais tomber le serveur B, retire le contrôle de santé, change la règle de répartition.',
    initial: function () { return { algo: 'rr', health: true, bDown: false, shared: true }; },
    problem: function () { return { algo: 'rr', health: true, bDown: false, shared: false }; },
    controls: [
      { key: 'algo', type: 'select', label: 'Règle de répartition', options: [['rr', 'Tour de rôle'], ['least', 'Le moins chargé']] },
      { key: 'health', type: 'toggle', label: 'Contrôle de santé actif' },
      { key: 'bDown', type: 'toggle', label: 'Le serveur B est tombé' },
      { key: 'shared', type: 'toggle', label: 'Base de données partagée', help: 'Sinon, chaque serveur garde son propre compteur.' }
    ],
    layout: function (st) {
      var nodes = [
        { id: 'users', tag: 'Visiteurs', label: 'Une seule adresse', sub: 'nexus-demo.example', x: 100, y: 220, w: 150 },
        { id: 'lb', tag: 'Load balancer', label: 'Répartiteur', sub: st.health ? 'contrôle de santé actif' : 'sans contrôle de santé', x: 320, y: 220 },
        { id: 'A', tag: 'Serveur', label: 'Serveur A', x: 540, y: 90 },
        { id: 'B', tag: 'Serveur', label: 'Serveur B', x: 540, y: 220 },
        { id: 'C', tag: 'Serveur', label: 'Serveur C', x: 540, y: 350 }
      ];
      var links = [
        { id: 'u-lb', a: 'users', b: 'lb' }, { id: 'lb-A', a: 'lb', b: 'A' },
        { id: 'lb-B', a: 'lb', b: 'B' }, { id: 'lb-C', a: 'lb', b: 'C' }
      ];
      if (st.shared) {
        nodes.push({ id: 'db', tag: 'Données', label: 'Base partagée', sub: 'un seul compteur', x: 790, y: 220 });
        ['A', 'B', 'C'].forEach(function (n) { links.push({ id: n + '-db', a: n, b: 'db' }); });
      } else {
        [['A', 90], ['B', 220], ['C', 350]].forEach(function (p) {
          nodes.push({ id: 'db' + p[0], tag: 'Données', label: 'Base ' + p[0], sub: 'compteur local', x: 790, y: p[1] });
          links.push({ id: p[0] + '-db', a: p[0], b: 'db' + p[0] });
        });
      }
      return { nodes: nodes, links: links };
    },
    onNodeClick: function (st, id) { if (id === 'B') { st.bDown = !st.bDown; return st; } return null; },
    sim: function (st) {
      var names = ['A', 'B', 'C'], bDown = !!st.bDown;
      var rotation = names.filter(function (n) { return !(n === 'B' && bDown && st.health); });
      var load = { A: 0, B: 0, C: 0 }, count = { A: 0, B: 0, C: 0 }, fails = 0, rr = 0;
      var counters = st.shared ? { g: 4217 } : { A: 4217, B: 983, C: 2560 };
      var firstN = null, lastN = {}, steps = [];
      steps.push(step('users', 'lb', '12 requêtes arrivent à l’adresse unique', 5, {
        stage: 'Entrée', flow: 'HTTP',
        note: 'Les visiteurs ne connaissent qu’**une** destination publique. Le [[load balancer]] reçoit tout et choisit.'
      }));
      WEIGHTS.forEach(function (w, i) {
        var target;
        if (st.algo === 'rr') { target = rotation[rr % rotation.length]; rr++; }
        else {
          target = rotation.slice().sort(function (a, b) { return load[a] - load[b] || names.indexOf(a) - names.indexOf(b); })[0];
        }
        var dead = target === 'B' && bDown;
        count[target]++;
        var heavy = w > 1 ? 'lourde' : 'légère';
        if (dead) {
          fails++;
          steps.push(step('lb', target, 'Requête ' + (i + 1) + ' (' + heavy + ') vers ' + target + ' : sans réponse', 10, {
            stage: 'Requête ' + (i + 1) + '/12', flow: 'HTTP', status: 'fail', response: 'Erreur : serveur injoignable',
            note: 'B est tombé, mais **personne ne le sait** : sans contrôle de santé, le répartiteur continue de lui envoyer du trafic.' +
              (st.algo === 'least' ? ' Comme B n’accumule jamais de travail, la règle « le moins chargé » lui envoie encore plus de requêtes.' : '')
          }));
        } else {
          load[target] += w;
          var n;
          if (st.shared) { counters.g++; n = counters.g; if (firstN === null) firstN = n; lastN.g = n; }
          else { counters[target]++; n = counters[target]; lastN[target] = n; }
          steps.push(step('lb', target, 'Requête ' + (i + 1) + ' (' + heavy + ') vers ' + target, 10 + w * 10, {
            stage: 'Requête ' + (i + 1) + '/12', flow: 'HTTP', response: 'visiteur n° ' + n,
            note: (st.algo === 'rr' ? 'Tour de rôle : on passe au serveur suivant, quel que soit le poids de la requête.' : 'Le moins chargé : le répartiteur choisit le serveur qui a le moins de travail en cours.') +
              (st.shared ? '' : ' Ce serveur répond avec **son** compteur local : ' + n + '.')
          }));
        }
      });
      var served = WEIGHTS.length - fails;
      var spread = Math.max(load.A, load.C, rotation.indexOf('B') >= 0 ? load.B : 0) - Math.min.apply(null, rotation.map(function (k) { return load[k]; }));
      var counterText = st.shared
        ? (lastN.g ? 'Un seul : n° ' + firstN + ' à ' + lastN.g : '—')
        : names.filter(function (k) { return lastN[k]; }).map(function (k) { return k + ' n° ' + lastN[k]; }).join(' · ');
      var nodes = {};
      if (bDown) nodes.B = { state: 'down' };
      if (bDown && !st.health) nodes.lb = { state: 'warn' };
      var level = fails > 0 ? 'degraded' : 'ok';
      return {
        steps: steps, nodes: nodes,
        metrics: [
          m('dist', 'Requêtes par serveur', names.map(function (k) { return k + ' ' + count[k]; }).join(' · ')),
          m('load', 'Travail réel (poids)', names.map(function (k) { return k + ' ' + load[k]; }).join(' · '), spread > 2 ? 'warn' : 'good'),
          m('fails', 'Requêtes en échec', fails + ' sur ' + WEIGHTS.length, fails ? 'bad' : 'good'),
          m('counter', 'Compteur de visites', counterText, st.shared ? 'good' : 'bad')
        ],
        verdict: fails > 0
          ? { level: level, text: fails + ' visiteurs sur ' + WEIGHTS.length + ' reçoivent une erreur : le répartiteur ne sait pas que B est tombé.' }
          : (!st.shared
            ? { level: 'degraded', text: 'Le service répond, mais le compteur se contredit : chaque serveur garde un état local différent.' }
            : { level: 'ok', text: served + ' requêtes servies, un seul compteur cohérent.' })
      };
    },
    learn: [
      'Les visiteurs n’ont qu’**une seule destination**. Quelqu’un doit choisir le serveur qui répond : le load balancer.',
      'Le **contrôle de santé** retire un serveur qui ne répond plus. Sans lui, une panne devient visible pour les visiteurs.',
      'Un **tour de rôle** équilibre le nombre de requêtes, pas le travail. « Le moins chargé » tient compte du poids.',
      'Les serveurs ne sont **interchangeables** que si leurs données communes vivent ailleurs : une base partagée.'
    ],
    why: [{ brick: 'Load balancer', problem: 'répartir les requêtes entre plusieurs serveurs' }],
    decision: {
      problemText: 'Trois serveurs répondent, mais le compteur se contredit : « visiteur n° 4 217 », puis « n° 983 », puis « n° 2 560 ».',
      question: 'Comment corriger ça ?',
      choices: [
        { id: 'a', label: 'Faire lire et écrire tous les serveurs dans une même base partagée', verdict: 'good', apply: function (s) { s.shared = true; return s; },
          feedback: 'Chaque serveur avait un état local. En déplaçant la donnée hors des serveurs, ils deviennent interchangeables. La base devient en revanche un nouveau point unique de panne.' },
        { id: 'b', label: 'Passer de « tour de rôle » à « le moins chargé »', verdict: 'bad', apply: function (s) { s.algo = 'least'; return s; },
          feedback: 'La règle de répartition change qui répond, pas où le compteur est stocké. Les trois compteurs restent séparés.' },
        { id: 'c', label: 'Ajouter un quatrième serveur', verdict: 'bad', apply: function (s) { return s; },
          feedback: 'Un serveur de plus ajoute un compteur local de plus. Le problème vient de l’état local, pas du nombre de serveurs.' }
      ]
    },
    explain: {
      q: 'Le serveur B tombe et le contrôle de santé est désactivé. Que voient les visiteurs ?',
      options: [
        { t: 'Rien : les autres serveurs prennent le relais automatiquement.', ok: false, fb: 'Sans contrôle de santé, le répartiteur ignore la panne et continue d’envoyer du trafic à B.' },
        { t: 'Environ un visiteur sur trois reçoit une erreur.', ok: true, fb: 'Exact : B reste dans la rotation. Le contrôle de santé sert précisément à le retirer.' },
        { t: 'Le service entier s’arrête.', ok: false, fb: 'A et C répondent toujours. Seules les requêtes envoyées à B échouent.' }
      ]
    }
  });

  /* =====================================================================
     SCÉNARIO 6 — Utilisateurs éloignés (chapitre 17)
     ===================================================================== */
  var CONTENTS = {
    image: { label: 'Le logo (identique pour tous)', compute: 20, cacheable: true },
    page: { label: 'La page avec compteur (change à chaque visite)', compute: 60, cacheable: false },
    private: { label: 'Les données personnelles d’un compte', compute: 40, cacheable: false }
  };

  NT.scenarios.push({
    id: 6, key: 'cdn', chapter: 17,
    title: 'Utilisateurs éloignés',
    short: 'Cache et CDN',
    objective: 'Comprendre pourquoi on rapproche des copies des utilisateurs, et ce qu’on ne doit jamais copier.',
    observe: 'Un visiteur en Afrique demande cinq fois le logo de NEXUS DEMO, dont l’original est en Europe. Lance la simulation et mesure chaque voyage.',
    freeHint: 'Change le type de contenu et active le CDN pour voir ce qui en profite.',
    initial: function () { return { cdn: false, content: 'image', force: false }; },
    problem: function () { return { cdn: false, content: 'image', force: false }; },
    controls: [
      { key: 'cdn', type: 'toggle', label: 'CDN actif' },
      { key: 'content', type: 'select', label: 'Contenu demandé', options: [['image', 'Le logo'], ['page', 'La page avec compteur'], ['private', 'Données personnelles']] },
      { key: 'force', type: 'toggle', label: 'Forcer la mise en cache (même du personnel)', help: 'À ne jamais faire en vrai.' }
    ],
    layout: function (st) {
      var nodes = [
        { id: 'user', tag: 'Visiteur', label: 'Afrique', sub: 'loin de l’origine', x: 110, y: 230 },
        { id: 'origin', tag: 'Origine', label: 'Serveur d’origine', sub: 'Europe', x: 810, y: 230 }
      ];
      var links = [{ id: 'u-o', a: 'user', b: 'origin', label: '180 ms' }];
      if (st.cdn) {
        nodes.push({ id: 'pop', tag: 'CDN', label: 'Point de présence', sub: 'près du visiteur', x: 460, y: 90 });
        links.push({ id: 'u-p', a: 'user', b: 'pop', label: '20 ms' }, { id: 'p-o', a: 'pop', b: 'origin', label: '160 ms' });
      }
      return { nodes: nodes, links: links };
    },
    sim: function (st) {
      var c = CONTENTS[st.content];
      var cached = !!st.cdn && (c.cacheable || (st.content === 'private' && !!st.force));
      var steps = [], originHits = 0, cdnHits = 0, total = 0;
      for (var i = 1; i <= 5; i++) {
        var tag = 'Requête ' + i + '/5', ms;
        if (!st.cdn) {
          ms = 180 + c.compute; originHits++;
          steps.push(step('user', 'origin', tag + ' : voyage jusqu’à l’origine', ms, { stage: tag, flow: 'HTTP', response: '200 OK', note: 'Chaque demande fait tout le trajet jusqu’à l’origine, puis revient. Le visiteur lointain attend toujours autant.' }));
          total += ms;
        } else if (cached && i > 1) {
          ms = 20; cdnHits++;
          var leak = st.content === 'private';
          steps.push(step('user', 'pop', tag + ' : copie trouvée près de toi', ms, {
            stage: tag, flow: 'HTTP · CDN', status: leak ? 'fail' : 'ok', response: leak ? 'Copie partagée : données personnelles exposées' : '200 OK · depuis le CDN',
            note: leak ? 'Cette copie est servie à **tous** les visiteurs : l’un d’eux pourrait recevoir les données d’un autre. On ne met jamais en cache du personnel.' : 'Copie trouvée : la réponse vient d’à côté, sans solliciter l’origine.'
          }));
          total += ms;
        } else if (cached) {
          steps.push(step('user', 'pop', tag + ' : copie absente, demande au CDN', 20, { stage: tag, flow: 'HTTP · CDN', note: 'Première demande : le CDN n’a pas encore de copie.' }));
          ms = 160 + c.compute; originHits++;
          steps.push(step('pop', 'origin', tag + ' : le CDN va chercher à l’origine', ms, { stage: tag, flow: 'HTTP', response: '200 OK · copie gardée', note: 'Le CDN récupère l’original et en garde une copie pour les visiteurs suivants.' }));
          total += 20 + ms;
        } else {
          steps.push(step('user', 'pop', tag + ' : transmis par le CDN', 20, { stage: tag, flow: 'HTTP · CDN', note: st.content === 'private' ? 'Contenu personnel : il n’est pas mis en cache, le CDN le laisse passer.' : 'Contenu recalculé à chaque visite : le CDN n’a rien à copier.' }));
          ms = 160 + c.compute; originHits++;
          steps.push(step('pop', 'origin', tag + ' : calculé à l’origine', ms, { stage: tag, flow: 'HTTP', response: '200 OK', note: 'Le CDN accélère la **livraison** de contenus prêts. Il ne calcule pas à la place du serveur.' }));
          total += 20 + ms;
        }
      }
      var avg = total / 5;
      var leakNow = cached && st.content === 'private';
      var first = steps.length ? (function () { var t = 0, k = 0; for (var j = 0; j < steps.length && steps[j].stage === 'Requête 1/5'; j++) t += steps[j].ms; return t; })() : 0;
      return {
        steps: steps, nodes: leakNow ? { pop: { state: 'down', sub: 'copie partagée !' } } : {},
        metrics: [
          m('avg', 'Temps moyen', NT.fmtMs(avg), avg <= 80 ? 'good' : (avg > 200 ? 'warn' : '')),
          m('first', 'Première requête', NT.fmtMs(first)),
          m('cdn', 'Servies par le CDN', cdnHits + ' sur 5', cdnHits ? 'good' : ''),
          m('origin', 'Reçues par l’origine', originHits + ' sur 5', originHits <= 1 ? 'good' : ''),
          m('safe', 'Données personnelles', leakNow ? 'Exposées' : 'Protégées', leakNow ? 'bad' : 'good')
        ],
        verdict: leakNow
          ? { level: 'down', text: 'Danger : une copie partagée de données personnelles peut être servie à un autre visiteur.' }
          : (cdnHits ? { level: 'ok', text: 'Moyenne de ' + NT.fmtMs(avg) + ' : l’origine ne reçoit plus que ' + originHits + ' requête sur 5.' }
            : { level: st.cdn ? 'degraded' : 'degraded', text: 'Chaque requête fait le voyage complet : ' + NT.fmtMs(avg) + ' en moyenne.' })
      };
    },
    learn: [
      'La distance coûte du **temps**, et ce temps est incompressible. La solution est de rapprocher une **copie**.',
      'Le CDN garde des copies dans des points de présence répartis : la **première** requête va à l’origine, les suivantes sont locales.',
      'Il n’accélère que des contenus **prêts et identiques pour tous**. Une page recalculée à chaque visite doit être calculée à l’origine.',
      'On ne met **jamais en cache** de l’information personnelle : une copie partagée peut être servie à la mauvaise personne.'
    ],
    why: [{ brick: 'Cache', problem: 'éviter de refaire le voyage' }, { brick: 'CDN', problem: 'rapprocher les contenus des utilisateurs' }],
    decision: {
      problemText: 'Chaque demande du logo fait le voyage complet vers l’Europe : environ 200 ms, cinq fois de suite.',
      question: 'Que fais-tu ?',
      choices: [
        { id: 'a', label: 'Placer des copies près des visiteurs avec un CDN', verdict: 'good', apply: function (s) { s.cdn = true; return s; },
          feedback: 'Le logo est identique pour tous : il peut être copié. La première requête va à l’origine, les quatre suivantes sont servies à côté du visiteur.' },
        { id: 'b', label: 'Acheter un serveur d’origine plus puissant', verdict: 'bad', apply: function (s) { return s; },
          feedback: 'Un serveur plus rapide calcule plus vite, mais ne rapproche pas l’Europe de l’Afrique. Le temps de voyage reste le même.' },
        { id: 'c', label: 'Mettre aussi en cache les données personnelles des comptes', verdict: 'bad', apply: function (s) { s.cdn = true; s.content = 'private'; s.force = true; return s; },
          feedback: 'Très dangereux : une copie partagée peut être servie à un autre visiteur. Ce qui est personnel ne se met jamais en cache partagé.' }
      ]
    },
    explain: {
      q: 'Pourquoi un CDN n’accélère-t-il pas la page avec compteur ?',
      options: [
        { t: 'Il livre des copies de contenus prêts ; cette page est recalculée à chaque visite.', ok: true, fb: 'Exactement. Le CDN accélère la livraison, il ne calcule pas à la place du serveur.' },
        { t: 'Le CDN ne fonctionne qu’avec des images.', ok: false, fb: 'Il peut servir bien d’autres contenus. Ce qui compte, c’est qu’ils soient prêts et identiques pour tous.' },
        { t: 'La page est trop lourde pour un CDN.', ok: false, fb: 'Le poids n’est pas en cause : c’est le fait qu’elle change à chaque visite.' }
      ]
    }
  });

  /* =====================================================================
     SCÉNARIO 7 — Une machine tombe (chapitre 19)
     ===================================================================== */
  var NAMES7 = { lb: 'le load balancer', lb2: 'le second load balancer', A: 'le serveur A', B: 'le serveur B', C: 'le serveur C', db: 'la base principale', dbr: 'la réplique de la base' };

  function level7(st, dead) {
    var alive = function (id) { return !dead[id]; };
    var entry = st.lb2 ? (alive('lb') || alive('lb2')) : alive('lb');
    var srv = ['A', 'B', 'C'].filter(alive);
    var dbMode;
    if (alive('db')) dbMode = 'ok';
    else if (st.replica && alive('dbr')) dbMode = st.failover === 'auto' ? 'failover' : 'readonly';
    else dbMode = 'none';
    var level = 'ok', reason = '';
    if (!entry) { level = 'down'; reason = 'Plus de point d’entrée'; }
    else if (!srv.length) { level = 'down'; reason = 'Plus aucun serveur'; }
    else if (dbMode === 'none') { level = 'down'; reason = 'Base indisponible'; }
    else if (dbMode === 'readonly') { level = 'degraded'; reason = 'Lecture seule'; }
    return { level: level, reason: reason, entry: entry, srv: srv, dbMode: dbMode };
  }

  NT.scenarios.push({
    id: 7, key: 'panne', chapter: 19,
    title: 'Une machine tombe',
    short: 'Disponibilité, redondance, résilience',
    objective: 'Comprendre ce qui est protégé par la redondance, et ce qui ne l’est pas.',
    observe: 'Tout fonctionne. Lance la simulation, puis clique sur un composant pour le faire tomber et relance.',
    freeHint: 'Clique sur un composant pour le faire tomber ou le relever.',
    initial: function () { return { lb2: false, replica: false, failover: 'auto', dead: {} }; },
    problem: function () { return { lb2: false, replica: false, failover: 'auto', dead: { db: true } }; },
    controls: [
      { key: 'lb2', type: 'toggle', label: 'Second load balancer' },
      { key: 'replica', type: 'toggle', label: 'Réplique de la base de données' },
      { key: 'failover', type: 'select', label: 'Bascule de la base', options: [['auto', 'Automatique'], ['manual', 'Manuelle']] }
    ],
    layout: function (st) {
      var nodes = [{ id: 'users', tag: 'Visiteurs', label: 'Les utilisateurs', x: 90, y: 230 }];
      var links = [];
      if (st.lb2) {
        nodes.push({ id: 'lb', tag: 'Load balancer', label: 'Répartiteur 1', x: 270, y: 140 }, { id: 'lb2', tag: 'Load balancer', label: 'Répartiteur 2', x: 270, y: 320 });
        links.push({ id: 'u-lb', a: 'users', b: 'lb' }, { id: 'u-lb2', a: 'users', b: 'lb2' });
      } else {
        nodes.push({ id: 'lb', tag: 'Load balancer', label: 'Répartiteur', x: 270, y: 230 });
        links.push({ id: 'u-lb', a: 'users', b: 'lb' });
      }
      [['A', 80], ['B', 230], ['C', 380]].forEach(function (p) {
        nodes.push({ id: p[0], tag: 'Serveur', label: 'Serveur ' + p[0], x: 490, y: p[1] });
        links.push({ id: 'lb-' + p[0], a: 'lb', b: p[0] });
        if (st.lb2) links.push({ id: 'lb2-' + p[0], a: 'lb2', b: p[0] });
        links.push({ id: p[0] + '-db', a: p[0], b: 'db' });
      });
      if (st.replica) {
        nodes.push({ id: 'db', tag: 'Données', label: 'Base principale', x: 760, y: 150 }, { id: 'dbr', tag: 'Données', label: 'Réplique', sub: 'autre zone', x: 760, y: 320 });
        links.push({ id: 'db-dbr', a: 'db', b: 'dbr', label: 'réplication', dashed: true });
      } else nodes.push({ id: 'db', tag: 'Données', label: 'Base de données', sub: 'un seul exemplaire', x: 760, y: 230 });
      return { nodes: nodes, links: links };
    },
    onNodeClick: function (st, id) {
      if (id === 'users') return null;
      st.dead = st.dead || {};
      st.dead[id] = !st.dead[id];
      return st;
    },
    sim: function (st) {
      var dead = st.dead || {};
      var r = level7(st, dead);
      var steps = [];
      var entryId = (!dead.lb) ? 'lb' : (st.lb2 && !dead.lb2 ? 'lb2' : 'lb');
      if (!r.entry) {
        steps.push(step('users', entryId, 'Aucune réponse du point d’entrée', 10, { stage: 'Entrée', flow: 'HTTP', status: 'fail', response: '503 Service indisponible', note: 'Le [[load balancer]] est tombé et rien ne peut le remplacer : c’est un [[point unique de panne]].' }));
      } else {
        steps.push(step('users', entryId, 'Les visiteurs atteignent le point d’entrée', 10, { stage: 'Entrée', flow: 'HTTP', note: st.lb2 ? 'Deux répartiteurs existent : si l’un tombe, l’autre prend le relais.' : 'Une seule porte d’entrée.' }));
        if (!r.srv.length) {
          steps.push(step(entryId, 'A', 'Aucun serveur ne répond', 10, { stage: 'Serveurs', flow: 'HTTP', status: 'fail', response: '503 Service indisponible', note: 'Toutes les copies sont tombées.' }));
        } else {
          var dn = ['A', 'B', 'C'].filter(function (k) { return dead[k]; });
          var srv = r.srv[0];
          steps.push(step(entryId, srv, 'Choix d’une copie vivante : ' + srv, 10, { stage: 'Répartition', flow: 'HTTP', note: dn.length ? 'Le [[contrôle de santé]] a retiré ' + dn.join(', ') + '. Les visiteurs ne voient pas la panne.' : 'Les trois copies sont en service.' }));
          if (r.dbMode === 'none') {
            steps.push(step(srv, 'db', 'La base est injoignable', 25, { stage: 'Données', flow: 'Base de données', status: 'fail', response: '503 Service indisponible', note: 'Un seul exemplaire de la base existait : [[point unique de panne]]. Redoubler les serveurs n’y change rien.' }));
          } else if (r.dbMode === 'failover') {
            steps.push(step(srv, 'dbr', 'Bascule automatique vers la réplique', 30000, { stage: 'Bascule', flow: 'Base de données', status: 'warn', note: 'La base principale est tombée. Une [[bascule|bascule]] automatique redirige vers la réplique. Elle prend quelques dizaines de secondes.' }));
            steps.push(step(srv, 'dbr', 'La réplique prend le relais', 25, { stage: 'Données', flow: 'Base de données', note: 'Le service continue, sans intervention humaine.' }));
          } else if (r.dbMode === 'readonly') {
            steps.push(step(srv, 'dbr', 'Lecture seule : écritures impossibles', 25, { stage: 'Données', flow: 'Base de données', status: 'warn', response: '200 OK · compteur figé', note: 'La réplique répond aux lectures, mais personne n’a encore basculé : le compteur ne s’incrémente plus.' }));
          } else {
            steps.push(step(srv, 'db', 'Lecture et écriture du compteur', 25, { stage: 'Données', flow: 'Base de données', note: dead.dbr ? 'La réplique est tombée : le service continue, mais la redondance est perdue.' : 'La base répond normalement.' }));
          }
          if (r.dbMode !== 'none') steps.push(step(srv, 'users', 'Réponse envoyée', 0, { stage: 'Réponse', flow: 'HTTP', status: r.level === 'degraded' ? 'warn' : 'ok', response: r.level === 'degraded' ? '200 OK · lecture seule' : '200 OK', note: 'La page repart vers le visiteur.' }));
        }
      }
      // Points uniques de panne de la configuration
      var spof = [];
      ['lb', 'lb2', 'A', 'B', 'C', 'db', 'dbr'].forEach(function (id) {
        if (id === 'lb2' && !st.lb2) return;
        if (id === 'dbr' && !st.replica) return;
        var d = {}; d[id] = true;
        if (level7(st, d).level === 'down') spof.push(NAMES7[id].replace(/^(le|la|l’) ?/, ''));
      });
      var nodes = {};
      Object.keys(dead).forEach(function (k) { if (dead[k]) nodes[k] = { state: 'down' }; });
      var deadCount = Object.keys(dead).filter(function (k) { return dead[k]; }).length;
      var capOk = r.srv.length;
      var statusTxt = r.level === 'down' ? 'Arrêté' : (r.level === 'degraded' ? 'Dégradé' : 'Disponible');
      return {
        steps: steps, nodes: nodes,
        metrics: [
          m('status', 'Service', statusTxt + (r.reason ? ' · ' + r.reason : ''), r.level === 'down' ? 'bad' : (r.level === 'degraded' ? 'warn' : 'good')),
          m('cap', 'Serveurs en service', capOk + ' sur 3', capOk === 3 ? 'good' : (capOk ? 'warn' : 'bad')),
          m('down', 'Composants tombés', deadCount, deadCount ? 'warn' : ''),
          m('spof', 'Points uniques de panne', spof.length ? spof.join(', ') : 'aucun', spof.length ? 'bad' : 'good')
        ],
        verdict: r.level === 'down'
          ? { level: 'down', text: 'Le service est arrêté : ' + r.reason.toLowerCase() + '.' }
          : (r.level === 'degraded' ? { level: 'degraded', text: 'Le service répond en lecture seule : la bascule manuelle n’a pas encore eu lieu.' }
            : { level: 'ok', text: deadCount ? 'Une panne ne se voit pas : la redondance absorbe ' + deadCount + ' composant(s) tombé(s).' : 'Tout fonctionne. Clique sur un composant pour le faire tomber.' })
      };
    },
    learn: [
      'Les machines tombent. On ne cherche pas **zéro panne** mais **zéro interruption visible**.',
      'La redondance protège **ce qui a été doublé**, et seulement cela. Il faut chercher les [[points uniques de panne|point unique de panne]].',
      'Une [[bascule|bascule]] doit être **automatique** et **testée** : un secours jamais essayé n’est pas une garantie.',
      'La réplication copie tout, **erreurs comprises**. Elle ne remplace pas une [[sauvegarde|sauvegarde]] datée.'
    ],
    why: [{ brick: 'Redondance', problem: 'continuer malgré une panne' }],
    decision: {
      problemText: 'La base de données vient de tomber. Elle n’existait qu’en un exemplaire : le service est arrêté, alors que les trois serveurs fonctionnent.',
      question: 'Que doubles-tu en priorité ?',
      choices: [
        { id: 'a', label: 'Une réplique de la base avec bascule automatique', verdict: 'good', apply: function (s) { s.replica = true; s.failover = 'auto'; return s; },
          feedback: 'C’est le vrai point unique de panne. Avec une réplique et une bascule automatique, le service continue après une courte interruption.' },
        { id: 'b', label: 'Une réplique de la base, avec bascule manuelle', verdict: 'partial', apply: function (s) { s.replica = true; s.failover = 'manual'; return s; },
          feedback: 'Mieux que rien : les lectures continuent. Mais tant que personne ne bascule, les écritures sont impossibles. La bascule doit être automatique.' },
        { id: 'c', label: 'Un second load balancer', verdict: 'partial', apply: function (s) { s.lb2 = true; return s; },
          feedback: 'C’est aussi un point unique de panne, mais pas celui qui vient de tomber. Le service reste arrêté.' },
        { id: 'd', label: 'Un quatrième serveur d’application', verdict: 'bad', apply: function (s) { return s; },
          feedback: 'Les serveurs ne sont pas le problème. La base n’existe qu’en un exemplaire : ajouter des copies d’application ne la remplace pas.' }
      ]
    },
    explain: {
      q: 'Pourquoi la redondance ne remplace-t-elle pas une sauvegarde ?',
      options: [
        { t: 'Une erreur ou une suppression est copiée aussi ; la sauvegarde garde des copies datées.', ok: true, fb: 'Exactement. La réplication copie tout en continu. Pour revenir en arrière, il faut des copies datées.' },
        { t: 'La redondance coûte plus cher qu’une sauvegarde.', ok: false, fb: 'Le coût n’est pas la différence : ce sont deux protections de nature différente.' },
        { t: 'Une sauvegarde est automatique, la redondance non.', ok: false, fb: 'Les deux peuvent être automatiques. La différence est de savoir si l’on peut revenir en arrière.' }
      ]
    }
  });

  /* =====================================================================
     SCÉNARIO 8 — Déploiement d’une nouvelle version (chapitre 22)
     ===================================================================== */
  var MIN = 60000;

  NT.scenarios.push({
    id: 8, key: 'deploiement', chapter: 22,
    title: 'Déploiement d’une nouvelle version',
    short: 'CODE, infrastructure et CI/CD',
    objective: 'Comprendre comment livrer une nouvelle version sans que les visiteurs en pâtissent.',
    observe: 'Une version v2 est prête. Elle contient un défaut qu’on ne connaît pas encore. Lance la simulation et surveille le taux d’erreurs.',
    freeHint: 'Change la stratégie, retire le défaut, règle le seuil d’alerte.',
    initial: function () { return { strategy: 'all', bad: true, thr: 2, auto: true }; },
    problem: function () { return { strategy: 'all', bad: true, thr: 2, auto: true }; },
    controls: [
      { key: 'strategy', type: 'select', label: 'Stratégie', options: [['all', 'Tout d’un coup'], ['progressive', 'Une copie à la fois']] },
      { key: 'bad', type: 'toggle', label: 'La nouvelle version a un défaut' },
      { key: 'thr', type: 'select', label: 'Seuil d’erreurs déclenchant le retour arrière', options: [[1, '1 %'], [2, '2 %'], [5, '5 %'], [50, '50 %']], num: true },
      { key: 'auto', type: 'toggle', label: 'Retour arrière automatique', help: 'Sinon, il faut attendre qu’une personne réagisse.' }
    ],
    layout: function () {
      return {
        nodes: [
          { id: 'dev', tag: 'Équipe', label: 'Nouvelle version', sub: 'v2', x: 80, y: 220 },
          { id: 'ci', tag: 'CI/CD', label: 'Chaîne automatique', sub: 'construit, teste, livre', x: 270, y: 220, w: 150 },
          { id: 'lb', tag: 'Load balancer', label: 'Répartiteur', x: 490, y: 220 },
          { id: 'A', tag: 'Copie', label: 'Copie A', sub: 'v1', x: 730, y: 90 },
          { id: 'B', tag: 'Copie', label: 'Copie B', sub: 'v1', x: 730, y: 220 },
          { id: 'C', tag: 'Copie', label: 'Copie C', sub: 'v1', x: 730, y: 350 },
          { id: 'mon', tag: 'Supervision', label: 'Mesures', sub: 'taux d’erreurs', x: 490, y: 380 }
        ],
        links: [
          { id: 'd-c', a: 'dev', b: 'ci' }, { id: 'c-l', a: 'ci', b: 'lb' },
          { id: 'l-A', a: 'lb', b: 'A' }, { id: 'l-B', a: 'lb', b: 'B' }, { id: 'l-C', a: 'lb', b: 'C' },
          { id: 'm-l', a: 'mon', b: 'lb', dashed: true }
        ]
      };
    },
    sim: function (st) {
      var thr = +st.thr, steps = [], bad = !!st.bad, copies = ['A', 'B', 'C'];
      var v2 = 0;
      function errNow() { return bad ? Math.round(v2 / 3 * 100) : 0; }
      var nodesStart = { A: { sub: 'v1', state: 'ok' }, B: { sub: 'v1', state: 'ok' }, C: { sub: 'v1', state: 'ok' } };
      steps.push(step('dev', 'ci', 'Une nouvelle version (v2) est poussée', 0, { stage: 'Code', flow: 'Livraison', err: 0, note: 'Le travail de l’équipe de développement déclenche la chaîne [[CI/CD]] : aucun copier-coller à la main.' }));
      steps.push(step('ci', 'ci', 'Construction et tests automatiques', MIN, { stage: 'Tests', flow: 'CI/CD', err: 0, note: 'La chaîne construit l’application et lance des tests. Elle réduit le risque, jamais à zéro.' }));
      var rolledAt = null, final = 'v2';
      function rollback(err, delay) {
        if (delay) steps.push(step('mon', 'mon', 'Personne n’est prévenu à temps', delay * MIN, { stage: 'Réaction', flow: 'Humain', status: 'fail', err: err, note: 'Sans retour arrière automatique, il faut qu’une personne remarque, comprenne et agisse. Pendant ce temps, les visiteurs subissent le défaut.' }));
        var upd = {};
        copies.forEach(function (k) { upd[k] = { sub: 'v1', state: 'ok' }; });
        steps.push(step('ci', 'lb', 'Retour arrière : les copies repassent en v1', MIN, { stage: 'Retour arrière', flow: 'CI/CD', via: [], err: err, apply: upd, note: 'Le [[retour arrière|retour arrière]] rétablit la version précédente, qui fonctionnait.' }));
        v2 = 0; final = 'v1';
      }
      if (st.strategy === 'all') {
        v2 = 3;
        var upd = {};
        copies.forEach(function (k) { upd[k] = { sub: 'v2', state: bad ? 'down' : 'ok' }; });
        steps.push(step('ci', 'lb', 'Déploiement sur A, B et C en même temps', MIN, { stage: 'Déploiement', flow: 'CI/CD', status: 'warn', err: 100, apply: upd, note: 'Tout redémarre ensemble : le service est interrompu environ une minute, même sans défaut.' }));
        var e = errNow();
        steps.push(step('mon', 'mon', 'Observation : ' + e + ' % d’erreurs', 2 * MIN, { stage: 'Supervision', flow: 'Mesures', status: e > 0 ? 'fail' : 'ok', err: e, note: 'La [[supervision|supervision]] mesure le taux d’erreurs en continu.' }));
        if (e > thr) {
          steps.push(step('mon', 'ci', 'ALERTE : erreurs au-dessus du seuil (' + thr + ' %)', 0, { stage: 'Alerte', flow: 'Mesures', status: 'fail', err: e, note: 'Le seuil est dépassé : l’alerte part.' }));
          rollback(e, st.auto ? 0 : 30);
        }
      } else {
        for (var i = 0; i < 3; i++) {
          var k = copies[i];
          v2++;
          var u = {}; u[k] = { sub: 'v2', state: bad ? 'warn' : 'ok' };
          steps.push(step('ci', k, 'La copie ' + k + ' passe en v2', MIN, { via: ['lb'], stage: 'Déploiement ' + (i + 1) + '/3', flow: 'CI/CD', err: 0, apply: u, note: 'Le répartiteur retire la copie pendant sa mise à jour : les visiteurs sont servis par les autres. Les autres copies restent en v1.' }));
          var e2 = errNow();
          steps.push(step('mon', 'mon', 'Observation : ' + e2 + ' % d’erreurs', 2 * MIN, { stage: 'Supervision', flow: 'Mesures', status: e2 > 0 ? 'warn' : 'ok', err: e2, note: e2 > 0 ? 'Une copie sur ' + (i + 1 === 1 ? 'trois' : 'trois') + ' sert la version défectueuse : ' + e2 + ' % des demandes échouent. La mise en ligne n’est pas terminée, on peut encore s’arrêter.' : 'Aucune erreur : on peut continuer.' }));
          if (e2 > thr) {
            steps.push(step('mon', 'ci', 'ALERTE : erreurs au-dessus du seuil (' + thr + ' %)', 0, { stage: 'Alerte', flow: 'Mesures', status: 'fail', err: e2, note: 'Le seuil est dépassé : on arrête le déploiement.' }));
            rollback(e2, st.auto ? 0 : 30);
            break;
          }
        }
      }
      var peak = 0, incident = 0, reqs = 0;
      steps.forEach(function (s) {
        var e = s.err || 0;
        if (e > peak) peak = e;
        if (e > 0) { incident += s.ms; reqs += e / 100 * (s.ms / MIN) * 1000; }
      });
      var nodes = {};
      var finalState = {};
      copies.forEach(function (k) { finalState[k] = { sub: final, state: 'ok' }; });
      var level = peak >= 50 ? 'down' : (peak > 0 ? 'degraded' : 'ok');
      return {
        steps: steps, start: nodesStart, nodes: finalState,
        metrics: [
          m('inc', 'Durée de l’incident', incident ? NT.fmtMs(incident) : 'aucun', incident ? (incident > 5 * MIN ? 'bad' : 'warn') : 'good'),
          m('peak', 'Pic d’erreurs', peak + ' %', peak >= 50 ? 'bad' : (peak > 0 ? 'warn' : 'good')),
          m('reqs', 'Requêtes en erreur (estim.)', NT.num(reqs), reqs > 5000 ? 'bad' : (reqs > 0 ? 'warn' : 'good')),
          m('final', 'Version finale', final === 'v1' ? 'v1 (retour arrière)' : 'v2 en ligne', final === 'v1' ? 'warn' : 'good')
        ],
        verdict: peak === 0
          ? { level: 'ok', text: 'Version v2 en ligne' + (st.strategy === 'progressive' ? ', sans aucune interruption.' : ', avec environ une minute d’interruption pendant le redémarrage.') }
          : { level: level, text: 'Défaut détecté : ' + peak + ' % d’erreurs au pic, ' + NT.fmtMs(incident) + ' d’incident, environ ' + NT.num(reqs) + ' requêtes touchées (à 1 000 par minute).' }
      };
    },
    learn: [
      'Déployer, ce n’est pas copier des fichiers : c’est passer d’une version **prête** à une version **utilisée**, de façon contrôlée et réversible.',
      'Mettre à jour **une copie à la fois** limite les dégâts : seule une partie du trafic voit la nouvelle version.',
      'La **supervision** donne le signal ; le **retour arrière** permet de reculer. Un déploiement se prépare avec son retour arrière.',
      'La chaîne CI/CD **réduit** le risque, jamais à zéro. L’infrastructure est le filet de sécurité.'
    ],
    why: [{ brick: 'Supervision', problem: 'observer ce que l’on ne voit pas' }, { brick: 'Déploiement progressif', problem: 'limiter l’effet d’une mauvaise version' }],
    decision: {
      problemText: 'v2 est déployée sur toutes les copies en même temps, et elle contient un défaut. Les visiteurs voient des erreurs.',
      question: 'Que fais-tu pour limiter les dégâts la prochaine fois ?',
      choices: [
        { id: 'a', label: 'Déployer une copie à la fois, en observant les erreurs', verdict: 'good', apply: function (s) { s.strategy = 'progressive'; return s; },
          feedback: 'Le défaut n’atteint qu’une copie sur trois avant que l’alerte ne déclenche le retour arrière. Les visiteurs sont presque épargnés.' },
        { id: 'b', label: 'Ajouter encore plus de tests avant la mise en ligne', verdict: 'partial', apply: function (s) { return s; },
          feedback: 'Utile, car ça réduit le risque. Mais aucun test ne garantit zéro défaut : si un défaut passe, tout est touché d’un coup.' },
        { id: 'c', label: 'Ne revenir en arrière que lorsque quelqu’un s’en rend compte', verdict: 'bad', apply: function (s) { s.auto = false; return s; },
          feedback: 'Le défaut reste en ligne pendant que personne n’agit. Plus la réaction est lente, plus l’incident est long.' }
      ]
    },
    explain: {
      q: 'Pourquoi le déploiement progressif limite-t-il les dégâts ?',
      options: [
        { t: 'Parce qu’il est plus rapide qu’un déploiement en une fois.', ok: false, fb: 'Il est souvent plus lent. Son intérêt est ailleurs.' },
        { t: 'Parce que la nouvelle version ne reçoit qu’une partie du trafic tant qu’elle n’est pas validée.', ok: true, fb: 'Exactement. On observe avant de continuer, et on peut revenir en arrière sans avoir tout exposé.' },
        { t: 'Parce qu’il supprime le besoin de supervision.', ok: false, fb: 'Au contraire : sans mesures, on ne sait pas quand s’arrêter.' }
      ]
    }
  });
})();
