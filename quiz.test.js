/* Vérifie la cohérence des données du parcours : node tests/quiz.test.js */
const assert = require('assert');
globalThis.NQ = undefined;
require('../assets/quiz/core.js');
require('../assets/quiz/scenarios-a.js');
require('../assets/quiz/scenarios-b.js');
const S = NQ.scenarios;
let n = 0;
function t(name, f) { f(); n++; }

t('8 scénarios numérotés 1..8', () => { assert.deepStrictEqual(S.map(s => s.id), [1,2,3,4,5,6,7,8]); });
t('chapitres du livre', () => { assert.deepStrictEqual(S.map(s => s.chapter), [7,5,6,15,16,17,19,22]); });
S.forEach(s => {
  t('scénario ' + s.id + ' : champs', () => {
    assert.ok(s.title.length >= 4 && s.goal.length > 20);
    assert.ok(s.scene.length >= 2 && s.trace.length >= 3);
    assert.ok(s.questions.length >= 1);
  });
  s.questions.forEach((q, qi) => {
    const id = 'sc' + s.id + ' q' + (qi + 1);
    t(id + ' : textes obligatoires', () => {
      ['situation','ask','principle','others'].forEach(k => assert.ok(q[k] && q[k].length > 15, id + ' ' + k));
    });
    t(id + ' : bonne réponse', () => {
      const oks = q.choices.filter(c => c.ok === true).length;
      if (q.kind === 'multi') { assert.ok(oks >= 1 && q.choices.some(c => c.ok === false), id); assert.ok(q.okCons && q.badCons && q.outcomeOk); }
      else { assert.strictEqual(oks, 1, id + ' : une seule bonne réponse'); }
      if (q.kind === 'action') assert.strictEqual(q.choices.length, 1);
      else assert.ok(q.choices.length >= 3, id);
    });
    t(id + ' : chaque choix explique', () => {
      q.choices.forEach((c, i) => {
        assert.ok(c.t && c.why && c.why.length > 20, id + ' choix ' + i + ' : pourquoi');
        if (q.kind !== 'multi') assert.ok(c.change, id + ' choix ' + i + ' : ce qui change');
        if (c.ok === true && q.kind !== 'multi') assert.ok(c.cons && c.outcome, id + ' : conséquence visuelle de la bonne réponse');
      });
    });
  });
});
t('scénario 4 : le choix retenu introduit la répartition de charge', () => {
  const good = S[3].questions[0].choices.find(c => c.ok === true);
  assert.ok(/répart/i.test(good.t) && /Répartiteur/.test(JSON.stringify(good.outcome)));
  const dns = S[3].questions[0].choices.find(c => /DNS/.test(c.t));
  assert.strictEqual(dns.ok, false);
});
t('scénario 6 : contenus personnels jamais en cache', () => {
  const m = S[5].questions[1];
  ['fil', 'solde', 'mot de passe'].forEach(w => assert.strictEqual(m.choices.find(c => c.t.toLowerCase().includes(w)).ok, false, w));
  ['logo', 'vidéo', 'accueil'].forEach(w => assert.strictEqual(m.choices.find(c => c.t.toLowerCase().includes(w)).ok, true, w));
});
t('scénario 7 : base de données unique = point unique de panne', () => {
  const m = S[6].questions[0];
  assert.strictEqual(m.choices.find(c => /base/i.test(c.t)).ok, true);
  assert.strictEqual(m.choices.find(c => /serveurs/i.test(c.t)).ok, false);
  assert.ok(/Réplique/.test(JSON.stringify(S[6].questions[1].choices.find(c => c.ok === true))));
});
t('scénario 8 : progressif puis seuil non universel', () => {
  assert.ok(/progressif/i.test(S[7].questions[0].choices.find(c => c.ok === true).t));
  const q = S[7].questions[1];
  assert.ok(/seuil/i.test(q.choices.find(c => c.ok === true).t));
  assert.ok(/universel/i.test(q.principle));
});
t('aucun texte vide ou « — » orphelin', () => {
  const txt = JSON.stringify(S);
  assert.ok(!/"[^"]*":\s*"\s*—\s*"/.test(txt));
});
console.log('OK : ' + n + ' vérifications');
