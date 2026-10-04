/* NEXUS TRACE — scénarios 1 à 4 */
(function () {
  var root = typeof window !== 'undefined' ? window : globalThis;
  var NT = root.NT;

  function step(from, to, label, ms, o) {
    return Object.assign({ from: from, to: to, label: label, ms: ms || 0, status: 'ok' }, o || {});
  }
  function m(key, label, value, tone) { return { key: key, label: label, value: String(value), tone: tone || '' }; }
  function sum(steps, f) { return steps.reduce(function (a, s) { return a + (f(s) ? s.ms : 0); }, 0); }

  /* =====================================================================
     SCÉNARIO 1 — Ouvrir une page simple (chapitre 7)
     ===================================================================== */
  var STAGES1 = { 1: 'NOM', 2: 'ADRESSE', 3: 'CHEMIN', 4: 'CONNEXION', 5: 'DEMANDE', 6: 'TRAVAIL', 7: 'RÉPONSE', 8: 'AFFICHAGE' };
  function st1(n) { return n + ' · ' + STAGES1[n]; }

  NT.scenarios.push({
    id: 1, key: 'page', chapter: 7,
    title: 'Ouvrir une page simple',
    short: 'Le trajet d’une requête',
    objective: 'Comprendre le trajet général d’une requête, de l’adresse tapée à la page affichée.',
    observe: 'Lance la simulation et regarde la requête passer d’un composant à l’autre. Les temps sont simulés : ce sont des ordres de grandeur, pas des mesures.',
    initial: function () { return { https: false, revisit: false }; },
    controls: [
      { key: 'https', type: 'toggle', label: 'HTTPS (canal chiffré)', help: 'Ajoute la poignée de main TLS (chapitre 9).' },
      { key: 'revisit', type: 'toggle', label: 'Visite de retour', help: 'Le DNS, la connexion et les images sont déjà mémorisés.' }
    ],
    layout: function () {
      return {
        nodes: [
          { id: 'user', tag: 'Utilisateur', label: 'Toi', x: 100, y: 110 },
          { id: 'browser', tag: 'Client', label: 'Navigateur', x: 290, y: 110 },
          { id: 'net', tag: 'Réseau', label: 'Internet', sub: 'routeurs', x: 500, y: 110 },
          { id: 'server', tag: 'Serveur', label: 'Serveur web', sub: '203.0.113.7', x: 710, y: 110 },
          { id: 'dns', tag: 'DNS', label: 'Résolveur DNS', sub: 'l’annuaire', x: 290, y: 330 },
          { id: 'app', tag: 'Application', label: 'NEXUS DEMO', x: 710, y: 230 },
          { id: 'db', tag: 'Données', label: 'Base de données', sub: 'compteur de visites', x: 710, y: 350 }
        ],
        links: [
          { id: 'u-b', a: 'user', b: 'browser' }, { id: 'b-d', a: 'browser', b: 'dns' },
          { id: 'b-n', a: 'browser', b: 'net' }, { id: 'n-s', a: 'net', b: 'server' },
          { id: 's-a', a: 'server', b: 'app' }, { id: 'a-d', a: 'app', b: 'db' }
        ]
      };
    },
    sim: function (st) {
      var https = !!st.https, rv = !!st.revisit, steps = [];
      steps.push(step('user', 'browser', 'Tu tapes nexus-demo.example', 0, {
        stage: st1(1), flow: 'Saisie',
        note: 'Le navigateur reçoit un **nom**, pas une adresse. Rien n’est encore parti sur le réseau.'
      }));
      if (!rv) {
        steps.push(step('browser', 'dns', '« Quelle adresse pour nexus-demo.example ? »', 15, {
          stage: st1(2), flow: 'DNS',
          note: 'Les machines n’acheminent que des adresses. Le navigateur interroge donc le [[résolveur|résolveur]] [[DNS]].'
        }));
        steps.push(step('dns', 'browser', '« C’est 203.0.113.7 »', 15, {
          stage: st1(2), flow: 'DNS', response: '203.0.113.7',
          note: 'Le nom est devenu une destination : une [[adresse IP|IP]].'
        }));
      } else {
        steps.push(step('browser', 'browser', 'Adresse déjà en mémoire (cache DNS)', 1, {
          stage: st1(2), flow: 'Cache DNS', response: '203.0.113.7',
          note: 'À la deuxième visite, l’adresse est déjà connue : plus besoin d’interroger l’annuaire.'
        }));
      }
      steps.push(step('browser', 'server', rv ? 'Connexion TCP réutilisée' : 'Poignée de main TCP (3 temps)', rv ? 5 : 40, {
        via: ['net'], stage: st1(4), flow: 'TCP · port ' + (https ? 443 : 80),
        note: 'Les [[paquets|paquet]] traversent des [[routeurs|routeur]] (étape 3, le chemin), puis [[TCP]] établit la connexion en trois échanges. C’est un aller-retour complet avant la moindre demande.'
      }));
      if (https) {
        steps.push(step('browser', 'server', 'Poignée de main TLS : certificat vérifié', rv ? 20 : 45, {
          via: ['net'], stage: st1(4), flow: 'TLS · port 443',
          note: 'Avec [[HTTPS]], le serveur présente son certificat et un secret commun est établi. C’est de la sécurité, payée en [[latence]].'
        }));
      }
      steps.push(step('browser', 'server', 'GET /accueil', 20, {
        via: ['net'], stage: st1(5), flow: https ? 'HTTPS' : 'HTTP',
        note: 'Le navigateur formule sa demande dans le langage du web : [[HTTP]]. Méthode GET, chemin /accueil.'
      }));
      steps.push(step('server', 'app', 'Le serveur web passe la demande à l’application', 10, {
        stage: st1(6), flow: 'Interne',
        note: 'Une page n’est pas un fichier qu’on envoie : elle est **construite** à chaque visite.'
      }));
      steps.push(step('app', 'db', 'Lecture et mise à jour du compteur', 30, {
        stage: st1(6), flow: 'Base de données',
        note: 'L’[[application]] lit puis incrémente le compteur dans la [[base de données|base de données]].'
      }));
      steps.push(step('app', 'server', 'L’application construit la page', 20, {
        stage: st1(6), flow: 'Interne',
        note: 'La page contient le nombre de visiteurs. Elle est prête à repartir.'
      }));
      steps.push(step('server', 'browser', '200 OK · la page repart en paquets', 20, {
        via: ['net'], stage: st1(7), flow: https ? 'HTTPS' : 'HTTP', response: '200 OK · text/html',
        note: 'La réponse repart découpée en paquets, souvent avant d’autres demandes pour les images et les styles.'
      }));
      steps.push(step('browser', 'browser', 'Le navigateur assemble et affiche la page', rv ? 20 : 50, {
        stage: st1(8), flow: 'Affichage',
        note: rv ? 'Les images et les styles sont déjà gardés par le navigateur : l’affichage est plus court.' : 'Le navigateur assemble les morceaux et dessine la page.'
      }));

      var total = sum(steps, function () { return true; });
      var byStage = {};
      steps.forEach(function (s) { byStage[s.stage] = (byStage[s.stage] || 0) + s.ms; });
      var top = Object.keys(byStage).sort(function (a, b) { return byStage[b] - byStage[a]; })[0];
      var srv = byStage[st1(6)] || 0;
      return {
        steps: steps, nodes: {},
        metrics: [
          m('total', 'Temps total', NT.fmtMs(total), total <= 150 ? 'good' : ''),
          m('top', 'Étape la plus longue', top.split(' · ')[1] + ' · ' + NT.fmtMs(byStage[top])),
          m('srv', 'Part du serveur', Math.round(srv / total * 100) + ' %')
        ],
        verdict: { level: 'ok', text: 'Page affichée en ' + NT.fmtMs(total) + '. Ce que tu ressens comme « instantané » est la somme de ' + steps.filter(function (s) { return s.ms > 0; }).length + ' attentes courtes.' }
      };
    },
    learn: [
      'Une visite est une **conversation courte et ordonnée** : nom, adresse, connexion, demande, travail du serveur, réponse, affichage.',
      'Chaque étape a un **coût en temps**. La seconde que tu ressens est une pile d’attentes courtes.',
      'Le serveur ne « possède » pas la page : il la **construit** à chaque visite, avec une application et une base de données.',
      'À la deuxième visite, des **mémoires** (DNS, connexion, fichiers) raccourcissent plusieurs étapes.'
    ],
    why: [{ brick: 'Serveur', problem: 'servir : recevoir, calculer, répondre' }],
    decision: {
      problemText: 'Un visiteur revient sur NEXUS DEMO. Le serveur n’a pas changé.',
      question: 'Comment sa page peut-elle s’afficher plus vite ?',
      choices: [
        { id: 'a', label: 'Laisser les mémoires faire leur travail (DNS, connexion, fichiers)', verdict: 'good', apply: function (s) { s.revisit = true; return s; },
          feedback: 'Exact. L’adresse, la connexion et les fichiers sont déjà gardés : plusieurs étapes raccourcissent sans rien changer au serveur.' },
        { id: 'b', label: 'Passer en HTTPS pour accélérer', verdict: 'bad', apply: function (s) { s.https = true; return s; },
          feedback: 'HTTPS protège l’échange et prouve l’identité du site, mais il ajoute une poignée de main. Utile pour la confiance, pas pour la vitesse.' },
        { id: 'c', label: 'Supprimer l’étape DNS', verdict: 'bad', apply: function (s) { return s; },
          feedback: 'Impossible : sans adresse IP, aucun paquet ne sait où aller. On peut seulement **mémoriser** l’adresse, ce que fait le cache.' }
      ]
    },
    explain: {
      q: 'Pourquoi la deuxième visite est-elle plus rapide ?',
      options: [
        { t: 'Le serveur est devenu plus puissant entre les deux visites.', ok: false, fb: 'Rien n’a changé côté serveur. Ce sont les mémoires côté visiteur qui servent.' },
        { t: 'Plusieurs résultats sont déjà mémorisés : adresse, connexion, fichiers.', ok: true, fb: 'Exactement. Éviter de refaire un voyage est la manière la plus rapide de gagner du temps.' },
        { t: 'Le chemin des paquets est devenu plus court.', ok: false, fb: 'Le chemin n’est pas en cause : ce sont des étapes qui disparaissent ou raccourcissent.' }
      ]
    }
  });

  /* =====================================================================
     SCÉNARIO 2 — Trouver un domaine avec DNS (chapitre 5)
     ===================================================================== */
  var IP_OLD = '203.0.113.7', IP_NEW = '198.51.100.20';

  NT.scenarios.push({
    id: 2, key: 'dns', chapter: 5,
    title: 'Trouver un domaine avec DNS',
    short: 'Nom, résolution, destination',
    objective: 'Comprendre comment un nom devient une destination, et pourquoi un changement d’adresse n’est pas instantané.',
    observe: 'Le résolveur n’a rien en mémoire. Lance la simulation et suis la question de la racine jusqu’au serveur qui fait autorité.',
    initial: function () { return { cached: false, changed: false, ttl: 3600, since: 10 }; },
    problem: function () { return { cached: true, changed: true, ttl: 86400, since: 10 }; },
    controls: [
      { key: 'cached', type: 'toggle', label: 'Le résolveur a déjà la réponse en mémoire', help: 'Cache DNS' },
      { key: 'changed', type: 'toggle', label: 'NEXUS DEMO a changé d’adresse', help: 'Nouvelle adresse : ' + IP_NEW },
      { key: 'ttl', type: 'select', label: 'Durée de validité (TTL)', options: [[60, '1 minute'], [300, '5 minutes'], [3600, '1 heure'], [86400, '24 heures']], num: true },
      { key: 'since', type: 'range', label: 'Minutes écoulées depuis le changement', min: 0, max: 1500, step: 5, unit: ' min' }
    ],
    layout: function () {
      return {
        nodes: [
          { id: 'browser', tag: 'Client', label: 'Navigateur', x: 100, y: 220 },
          { id: 'resolver', tag: 'Résolveur', label: 'Résolveur DNS', sub: 'mémoire (cache)', x: 340, y: 220 },
          { id: 'root', tag: 'Racine', label: 'Serveurs racine', x: 620, y: 80 },
          { id: 'tld', tag: 'Extension', label: 'Serveur de .example', x: 620, y: 220 },
          { id: 'auth', tag: 'Autorité', label: 'nexus-demo.example', sub: 'enregistrement A', x: 620, y: 360 }
        ],
        links: [
          { id: 'b-r', a: 'browser', b: 'resolver' }, { id: 'r-root', a: 'resolver', b: 'root' },
          { id: 'r-tld', a: 'resolver', b: 'tld' }, { id: 'r-auth', a: 'resolver', b: 'auth' }
        ]
      };
    },
    sim: function (st) {
      var ttl = +st.ttl, since = +st.since;
      var expired = st.changed && since * 60 >= ttl;
      var hit = !!st.cached && !expired;
      var current = st.changed ? IP_NEW : IP_OLD;
      var answered = hit ? IP_OLD : current;
      var stale = hit && st.changed;
      var steps = [];
      if (hit) {
        steps.push(step('browser', 'resolver', '« nexus-demo.example ? »', 5, { stage: 'Question', flow: 'DNS', note: 'Le navigateur interroge son [[résolveur|résolveur]].' }));
        steps.push(step('resolver', 'browser', '« ' + answered + ' » (depuis la mémoire)', 2, {
          stage: 'Réponse', flow: 'DNS · cache', response: answered, status: stale ? 'warn' : 'ok',
          note: stale
            ? 'Le résolveur répond sans rien demander : il a **mémorisé** l’ancienne adresse et son [[TTL]] n’est pas écoulé. Le visiteur arrive sur l’ancien serveur.'
            : 'Réponse immédiate depuis la mémoire : c’est le rôle du [[cache]] DNS.'
        }));
      } else {
        steps.push(step('browser', 'resolver', '« Quelle adresse pour nexus-demo.example ? »', 5, { stage: 'Question', flow: 'DNS', note: 'Le navigateur interroge son [[résolveur|résolveur]]. Il n’a rien en mémoire' + (expired ? ' : la réponse mémorisée a expiré.' : '.') }));
        steps.push(step('resolver', 'root', 'Racine : « pour .example, demande à ces serveurs »', 20, { stage: 'Racine', flow: 'DNS', note: 'Aucune machine ne connaît tout. La racine sait seulement vers qui se tourner pour chaque extension.' }));
        steps.push(step('resolver', 'tld', '.example : « pour nexus-demo, demande à ce serveur »', 20, { stage: 'Extension', flow: 'DNS', note: 'On descend la hiérarchie, du plus général au plus précis.' }));
        steps.push(step('resolver', 'auth', 'Autorité : « nexus-demo.example = ' + current + ' »', 25, { stage: 'Autorité', flow: 'DNS · enregistrement A', response: 'A ' + current + ' · TTL ' + ttl + ' s', note: 'Le serveur qui fait autorité détient la réponse officielle. Il précise aussi combien de temps elle peut être gardée : le TTL.' }));
        steps.push(step('resolver', 'browser', 'Réponse : ' + current + ' (mémorisée ' + ttl + ' s)', 5, { stage: 'Réponse', flow: 'DNS', response: current, note: 'Le résolveur garde la réponse en mémoire pour la durée du TTL.' }));
      }
      var total = sum(steps, function () { return true; });
      var remaining = stale ? Math.max(0, ttl - since * 60) : 0;
      return {
        steps: steps,
        nodes: stale ? { resolver: { state: 'warn', sub: 'réponse périmée' }, auth: { sub: 'nouvelle adresse ' + IP_NEW } } : {},
        metrics: [
          m('time', 'Temps de résolution', NT.fmtMs(total), hit ? 'good' : ''),
          m('ip', 'Adresse reçue', answered),
          m('fresh', 'Fraîcheur', stale ? 'Périmée : ancien serveur' : 'À jour', stale ? 'bad' : 'good'),
          m('left', 'Mémoire valable encore', stale ? '≈ ' + NT.fmtMs(remaining * 1000) : '—', stale ? 'warn' : '')
        ],
        verdict: stale
          ? { level: 'degraded', text: 'Des visiteurs arrivent encore sur l’ancien serveur pendant environ ' + NT.fmtMs(remaining * 1000) + '.' }
          : { level: 'ok', text: hit ? 'Réponse immédiate depuis la mémoire.' : 'Le nom est devenu la destination ' + answered + ' en ' + NT.fmtMs(total) + '.' }
      };
    },
    learn: [
      'Le DNS est un **annuaire réparti et hiérarchique** : racine, extension, serveur faisant autorité.',
      'Le résolveur **mémorise** les réponses pendant la durée du TTL, pour ne pas tout redemander.',
      'Un changement d’enregistrement **n’est pas visible partout tout de suite** : les mémoires déjà remplies l’ignorent jusqu’à expiration.',
      'Le DNS donne une **adresse**. Il ne livre pas la page.'
    ],
    why: [{ brick: 'DNS', problem: 'identifier une destination à partir d’un nom' }],
    decision: {
      problemText: 'NEXUS DEMO a déménagé il y a 10 minutes vers un nouveau serveur, mais l’ancienne adresse a un TTL de 24 heures. Des visiteurs arrivent encore sur l’ancien.',
      question: 'Qu’aurait-il fallu faire pour limiter ce retard ?',
      choices: [
        { id: 'a', label: 'Baisser le TTL (par exemple 60 secondes) quelques jours avant le déménagement', verdict: 'good', apply: function (s) { s.ttl = 60; return s; },
          feedback: 'Oui. Avec un TTL court déjà en place, les mémoires expirent vite et la nouvelle adresse est vue en quelques minutes.' },
        { id: 'b', label: 'Vider le cache de chaque visiteur', verdict: 'bad', apply: function (s) { return s; },
          feedback: 'Tu ne contrôles ni le navigateur ni le résolveur des visiteurs. Le seul levier est la durée annoncée à l’avance : le TTL.' },
        { id: 'c', label: 'Acheter un serveur plus puissant', verdict: 'bad', apply: function (s) { return s; },
          feedback: 'Le problème n’est pas la capacité du serveur mais la mémoire des annuaires. Un meilleur serveur n’y change rien.' },
        { id: 'd', label: 'Attendre un jour entier', verdict: 'partial', apply: function (s) { s.since = 1500; return s; },
          feedback: 'Ça finit par marcher : après 24 heures, tout a expiré. Mais pendant ce temps des visiteurs sont mal dirigés. Mieux vaut le prévoir.' }
      ]
    },
    explain: {
      q: 'Pourquoi baisse-t-on souvent le TTL avant de déplacer un service ?',
      options: [
        { t: 'Pour que le serveur de destination démarre plus vite.', ok: false, fb: 'Le TTL ne concerne que la durée de mémorisation des réponses DNS.' },
        { t: 'Pour que les mémoires expirent vite et que le changement soit vu plus tôt.', ok: true, fb: 'Exactement : un TTL court limite le temps pendant lequel l’ancienne adresse circule.' },
        { t: 'Pour supprimer le DNS de la chaîne.', ok: false, fb: 'Le DNS reste nécessaire : on réduit seulement la durée de la mémoire.' }
      ]
    }
  });

  /* =====================================================================
     SCÉNARIO 3 — Plusieurs routeurs (chapitre 6)
     ===================================================================== */
  var R_LINKS = [
    { id: 'you-R1', a: 'you', b: 'R1', ms: 1, fixed: true },
    { id: 'R1-R2', a: 'R1', b: 'R2', ms: 8 },
    { id: 'R2-R3', a: 'R2', b: 'R3', ms: 10 },
    { id: 'R3-R5', a: 'R3', b: 'R5', ms: 12 },
    { id: 'R1-R4', a: 'R1', b: 'R4', ms: 15 },
    { id: 'R4-R5', a: 'R4', b: 'R5', ms: 40 },
    { id: 'R5-srv', a: 'R5', b: 'srv', ms: 2, fixed: true }
  ];
  var R_EXTRA = { id: 'R2-R5', a: 'R2', b: 'R5', ms: 14, dashed: true };

  NT.scenarios.push({
    id: 3, key: 'routage', chapter: 6,
    title: 'Plusieurs routeurs',
    short: 'Le routage, saut par saut',
    objective: 'Comprendre qu’un trajet est une suite de décisions locales, et ce qui se passe quand un lien tombe.',
    observe: 'Le paquet part de ton appareil. Chaque routeur ne connaît que le prochain saut. Lance la simulation et lis le chemin choisi.',
    freeHint: 'Clique sur un lien entre routeurs pour le couper ou le rétablir.',
    initial: function () { return { down: {}, extra: false }; },
    problem: function () { return { down: { 'R3-R5': true, 'R4-R5': true }, extra: false }; },
    controls: [{ key: 'extra', type: 'toggle', label: 'Lien de secours R2–R5', help: 'Un chemin supplémentaire vers R5.' }],
    layout: function (st) {
      var links = R_LINKS.concat(st.extra ? [R_EXTRA] : []).map(function (l) {
        return { id: l.id, a: l.a, b: l.b, label: l.ms + ' ms', dashed: l.dashed, clickable: !l.fixed };
      });
      var pos = { you: [80, 220], R1: [240, 220], R2: [410, 90], R3: [590, 90], R4: [430, 350], R5: [710, 220], srv: [850, 220] };
      var nodes = Object.keys(pos).map(function (id) {
        var isR = /^R\d$/.test(id);
        return { id: id, tag: isR ? 'Routeur' : (id === 'you' ? 'Départ' : 'Arrivée'), label: isR ? id : (id === 'you' ? 'Ton appareil' : 'Serveur'), x: pos[id][0], y: pos[id][1], w: isR ? 96 : 112, h: 56 };
      });
      return { nodes: nodes, links: links };
    },
    onLinkClick: function (st, id) {
      var l = R_LINKS.concat([R_EXTRA]).filter(function (x) { return x.id === id; })[0];
      if (!l || l.fixed) return null;
      st.down = st.down || {};
      st.down[id] = !st.down[id];
      return st;
    },
    sim: function (st) {
      var all = R_LINKS.concat(st.extra ? [R_EXTRA] : []);
      var up = all.filter(function (l) { return !(st.down && st.down[l.id]); });
      var p = NT.shortestPath(up, 'you', 'srv');
      var linkStates = {};
      all.forEach(function (l) { if (st.down && st.down[l.id]) linkStates[l.id] = 'down'; });
      var steps = [];
      if (p.ok) {
        p.hops.forEach(function (h, i) {
          var routerTo = /^R\d$/.test(h.b);
          steps.push(step(h.a, h.b,
            h.a === 'you' ? 'Le paquet part vers R1' : (routerTo ? 'Saut : ' + h.a + ' vers ' + h.b : h.a + ' livre le paquet au serveur'),
            h.ms, {
              stage: 'Saut ' + (i + 1) + '/' + p.hops.length, flow: 'IP · paquet',
              response: i === p.hops.length - 1 ? 'Paquet livré' : '',
              note: h.a === 'you'
                ? 'Ton appareil envoie le paquet à sa passerelle par défaut, le premier routeur.'
                : (routerTo
                  ? h.a + ' consulte sa [[table de routage|routeur]] : pour atteindre le serveur, le prochain saut est ' + h.b + '. Il ne connaît pas le trajet complet.'
                  : 'Le dernier routeur remet le paquet directement au serveur.')
            }));
          linkStates[h.id] = linkStates[h.id] || 'path';
        });
      } else {
        steps.push(step('you', 'R1', 'Le paquet part vers R1', 1, { stage: 'Saut 1', flow: 'IP · paquet', note: 'Ton appareil envoie le paquet à sa passerelle.' }));
        steps.push(step('R1', 'R1', 'Aucune route vers le serveur', 0, {
          stage: 'Impasse', flow: 'IP · paquet', status: 'fail', response: 'Destination injoignable',
          note: 'Plus aucun chemin n’existe entre R1 et R5. Les routeurs ne peuvent pas inventer une route : le paquet est abandonné.'
        }));
      }
      var hopsN = p.ok ? p.nodes.filter(function (n) { return /^R\d$/.test(n); }).length : 0;
      var nodes = {};
      if (p.ok) p.nodes.forEach(function (n) { nodes[n] = { state: 'ok' }; });
      return {
        steps: steps, nodes: nodes, links: linkStates,
        metrics: p.ok ? [
          m('path', 'Chemin choisi', p.nodes.filter(function (n) { return /^R\d$/.test(n); }).join(' → ')),
          m('hops', 'Routeurs traversés', hopsN),
          m('lat', 'Latence aller', NT.fmtMs(p.ms), p.ms <= 40 ? 'good' : 'warn'),
          m('status', 'Statut', 'Livré', 'good')
        ] : [
          m('path', 'Chemin choisi', 'aucun', 'bad'),
          m('hops', 'Routeurs traversés', 0),
          m('lat', 'Latence aller', '—'),
          m('status', 'Statut', 'Injoignable', 'bad')
        ],
        verdict: p.ok
          ? { level: 'ok', text: 'Chemin le plus rapide : ' + hopsN + ' routeurs, ' + NT.fmtMs(p.ms) + '. Le chemin avec le moins de sauts n’est pas forcément le plus rapide.' }
          : { level: 'down', text: 'Le serveur est injoignable : aucun chemin ne traverse les liens restants.' }
      };
    },
    learn: [
      '**Personne ne planifie le trajet entier.** Chaque routeur choisit seulement le prochain saut.',
      'Le chemin peut **changer d’un envoi à l’autre** quand un lien est saturé ou coupé.',
      'Un chemin avec moins de sauts n’est pas forcément le plus rapide : ce sont les **latences cumulées** qui comptent.',
      'S’il n’existe **aucun chemin**, aucun réglage de débit ne le crée : il faut une route.'
    ],
    why: [{ brick: 'Routeur', problem: 'acheminer un paquet vers sa destination' }],
    decision: {
      problemText: 'Les liens R3–R5 et R4–R5 sont coupés. Plus aucun chemin n’atteint le serveur.',
      question: 'Que fais-tu ?',
      choices: [
        { id: 'a', label: 'Ajouter un lien de secours R2–R5 pour offrir un autre chemin', verdict: 'good', apply: function (s) { s.extra = true; return s; },
          feedback: 'Un chemin de plus rend le réseau tolérant à la perte d’un lien : les routeurs trouvent la nouvelle route d’eux-mêmes.' },
        { id: 'b', label: 'Réparer le lien R3–R5', verdict: 'partial', apply: function (s) { s.down['R3-R5'] = false; return s; },
          feedback: 'Ça rétablit le service, mais il n’existe de nouveau qu’un seul chemin. La prochaine coupure aura le même effet.' },
        { id: 'c', label: 'Augmenter le débit du lien R1–R2', verdict: 'bad', apply: function (s) { return s; },
          feedback: 'Le débit est la largeur d’un tuyau. Quand aucun chemin ne mène au serveur, élargir un tuyau n’en crée pas un.' },
        { id: 'd', label: 'Changer l’adresse du serveur dans le DNS', verdict: 'bad', apply: function (s) { return s; },
          feedback: 'Le DNS donne une adresse, il ne crée pas de route. Le serveur resterait injoignable.' }
      ]
    },
    explain: {
      q: 'Qui décide du chemin complet d’un paquet entre ton appareil et le serveur ?',
      options: [
        { t: 'Un ordinateur central qui planifie chaque trajet.', ok: false, fb: 'Il n’existe pas de chef d’orchestre : Internet tient sans planification globale.' },
        { t: 'Personne seul : chaque routeur choisit le prochain saut.', ok: true, fb: 'Exactement. Le chemin est la somme de choix locaux.' },
        { t: 'Le navigateur, qui choisit les routeurs à traverser.', ok: false, fb: 'Le navigateur ne connaît pas les routeurs du chemin.' }
      ]
    }
  });

  /* =====================================================================
     SCÉNARIO 4 — Serveur unique (chapitre 15)
     ===================================================================== */
  function calc4(st) {
    var servers = +st.servers, power = +st.power, load = +st.load;
    var appF = st.cache ? 0.3 : 1, dbF = st.cache ? 0.7 : 1;
    var capApp = servers * 800 * power / appF;
    var capDb = 5000 / dbF;
    var cap = Math.min(capApp, capDb);
    var u = load / cap;
    var bott = capApp <= capDb ? 'l’application' : 'la base de données';
    var rt, err;
    if (u >= 1) { rt = 5000; err = (1 - 1 / u) * 100; }
    else { rt = 100 + 20 / (1 - Math.min(u, 0.98)); err = 0; }
    return { cap: cap, u: u, bott: bott, rt: rt, err: err, uApp: load * appF / (servers * 800 * power), uDb: load * dbF / 5000 };
  }
  function nstate(u) { return u >= 1 ? 'down' : (u >= 0.7 ? 'warn' : 'ok'); }

  NT.scenarios.push({
    id: 4, key: 'serveur-unique', chapter: 15,
    title: 'Serveur unique',
    short: 'Les limites d’une architecture simple',
    objective: 'Comprendre pourquoi un serveur finit par saturer, et ce que chaque réponse change vraiment.',
    observe: 'NEXUS DEMO tourne sur un seul serveur, avec peu de visiteurs. Lance la simulation, puis augmente la charge en mode libre pour trouver la limite.',
    initial: function () { return { load: 200, servers: 1, power: 1, cache: false }; },
    problem: function () { return { load: 1500, servers: 1, power: 1, cache: false }; },
    controls: [
      { key: 'load', type: 'range', label: 'Visiteurs simultanés', min: 50, max: 8000, step: 50 },
      { key: 'servers', type: 'select', label: 'Nombre de serveurs', options: [[1, '1'], [2, '2'], [3, '3']], num: true },
      { key: 'power', type: 'select', label: 'Taille du serveur', options: [[1, '×1 (petit)'], [2, '×2'], [6, '×6 (très gros)']], num: true },
      { key: 'cache', type: 'toggle', label: 'Cache pour les contenus identiques', help: 'Évite de refaire le même travail.' }
    ],
    layout: function (st) {
      var n = +st.servers, nodes = [], links = [];
      nodes.push({ id: 'users', tag: 'Visiteurs', label: NT.num(st.load) + ' en même temps', x: 100, y: 230, w: 150 });
      if (st.cache) {
        nodes.push({ id: 'cache', tag: 'Cache', label: 'Cache', sub: 'contenus identiques', x: 330, y: 70 });
        links.push({ id: 'u-c', a: 'users', b: 'cache' });
      }
      var names = ['A', 'B', 'C'].slice(0, n), ys = n === 1 ? [230] : (n === 2 ? [140, 320] : [90, 230, 370]);
      if (n > 1) {
        nodes.push({ id: 'lb', tag: 'Load balancer', label: 'Répartiteur', sub: 'point d’entrée', x: 330, y: 230 });
        links.push({ id: 'u-lb', a: 'users', b: 'lb' });
      }
      names.forEach(function (nm, i) {
        nodes.push({ id: 's' + nm, tag: 'Serveur', label: 'Serveur ' + nm, sub: 'taille ×' + st.power, x: n === 1 ? 480 : 560, y: ys[i] });
        links.push({ id: n === 1 ? 'u-s' : 'lb-s' + nm, a: n === 1 ? 'users' : 'lb', b: 's' + nm });
        links.push({ id: 's' + nm + '-db', a: 's' + nm, b: 'db' });
        if (st.cache && i === 0) links.push({ id: 'c-s', a: 'cache', b: 's' + nm, dashed: true });
      });
      nodes.push({ id: 'db', tag: 'Données', label: 'Base de données', sub: 'compteur', x: 800, y: 230 });
      return { nodes: nodes, links: links };
    },
    sim: function (st) {
      var c = calc4(st), n = +st.servers, steps = [], first = 'sA';
      var netTarget = n > 1 ? 'lb' : first;
      if (st.cache) {
        steps.push(step('users', 'cache', 'Le cache répond aux contenus identiques', 5, { stage: 'Cache', flow: 'Cache', note: 'Une partie des demandes est servie sans solliciter l’application : le travail n’est pas refait.' }));
      }
      steps.push(step('users', netTarget, NT.num(st.load) + ' visiteurs demandent la page', n > 1 ? 20 : 40, { stage: 'Arrivée', flow: 'HTTP', note: n > 1 ? 'Tous passent par une seule adresse : le [[load balancer]] choisit la copie.' : 'Toutes les demandes arrivent sur une seule machine.' }));
      if (n > 1) steps.push(step('lb', first, 'Le répartiteur choisit un serveur', 20, { stage: 'Répartition', flow: 'HTTP', note: 'Le répartiteur envoie chaque demande vers une copie.' }));
      var rest = Math.max(0, c.rt - 40);
      var appMs = Math.round(rest * (c.bott === 'l’application' ? 0.6 : 0.35));
      var dbMs = Math.round(rest - appMs);
      var late = c.u >= 1 ? 'fail' : (c.u >= 0.7 ? 'warn' : 'ok');
      steps.push(step(first, first, 'L’application traite les demandes', appMs, {
        stage: 'Traitement', flow: 'Application', status: late,
        note: 'Charge : ' + Math.round(c.u * 100) + ' % de la capacité effective (' + NT.num(c.cap) + ' visiteurs). Le [[goulot|goulot]] est ' + c.bott + '.'
      }));
      steps.push(step(first, 'db', 'La base lit et écrit le compteur', dbMs, { stage: 'Données', flow: 'Base de données', status: nstate(c.uDb) === 'down' ? 'fail' : (nstate(c.uDb) === 'warn' ? 'warn' : 'ok'), note: 'Chaque visite incrémente le compteur dans la [[base de données|base de données]].' }));
      steps.push(step(first, 'users', c.u >= 1 ? 'Réponse : ' + Math.round(c.err) + ' % d’erreurs' : 'Réponse envoyée', 0, {
        stage: 'Réponse', flow: 'HTTP', status: late,
        response: c.u >= 1 ? 'Délai dépassé · ' + Math.round(c.err) + ' % des demandes échouent' : '200 OK',
        note: c.u >= 1 ? 'Au-delà de la capacité, les demandes s’accumulent puis échouent : c’est la [[saturation|saturation]].' : 'La réponse repart vers les visiteurs.'
      }));
      var nodes = {};
      ['A', 'B', 'C'].slice(0, n).forEach(function (nm) { nodes['s' + nm] = { state: nstate(c.uApp) }; });
      nodes.db = { state: nstate(c.uDb) };
      var tone = c.u >= 1 ? 'bad' : (c.u >= 0.7 ? 'warn' : 'good');
      return {
        steps: steps, nodes: nodes,
        metrics: [
          m('cap', 'Capacité effective', NT.num(c.cap) + ' visiteurs'),
          m('use', 'Utilisation', Math.round(c.u * 100) + ' %', tone),
          m('rt', 'Temps de réponse', c.u >= 1 ? '> 5 s' : NT.fmtMs(c.rt), tone),
          m('err', 'Demandes en échec', Math.round(c.err) + ' %', c.err > 0 ? 'bad' : 'good'),
          m('bott', 'Goulot', c.bott)
        ],
        verdict: c.u >= 1
          ? { level: 'down', text: 'Saturation : ' + Math.round(c.err) + ' % des demandes échouent. Le goulot est ' + c.bott + '.' }
          : (c.u >= 0.7 ? { level: 'degraded', text: 'Ça tient, mais avec peu de marge (' + Math.round(c.u * 100) + ' %) : les temps de réponse grimpent.' }
            : { level: 'ok', text: 'Le service répond bien (' + Math.round(c.u * 100) + ' % de la capacité).' })
      };
    },
    learn: [
      'Toute machine a des **limites** : processeur, mémoire, disque, connexions, bande passante.',
      'Près de la limite, la **lenteur arrive avant la panne** : les demandes s’accumulent.',
      'Il faut trouver le **goulot** avant d’agir. Un plus gros processeur ne sert à rien si c’est la base qui sature.',
      'Plus gros (vertical) a un plafond. Plus nombreux (horizontal) n’en a pas, mais demande de la coordination.'
    ],
    why: [{ brick: 'Cache', problem: 'éviter de refaire le même travail' }, { brick: 'Serveurs multiples', problem: 'dépasser la limite d’une seule machine' }],
    decision: {
      problemText: 'Le serveur A est saturé : 1 500 visiteurs en même temps, pour une capacité d’environ 800.',
      question: 'Que peux-tu faire ?',
      choices: [
        { id: 'a', label: 'Ajouter un second serveur derrière un load balancer', verdict: 'partial', apply: function (s) { s.servers = 2; return s; },
          feedback: 'Ça tient, mais avec peu de marge. Pas de plafond théorique, mais il faut aussi une porte d’entrée et une base partagée.' },
        { id: 'b', label: 'Remplacer le serveur par un plus gros (×2)', verdict: 'partial', apply: function (s) { s.power = 2; return s; },
          feedback: 'Même gain que le second serveur, sans la coordination. Mais il existe un plafond, et chaque palier coûte de plus en plus cher.' },
        { id: 'c', label: 'Ajouter un cache pour les contenus identiques', verdict: 'good', apply: function (s) { s.cache = true; return s; },
          feedback: 'Le plus efficace ici : on évite de refaire le travail. À condition de ne jamais mettre en cache de l’information personnelle.' },
        { id: 'd', label: 'Déplacer l’enregistrement DNS', verdict: 'bad', apply: function (s) { return s; },
          feedback: 'Le DNS identifie une destination. Il ne crée aucune capacité de calcul, la saturation reste la même.' }
      ]
    },
    explain: {
      q: 'Pages très lentes, processeur à 98 %, base de données à 20 %. Où se trouve le goulot ?',
      options: [
        { t: 'Dans la base de données.', ok: false, fb: 'La base est loin de sa limite (20 %). L’améliorer ne changerait rien.' },
        { t: 'Dans l’application : le processeur est saturé.', ok: true, fb: 'Exactement. Il faut agir là où ça sature : plus de copies, une machine plus grosse ou moins de travail à refaire.' },
        { t: 'Dans le DNS.', ok: false, fb: 'Le DNS ne participe pas au traitement de chaque requête.' }
      ]
    }
  });
})();
