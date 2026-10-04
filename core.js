/* NEXUS TRACE — noyau des données du parcours (utilisable aussi sous Node pour les tests) */
(function () {
  var root = typeof window !== 'undefined' ? window : globalThis;
  var NQ = root.NQ = root.NQ || {};
  NQ.scenarios = [];

  /* Nœud : id, étiquette, sous-titre, état (ok | warn | down | new | hot) */
  NQ.n = function (id, l, s, st) { return { id: id, l: l, s: s || '', st: st || 'ok' }; };
  /* Bloc de scène : mode 'chain' (nœuds reliés par des flèches) ou 'group' (nœuds en parallèle) */
  NQ.b = function (t, mode, nodes, o) { return Object.assign({ t: t, mode: mode, nodes: nodes }, o || {}); };
  /* Étape de trace : titre, détail, durée en ms (optionnelle), kind (reseau | serveur | client) */
  NQ.s = function (t, d, ms, kind) { return { t: t, d: d, ms: ms === undefined ? null : ms, kind: kind || '' }; };

  NQ.LOOP = ['OBSERVE', 'TRACE', 'COMPRENDS', 'MODIFIE', 'TESTE', 'EXPLIQUE'];
  NQ.STORE_KEY = 'nt.quiz.v1';
})();
