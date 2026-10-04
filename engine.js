/* NEXUS TRACE — utilitaires partagés (navigateur et Node pour les tests) */
(function () {
  var root = typeof window !== 'undefined' ? window : globalThis;
  var NT = (root.NT = root.NT || {});
  NT.scenarios = NT.scenarios || [];

  /* ---------- Glossaire (info-bulles) ---------- */
  NT.glossary = {
    'dns': 'DNS : l’annuaire d’Internet. Il traduit un nom (nexus-demo.example) en adresse IP.',
    'résolveur': 'Résolveur : le service que ton appareil interroge pour obtenir l’adresse d’un nom. Il mémorise les réponses.',
    'ttl': 'TTL : la durée pendant laquelle une réponse DNS mémorisée reste considérée comme valable.',
    'ip': 'Adresse IP : le numéro qui dit « où » se trouve une machine sur un réseau.',
    'tcp': 'TCP : un protocole de transport fiable. Il numérote les paquets et redemande ceux qui manquent.',
    'tls': 'TLS : le mécanisme qui crée le canal chiffré utilisé par HTTPS et vérifie le certificat du site.',
    'https': 'HTTPS : HTTP transporté dans un canal chiffré, avec vérification de l’identité du domaine.',
    'http': 'HTTP : le langage du web. Le client envoie une requête, le serveur renvoie une réponse.',
    'routeur': 'Routeur : une machine qui reçoit des paquets et les transmet vers le prochain saut, d’après sa table de routage.',
    'saut': 'Saut : une étape du trajet, d’un routeur au suivant.',
    'paquet': 'Paquet : un morceau de données avec un en-tête d’adresse. Une page web voyage en plusieurs paquets.',
    'latence': 'Latence : le temps qu’un paquet met pour aller d’un point à un autre.',
    'goulot': 'Goulot d’étranglement : le maillon le plus limité d’un système. Il fixe la vitesse de l’ensemble.',
    'saturation': 'Saturation : la charge atteint la capacité. Les temps de réponse explosent, puis des demandes échouent.',
    'load balancer': 'Load balancer : un point d’entrée qui répartit les requêtes entre plusieurs serveurs.',
    'contrôle de santé': 'Contrôle de santé : le load balancer interroge régulièrement chaque serveur et retire celui qui ne répond plus.',
    'état local': 'État local : une information qui n’existe que sur un serveur. Elle empêche les serveurs d’être interchangeables.',
    'cache': 'Cache : une copie mémorisée d’un résultat, réutilisée pour éviter de refaire le même travail.',
    'cdn': 'CDN : des serveurs répartis dans le monde qui gardent des copies de contenus près des utilisateurs.',
    'origine': 'Serveur d’origine : la machine où se trouve l’original d’un contenu.',
    'redondance': 'Redondance : plusieurs exemplaires d’un même composant, pour que l’un remplace l’autre.',
    'bascule': 'Bascule : le passage du trafic d’un composant défaillant vers son remplaçant.',
    'point unique de panne': 'Point unique de panne : un composant dont la chute suffit à arrêter tout le service.',
    'réplication': 'Réplication : la copie continue de données sur plusieurs machines.',
    'déploiement': 'Déploiement : la mise en ligne contrôlée d’une nouvelle version.',
    'retour arrière': 'Retour arrière (rollback) : revenir à la version précédente après un problème.',
    'ci/cd': 'CI/CD : une chaîne automatique qui construit, teste puis livre une application.',
    'supervision': 'Supervision (monitoring) : la surveillance continue par des mesures, des journaux et des alertes.',
    'serveur': 'Serveur : le rôle d’une machine qui répond à des demandes.',
    'application': 'Application : le programme qui décide quoi faire d’une demande et construit la réponse.',
    'base de données': 'Base de données : l’endroit où les informations durables sont conservées.',
    'sauvegarde': 'Sauvegarde : des copies datées qui permettent de revenir en arrière. Différent de la réplication.'
  };

  /* ---------- Texte enrichi : **gras** et [[terme|clé]] ---------- */
  NT.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  NT.rich = function (str) {
    var s = NT.esc(str == null ? '' : str);
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\[\[(.+?)\]\]/g, function (m, x) {
      var parts = x.split('|');
      var txt = parts[0];
      var key = (parts[1] || parts[0]).toLowerCase();
      var def = NT.glossary[key];
      return def
        ? '<span class="term" tabindex="0" role="note" data-def="' + NT.esc(def) + '">' + txt + '</span>'
        : txt;
    });
    return s;
  };
  NT.plain = function (str) {
    return String(str == null ? '' : str).replace(/\*\*/g, '').replace(/\[\[(.+?)\]\]/g, function (m, x) {
      return x.split('|')[0];
    });
  };

  /* ---------- Formats ---------- */
  NT.fmtMs = function (ms) {
    var out;
    if (ms < 1000) out = Math.round(ms) + ' ms';
    else if (ms < 60000) out = (Math.round(ms / 100) / 10) + ' s';
    else out = (Math.round(ms / 6000) / 10) + ' min';
    return out.replace('.', ',');
  };
  NT.num = function (n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };
  NT.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  NT.clone = function (o) { return JSON.parse(JSON.stringify(o)); };

  /* ---------- Plus court chemin (coût = latence) ---------- */
  NT.shortestPath = function (links, from, to) {
    var adj = {};
    links.forEach(function (l) {
      (adj[l.a] = adj[l.a] || []).push({ to: l.b, w: l.ms, id: l.id });
      (adj[l.b] = adj[l.b] || []).push({ to: l.a, w: l.ms, id: l.id });
    });
    var dist = {}, prev = {}, done = {};
    dist[from] = 0;
    for (;;) {
      var u = null;
      Object.keys(dist).forEach(function (k) {
        if (!done[k] && (u === null || dist[k] < dist[u])) u = k;
      });
      if (u === null) break;
      done[u] = true;
      if (u === to) break;
      (adj[u] || []).forEach(function (e) {
        var nd = dist[u] + e.w;
        if (dist[e.to] === undefined || nd < dist[e.to]) {
          dist[e.to] = nd;
          prev[e.to] = { node: u, link: e.id, w: e.w };
        }
      });
    }
    if (dist[to] === undefined) return { ok: false, reach: Object.keys(dist) };
    var nodes = [to], hops = [];
    var cur = to;
    while (cur !== from) {
      var p = prev[cur];
      hops.unshift({ a: p.node, b: cur, id: p.link, ms: p.w });
      nodes.unshift(p.node);
      cur = p.node;
    }
    return { ok: true, nodes: nodes, hops: hops, ms: dist[to] };
  };

  /* ---------- Stockage local (facultatif) ---------- */
  NT.store = {
    get: function (k, d) {
      try { var v = root.localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; }
    },
    set: function (k, v) {
      try { root.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignoré */ }
    }
  };
})();
