/* Tests de cohérence : les chiffres de la simulation doivent correspondre au livre.
   Lancer :  node tests/sim.test.js */
var assert = require('assert');
require('../assets/js/engine.js');
require('../assets/js/scenarios-1.js');
require('../assets/js/scenarios-2.js');
var NT = globalThis.NT;
var S = {};
NT.scenarios.forEach(function (s) { S[s.id] = s; });
var ok = 0;
function t(name, fn) { fn(); ok++; console.log('  ✓ ' + name); }
function metric(res, key) { return res.metrics.filter(function (x) { return x.key === key; })[0]; }
function total(res) { return res.steps.reduce(function (a, s) { return a + s.ms; }, 0); }

console.log('Structure');
t('8 scénarios, ids 1 à 8', function () {
  assert.deepStrictEqual(NT.scenarios.map(function (s) { return s.id; }).sort(), [1, 2, 3, 4, 5, 6, 7, 8]);
});
t('chaque scénario a tous les champs nécessaires', function () {
  NT.scenarios.forEach(function (s) {
    ['title', 'objective', 'observe', 'learn', 'why', 'decision', 'explain', 'initial', 'layout', 'sim'].forEach(function (k) {
      assert.ok(s[k], 'scénario ' + s.id + ' : champ ' + k + ' manquant');
    });
    assert.ok(s.decision.choices.length >= 3, 'scénario ' + s.id + ' : au moins 3 choix');
    assert.strictEqual(s.explain.options.filter(function (o) { return o.ok; }).length, 1, 'scénario ' + s.id + ' : une seule bonne réponse');
    assert.ok(s.decision.choices.some(function (c) { return c.verdict === 'good'; }), 'scénario ' + s.id + ' : une bonne décision');
    var layout = s.layout(s.initial());
    var ids = {};
    layout.nodes.forEach(function (n) { ids[n.id] = true; });
    layout.links.forEach(function (l) { assert.ok(ids[l.a] && ids[l.b], 'scénario ' + s.id + ' : lien ' + l.id + ' vers un nœud inconnu'); });
    s.sim(s.initial()).steps.forEach(function (st) {
      assert.ok(ids[st.from] && ids[st.to], 'scénario ' + s.id + ' : étape « ' + st.label + ' » vers un nœud inconnu (' + st.from + '→' + st.to + ')');
      (st.via || []).forEach(function (v) { assert.ok(ids[v], 'scénario ' + s.id + ' : via inconnu ' + v); });
    });
  });
});
t('tous les états de décision produisent des étapes valides', function () {
  NT.scenarios.forEach(function (s) {
    s.decision.choices.forEach(function (c) {
      var st = c.apply(NT.clone(s.problem ? s.problem() : s.initial()));
      var layout = s.layout(st), ids = {};
      layout.nodes.forEach(function (n) { ids[n.id] = true; });
      s.sim(st).steps.forEach(function (x) { assert.ok(ids[x.from] && ids[x.to], 'scénario ' + s.id + ' / choix ' + c.id + ' : ' + x.from + '→' + x.to); });
    });
  });
});

console.log('Cohérence avec le livre');
t('ch. 7 : visite simulée = 220 ms', function () { assert.strictEqual(total(S[1].sim(S[1].initial())), 220); });
t('ch. 7 : visite de retour plus rapide', function () { assert.ok(total(S[1].sim({ https: false, revisit: true })) < 220); });
t('ch. 9 : HTTPS ajoute de la latence', function () { assert.ok(total(S[1].sim({ https: true, revisit: false })) > 220); });
t('ch. 5 : résolution complète = 75 ms', function () { assert.strictEqual(total(S[2].sim(S[2].initial())), 75); });
t('ch. 5 : TTL long + changement = réponse périmée', function () {
  var r = S[2].sim(S[2].problem());
  assert.strictEqual(metric(r, 'fresh').tone, 'bad');
});
t('ch. 5 : TTL court corrige le retard', function () {
  var st = S[2].decision.choices[0].apply(S[2].problem());
  assert.strictEqual(metric(S[2].sim(st), 'fresh').tone, 'good');
});
t('ch. 6 : chemin A (R1→R2→R3→R5), 4 routeurs', function () {
  var r = S[3].sim(S[3].initial());
  assert.strictEqual(metric(r, 'path').value, 'R1 → R2 → R3 → R5');
  assert.strictEqual(metric(r, 'hops').value, '4');
});
t('ch. 6 : sans R3–R5, le chemin B (3 routeurs) prend le relais', function () {
  var r = S[3].sim({ down: { 'R3-R5': true }, extra: false });
  assert.strictEqual(metric(r, 'path').value, 'R1 → R4 → R5');
  assert.strictEqual(metric(r, 'hops').value, '3');
});
t('ch. 6 : aucun chemin = injoignable ; un lien redondant rétablit', function () {
  assert.strictEqual(S[3].sim(S[3].problem()).verdict.level, 'down');
  assert.strictEqual(S[3].sim(S[3].decision.choices[0].apply(S[3].problem())).verdict.level, 'ok');
});
t('ch. 15 : 1 serveur sature vers 800 visiteurs', function () {
  assert.strictEqual(S[4].sim({ load: 700, servers: 1, power: 1, cache: false }).verdict.level, 'degraded');
  assert.strictEqual(S[4].sim({ load: 900, servers: 1, power: 1, cache: false }).verdict.level, 'down');
});
t('ch. 15 : le gros serveur tient jusqu’à ~5 000 puis la base sature', function () {
  var ok = S[4].sim({ load: 4500, servers: 1, power: 6, cache: false });
  var ko = S[4].sim({ load: 5500, servers: 2, power: 6, cache: false });
  assert.notStrictEqual(ok.verdict.level, 'down');
  assert.strictEqual(ko.verdict.level, 'down');
  assert.strictEqual(metric(ko, 'bott').value, 'la base de données');
});
t('ch. 15 : DNS ne change rien à la saturation', function () {
  var base = S[4].sim(S[4].problem()), dns = S[4].sim(S[4].decision.choices[3].apply(S[4].problem()));
  assert.strictEqual(metric(base, 'use').value, metric(dns, 'use').value);
});
t('ch. 15 : le cache est la meilleure réponse au problème posé', function () {
  var lvl = S[4].decision.choices.map(function (c) { return S[4].sim(c.apply(S[4].problem())).verdict.level; });
  assert.strictEqual(lvl[2], 'ok');
  assert.ok(lvl[0] !== 'down' && lvl[1] !== 'down');
  assert.strictEqual(lvl[3], 'down');
});
t('ch. 16 : 3 compteurs locaux se contredisent ; base partagée = un seul', function () {
  var bad = S[5].sim(S[5].problem()), good = S[5].sim(S[5].decision.choices[0].apply(S[5].problem()));
  assert.strictEqual(metric(bad, 'counter').tone, 'bad');
  assert.strictEqual(metric(good, 'counter').tone, 'good');
});
t('ch. 16 : B tombé sans contrôle de santé = 4 échecs sur 12 en tour de rôle', function () {
  var r = S[5].sim({ algo: 'rr', health: false, bDown: true, shared: true });
  assert.strictEqual(metric(r, 'fails').value, '4 sur 12');
});
t('ch. 16 : avec contrôle de santé, aucune erreur', function () {
  var r = S[5].sim({ algo: 'rr', health: true, bDown: true, shared: true });
  assert.strictEqual(metric(r, 'fails').value, '0 sur 12');
});
t('ch. 16 : « le moins chargé » équilibre mieux le travail que le tour de rôle', function () {
  var spread = function (r) { var v = metric(r, 'load').value.match(/\d+/g).map(Number); return Math.max.apply(null, v) - Math.min.apply(null, v); };
  assert.ok(spread(S[5].sim({ algo: 'least', health: true, bDown: false, shared: true })) < spread(S[5].sim({ algo: 'rr', health: true, bDown: false, shared: true })));
});
t('ch. 17 : le CDN divise le temps moyen ; la page dynamique n’en profite pas', function () {
  var avg = function (r) { return total(r) / 5; };
  assert.ok(avg(S[6].sim({ cdn: true, content: 'image', force: false })) < avg(S[6].sim({ cdn: false, content: 'image', force: false })) / 2);
  assert.ok(avg(S[6].sim({ cdn: true, content: 'page', force: false })) >= avg(S[6].sim({ cdn: false, content: 'page', force: false })));
});
t('ch. 17 : mettre du personnel en cache est signalé', function () {
  var r = S[6].sim({ cdn: true, content: 'private', force: true });
  assert.strictEqual(metric(r, 'safe').tone, 'bad');
  assert.strictEqual(metric(S[6].sim({ cdn: true, content: 'private', force: false }), 'safe').tone, 'good');
});
t('ch. 19 : panne d’un serveur invisible ; panne de la base arrête tout', function () {
  assert.strictEqual(S[7].sim({ lb2: false, replica: false, failover: 'auto', dead: { B: true } }).verdict.level, 'ok');
  assert.strictEqual(S[7].sim(S[7].problem()).verdict.level, 'down');
});
t('ch. 19 : points uniques de panne = load balancer et base', function () {
  var spof = metric(S[7].sim(S[7].initial()), 'spof').value;
  assert.ok(/load balancer/.test(spof) && /base/.test(spof), spof);
});
t('ch. 19 : réplique + bascule auto sauve le service ; manuelle = dégradé', function () {
  assert.strictEqual(S[7].sim(S[7].decision.choices[0].apply(S[7].problem())).verdict.level, 'ok');
  assert.strictEqual(S[7].sim(S[7].decision.choices[1].apply(S[7].problem())).verdict.level, 'degraded');
});
t('ch. 19 : doubler le load balancer ne sauve pas une base tombée', function () {
  assert.strictEqual(S[7].sim(S[7].decision.choices[2].apply(S[7].problem())).verdict.level, 'down');
});
t('ch. 22 : le déploiement progressif limite le pic d’erreurs', function () {
  var all = S[8].sim(S[8].problem()), prog = S[8].sim(S[8].decision.choices[0].apply(S[8].problem()));
  var peak = function (r) { return parseInt(metric(r, 'peak').value, 10); };
  assert.strictEqual(peak(all), 100);
  assert.strictEqual(peak(prog), 33);
  assert.ok(parseInt(metric(prog, 'reqs').value.replace(/\D/g, ''), 10) < parseInt(metric(all, 'reqs').value.replace(/\D/g, ''), 10));
});
t('ch. 22 : sans défaut, déploiement progressif = zéro incident', function () {
  var r = S[8].sim({ strategy: 'progressive', bad: false, thr: 2, auto: true });
  assert.strictEqual(metric(r, 'inc').value, 'aucun');
});
t('ch. 22 : un retour arrière manuel aggrave l’incident', function () {
  var auto = S[8].sim({ strategy: 'all', bad: true, thr: 2, auto: true }), man = S[8].sim({ strategy: 'all', bad: true, thr: 2, auto: false });
  var num = function (r) { return parseInt(metric(r, 'reqs').value.replace(/\D/g, ''), 10); };
  assert.ok(num(man) > num(auto));
});
t('aucune URL réelle inventée dans les textes', function () {
  var txt = JSON.stringify(NT.scenarios.map(function (s) { return [s.title, s.objective, s.observe, s.learn, s.decision, s.explain]; }));
  assert.ok(!/https?:\/\//.test(txt));
});
console.log('\n' + ok + ' tests réussis');
