/* NEXUS TRACE — scénarios 1 à 4 : situation, décision, explication, conséquence */
(function () {
  var NQ = (typeof window !== 'undefined' ? window : globalThis).NQ;
  var n = NQ.n, b = NQ.b, s = NQ.s;

  /* ================= 1. OUVRIR UNE PAGE (chapitre 7) ================= */
  var S1_SCENE = [
    b('Ton appareil', 'chain', [n('u', 'Toi'), n('nav', 'Navigateur')]),
    b('Annuaire', 'group', [n('dns', 'DNS', 'nom → adresse')]),
    b('Le voyage', 'chain', [n('net', 'Internet', 'routeurs'), n('srv', 'Serveur web', '203.0.113.7')]),
    b('Derrière le serveur', 'chain', [n('app', 'NEXUS DEMO', 'application'), n('db', 'Base de données', 'compteur')])
  ];
  var S1_TRACE = [
    s('Tu tapes nexus-demo.example', 'Le navigateur reçoit un nom, pas une adresse.', 0, 'client'),
    s('Le DNS donne l’adresse', 'Question puis réponse : 203.0.113.7.', 30, 'reseau'),
    s('La connexion s’établit', 'Poignée de main TCP : un aller-retour avant toute demande.', 40, 'reseau'),
    s('La demande part', 'GET /accueil, en HTTP.', 20, 'reseau'),
    s('Le serveur travaille', 'L’application lit le compteur dans la base et construit la page.', 60, 'serveur'),
    s('La réponse revient', 'La page repart en paquets.', 20, 'reseau'),
    s('Le navigateur affiche', 'Il assemble les morceaux et dessine la page.', 50, 'client')
  ];
  var S1_TRACE_BACK = [
    s('Tu tapes nexus-demo.example', 'Même nom, même site.', 0, 'client'),
    s('Adresse déjà en mémoire', 'Le cache DNS répond sans interroger l’annuaire.', 1, 'reseau'),
    s('Connexion réutilisée', 'Pas de nouvelle poignée de main complète.', 5, 'reseau'),
    s('La demande part', 'GET /accueil.', 20, 'reseau'),
    s('Le serveur travaille', 'Toujours le même travail : construire la page.', 60, 'serveur'),
    s('La réponse revient', 'La page repart en paquets.', 20, 'reseau'),
    s('Le navigateur affiche', 'Styles et images déjà gardés : affichage plus court.', 20, 'client')
  ];

  NQ.scenarios.push({
    id: 1, chapter: 7, title: 'Ouvrir une page',
    goal: 'Comprendre le trajet général d’une requête : de l’adresse tapée à la page affichée.',
    scene: S1_SCENE, trace: S1_TRACE,
    questions: [
      {
        kind: 'single',
        situation: 'Tu ouvres **nexus-demo.example**. La page s’affiche en un clin d’œil, mais derrière, la requête a traversé sept étapes. Observe la trace : le total fait **220 ms**.',
        ask: 'Où le temps se perd-il principalement ?',
        principle: 'Une visite est une conversation ordonnée. Chaque étape a un coût, et la seconde que tu ressens est une pile d’attentes courtes.',
        others: 'Chercher « le coupable » dans une seule étape est le réflexe le plus courant, et il est presque toujours faux : les temps s’additionnent.',
        choices: [
          { t: 'Dans une seule étape, sûrement le serveur', ok: false,
            why: 'Le serveur ne représente ici que 60 ms sur 220, soit environ un quart du temps.',
            change: 'Rien ne change : si on ne touchait que le serveur, on gagnerait au mieux 60 ms.' },
          { t: 'Il est réparti sur plusieurs étapes : réseau, serveur, navigateur', ok: true,
            why: 'Exact. Le réseau (DNS, connexion, demande, réponse) pèse 110 ms, le serveur 60 ms, le navigateur 50 ms. Aucune étape ne suffit à expliquer le total.',
            change: 'La trace se colore par couche : pour aller plus vite, on cherche d’abord quelles étapes on peut raccourcir ou éviter.',
            cons: 'Total : 220 ms = 110 ms de réseau + 60 ms de serveur + 50 ms d’affichage. Améliorer une seule couche ne suffit pas toujours.',
            outcome: { trace: S1_TRACE, focus: 'all' } },
          { t: 'Presque tout dans le DNS', ok: false,
            why: 'Le DNS ne prend ici que 30 ms. Il est indispensable, mais il n’est pas l’étape la plus longue.',
            change: 'Rien ne change : l’annuaire n’est qu’une étape parmi sept.' },
          { t: 'Uniquement dans la base de données', ok: false,
            why: 'La base de données est une partie des 60 ms du serveur. Elle n’explique pas les 160 ms restantes.',
            change: 'Rien ne change : accélérer la base ne raccourcit ni le réseau ni l’affichage.' }
        ]
      },
      {
        kind: 'single',
        situation: 'Un visiteur **revient** sur NEXUS DEMO quelques minutes plus tard. Le serveur n’a pas changé. Pourtant, sa page s’affiche en **126 ms** au lieu de 220.',
        ask: 'Qu’est-ce qui explique ce gain ?',
        principle: 'Éviter de refaire un voyage est la façon la plus rapide de gagner du temps : c’est le rôle des mémoires (caches).',
        others: 'HTTPS protège l’échange mais ajoute une poignée de main. Supprimer le DNS est impossible : sans adresse, aucun paquet ne sait où aller.',
        choices: [
          { t: 'Le serveur est devenu plus puissant', ok: false,
            why: 'Le travail du serveur est resté à 60 ms. Ce n’est pas lui qui a changé.',
            change: 'Rien ne change côté serveur.' },
          { t: 'Des résultats sont déjà mémorisés : adresse, connexion, fichiers', ok: true,
            why: 'Oui. L’adresse DNS, la connexion et les fichiers sont gardés. Plusieurs étapes disparaissent ou raccourcissent, sans rien toucher au serveur.',
            change: 'Les étapes DNS, connexion et affichage raccourcissent : le total passe de 220 ms à 126 ms.',
            cons: 'Visite de retour : 126 ms. Le travail du serveur (60 ms) reste identique.',
            outcome: { trace: S1_TRACE_BACK, focus: 'all' } },
          { t: 'On a passé le site en HTTPS pour accélérer', ok: false,
            why: 'HTTPS ajoute une poignée de main (TLS). Il protège l’échange et prouve l’identité du site, mais il n’accélère pas la visite.',
            change: 'Rien ne s’accélère : on ajouterait une étape.' }
        ]
      }
    ]
  });

  /* ================= 2. DNS (chapitre 5) ================= */
  var S2_BEFORE = [
    b('Visiteurs', 'chain', [n('v', 'Visiteurs'), n('res', 'Résolveur DNS', 'a gardé 203.0.113.7')]),
    b('Annuaire officiel', 'group', [n('auth', 'nexus-demo.example', 'A 203.0.113.7 · TTL 24 h')]),
    b('Destination', 'group', [n('old', 'Ancien serveur', '203.0.113.7')])
  ];
  var S2_AFTER = [
    b('Visiteurs', 'chain', [n('v', 'Visiteurs'), n('res', 'Résolveur DNS', 'garde encore l’ancienne', 'warn')]),
    b('Annuaire officiel', 'group', [n('auth', 'nexus-demo.example', 'A 198.51.100.20 · TTL 24 h', 'new')]),
    b('Destinations', 'group', [n('old', 'Ancien serveur', 'reçoit encore des visiteurs', 'warn'), n('new', 'Nouveau serveur', '198.51.100.20', 'new')])
  ];
  var S2_TRACE = [
    s('Le navigateur demande l’adresse', '« Quelle adresse pour nexus-demo.example ? »', null, 'client'),
    s('Le résolveur regarde sa mémoire', 'Il a déjà la réponse : il ne redemande rien tant que le TTL n’est pas écoulé.', null, 'reseau'),
    s('Il répond avec ce qu’il a gardé', 'Avant le changement : 203.0.113.7. Après : toujours 203.0.113.7 pour un moment.', null, 'reseau'),
    s('Le navigateur contacte cette adresse', 'Le DNS n’a rien livré : il a seulement indiqué où aller.', null, 'client')
  ];

  NQ.scenarios.push({
    id: 2, chapter: 5, title: 'DNS : trouver un domaine',
    goal: 'Comprendre la chaîne nom → résolution → destination → cache, et pourquoi un changement n’est pas instantané.',
    scene: S2_BEFORE, trace: S2_TRACE,
    questions: [
      {
        kind: 'action',
        situation: 'NEXUS DEMO déménage vers un **nouveau serveur** (198.51.100.20). Pour que les visiteurs arrivent au bon endroit, tu dois changer l’enregistrement DNS du domaine. Le TTL actuel est de **24 heures**.',
        ask: 'Fais le changement.',
        principle: 'Le DNS fait correspondre un nom à une destination. C’est un annuaire : il indique où aller, il ne transporte pas la page.',
        others: 'Il n’y a pas d’autre action possible ici : change l’enregistrement, puis observe.',
        choices: [
          { t: 'Changer l’adresse de nexus-demo.example vers 198.51.100.20', ok: true,
            why: 'C’est fait : l’annuaire officiel affiche la nouvelle adresse. Mais regarde le schéma : des résolveurs ont encore l’ancienne réponse en mémoire.',
            change: 'L’annuaire officiel pointe vers le nouveau serveur. Des visiteurs, eux, arrivent encore sur l’ancien.',
            cons: '10 minutes après le changement, une partie des visiteurs voit encore l’ancien serveur.',
            outcome: { scene: S2_AFTER } }
        ]
      },
      {
        kind: 'single',
        situation: 'Dix minutes après le changement, certains visiteurs voient encore l’**ancien** serveur, d’autres le **nouveau**. Personne n’a rien cassé.',
        ask: 'Pourquoi une partie des visiteurs voit-elle encore l’ancienne destination ?',
        principle: 'Le cache et le TTL : un résolveur mémorise la réponse pendant la durée annoncée, sans reposer la question.',
        others: 'Le DNS ne livre jamais la page : il donne une adresse. Ni la vitesse du nouveau serveur, ni le navigateur n’expliquent des destinations différentes.',
        choices: [
          { t: 'Des résolveurs ont mémorisé l’ancienne réponse (cache, TTL)', ok: true,
            why: 'Oui. Un résolveur garde la réponse pendant le TTL (ici 24 h). Tant qu’elle n’a pas expiré, il redonne l’ancienne adresse sans interroger l’annuaire.',
            change: 'Aucun composant ne change : seule la durée de la mémoire explique le retard.',
            cons: 'Pendant un temps pouvant aller jusqu’à 24 h, deux populations de visiteurs coexistent.',
            outcome: { scene: S2_AFTER } },
          { t: 'Le DNS n’a pas encore envoyé la page au nouveau serveur', ok: false,
            why: 'Le DNS n’envoie jamais de page. Il donne une adresse ; c’est le navigateur qui contacte ensuite le serveur.',
            change: 'Rien ne change : cette idée mélange l’annuaire et le transport.' },
          { t: 'Le nouveau serveur est trop lent à démarrer', ok: false,
            why: 'Si le nouveau serveur était lent, tous ceux qui y arrivent attendraient, mais personne n’arriverait à l’ancien.',
            change: 'Rien ne change.' },
          { t: 'Le navigateur de certains visiteurs est cassé', ok: false,
            why: 'Le même navigateur qui affiche l’ancien serveur affichera le nouveau dès que la mémoire expire : il fonctionne.',
            change: 'Rien ne change.' }
        ]
      },
      {
        kind: 'single',
        situation: 'Tu dois recommencer un déménagement le mois prochain, et cette fois tu veux **limiter** ce retard.',
        ask: 'Que fais-tu avant le déménagement ?',
        principle: 'Le TTL est un compromis annoncé à l’avance : court, il accélère un changement ; long, il économise des questions.',
        others: 'Tu ne contrôles pas les résolveurs ni les navigateurs des visiteurs : le seul levier est la durée annoncée. Un serveur plus puissant n’agit pas sur la mémoire des annuaires, et attendre 24 h laisse des visiteurs mal dirigés.',
        choices: [
          { t: 'Baisser le TTL (par exemple à 60 secondes) quelques jours avant', ok: true,
            why: 'Oui. Avec un TTL court déjà en place, les mémoires expirent en une minute et la nouvelle adresse est vue presque partout en quelques minutes.',
            change: 'L’annuaire annonce « garde cette réponse 60 s » : le retard passe de 24 h à environ 1 min.',
            cons: 'Le retard maximal tombe de 24 heures à environ 1 minute.',
            outcome: { scene: [
              b('Visiteurs', 'chain', [n('v', 'Visiteurs'), n('res', 'Résolveur DNS', 'expire après 60 s')]),
              b('Annuaire officiel', 'group', [n('auth', 'nexus-demo.example', 'A 198.51.100.20 · TTL 60 s', 'new')]),
              b('Destination', 'group', [n('new', 'Nouveau serveur', '198.51.100.20', 'new')])
            ] } },
          { t: 'Vider le cache de chaque visiteur', ok: false,
            why: 'Tu ne contrôles ni leur navigateur ni leur résolveur. Cette solution n’existe pas.',
            change: 'Rien ne change.' },
          { t: 'Acheter un serveur plus puissant', ok: false,
            why: 'Le problème n’est pas la capacité du serveur mais la mémoire des annuaires.',
            change: 'Rien ne change : le nouveau serveur serait plus puissant, mais sa visibilité resterait retardée.' },
          { t: 'Attendre un jour entier avant de communiquer', ok: 'part',
            why: 'Ça finit par marcher, car tout a expiré après 24 h. Mais pendant ce temps, des visiteurs sont mal dirigés. Mieux vaut le prévoir.',
            change: 'Rien ne change pendant l’attente.' }
        ]
      }
    ]
  });

  /* ================= 3. ROUTAGE (chapitre 6) ================= */
  var S3_BASE = [
    b('Chemin A (le plus court)', 'chain', [n('you', 'Toi'), n('R1', 'R1'), n('R2', 'R2'), n('R3', 'R3'), n('R5', 'R5')], { note: '≈ 33 ms jusqu’au serveur' }),
    b('Chemin B (détour)', 'chain', [n('you2', 'Toi'), n('R1b', 'R1'), n('R4', 'R4'), n('R5b', 'R5')], { note: '≈ 58 ms jusqu’au serveur' })
  ];
  var S3_CUT = [
    b('Chemin A', 'chain', [n('you', 'Toi'), n('R1', 'R1'), n('R2', 'R2'), n('R3', 'R3', 'lien vers R5 coupé', 'down'), n('R5', 'R5')], { note: 'Lien R3–R5 coupé', cut: 3 }),
    b('Chemin B', 'chain', [n('you2', 'Toi'), n('R1b', 'R1'), n('R4', 'R4'), n('R5b', 'R5')], { note: 'Toujours disponible' })
  ];
  var S3_TRACE = [
    s('Ton paquet part', 'Il porte l’adresse de destination, rien d’autre pour guider.', null, 'client'),
    s('R1 choisit le prochain saut', 'R1 consulte sa table : R2 ou R4 ? Il ne choisit que la suite immédiate.', null, 'reseau'),
    s('Le saut suivant décide à son tour', 'Chaque routeur refait le même choix pour le saut qui suit.', null, 'reseau'),
    s('Le dernier routeur remet au serveur', 'R5 est relié directement au serveur : le paquet arrive.', null, 'reseau')
  ];

  NQ.scenarios.push({
    id: 3, chapter: 6, title: 'Routage : saut par saut',
    goal: 'Comprendre qu’un routeur choisit le prochain saut, pas le trajet complet.',
    scene: S3_CUT, trace: S3_TRACE,
    questions: [
      {
        kind: 'single',
        situation: 'Ton paquet peut atteindre le serveur par deux chemins. Soudain, le **lien entre R3 et R5 tombe** : le chemin A, le plus court, est coupé.',
        ask: 'Quel chemin le paquet peut-il encore emprunter ?',
        principle: 'Internet est un réseau maillé : plusieurs chemins existent. Un lien qui tombe ne coupe pas la communication tant qu’un autre passage reste ouvert.',
        others: 'Attendre la réparation n’est pas nécessaire. Le chemin A est coupé : l’emprunter perd le paquet. Et personne ne « planifie » le trajet à l’avance.',
        choices: [
          { t: 'Le chemin A, via R2 et R3', ok: false,
            why: 'Le lien R3–R5 est coupé : le paquet arriverait à R3 et ne pourrait pas continuer.',
            change: 'Rien ne change : le paquet resterait bloqué.' },
          { t: 'Le chemin B, via R4', ok: true,
            why: 'Oui. R1 → R4 → R5 → serveur est encore entièrement disponible. Le trajet est plus long (≈ 58 ms au lieu de 33 ms), mais la communication continue.',
            change: 'Les routeurs se mettent à privilégier R1 → R4 : le trajet s’allonge, mais il existe.',
            cons: 'Le paquet arrive avec 25 ms de plus. Sans le chemin B, il serait perdu.',
            outcome: { scene: [
              b('Chemin A', 'chain', [n('you', 'Toi'), n('R1', 'R1'), n('R2', 'R2'), n('R3', 'R3', 'lien coupé', 'down'), n('R5', 'R5')], { note: 'Coupé', cut: 3 }),
              b('Chemin B emprunté', 'chain', [n('you2', 'Toi', '', 'new'), n('R1b', 'R1', '', 'new'), n('R4', 'R4', '', 'new'), n('R5b', 'R5', '', 'new')], { note: '≈ 58 ms jusqu’au serveur' })
            ] } },
          { t: 'Aucun : il faut attendre la réparation', ok: false,
            why: 'Tant qu’un autre chemin existe, les routeurs le trouvent seuls en quelques instants. L’attente n’est pas nécessaire.',
            change: 'Rien ne change.' }
        ]
      },
      {
        kind: 'single',
        situation: 'Le paquet est arrivé par le chemin B. Tu te demandes **qui a décidé** de ce détour.',
        ask: 'Comment le trajet a-t-il été choisi ?',
        principle: 'Un routeur ne connaît pas le trajet complet : il applique sa table de routage pour décider du prochain saut seulement.',
        others: 'Aucun routeur ne voit tout Internet, et ton navigateur n’a aucun moyen de choisir les routeurs. Le trajet se construit saut après saut.',
        choices: [
          { t: 'Un routeur central a planifié tout le trajet à l’avance', ok: false,
            why: 'Il n’existe pas de routeur central qui connaîtrait tous les chemins du monde.',
            change: 'Rien ne change : ce modèle n’existe pas.' },
          { t: 'Chaque routeur a choisi seulement le prochain saut, d’après sa table', ok: true,
            why: 'Exact. R1 a choisi R4 plutôt que R2 car il savait que ce côté était coupé ; R4 a choisi R5, et ainsi de suite.',
            change: 'Les tables de routage de R1 et de R2 sont mises à jour : R1 envoie désormais vers R4.',
            cons: 'Le trajet complet n’existe nulle part à l’avance : il se découvre saut après saut.',
            outcome: { scene: [
              b('Ce que chaque routeur décide', 'group', [n('t1', 'R1', 'prochain saut : R4 (R2 mène à une impasse)', 'new'), n('t4', 'R4', 'prochain saut : R5', 'new'), n('t5', 'R5', 'prochain saut : le serveur', 'new')])
            ] } },
          { t: 'Ton navigateur a choisi chaque routeur', ok: false,
            why: 'Ton navigateur envoie le paquet vers son premier routeur et c’est tout : il ne connaît pas le reste du chemin.',
            change: 'Rien ne change.' }
        ]
      }
    ]
  });

  /* ================= 4. SERVEUR SATURÉ (chapitre 15) ================= */
  var S4_BASE = [
    b('Visiteurs', 'group', [n('v', '1 500 visiteurs', 'en même temps')]),
    b('NEXUS DEMO', 'group', [n('A', 'Serveur A', 'capacité ≈ 800 · saturé', 'down')])
  ];
  var S4_TRACE = [
    s('1 500 visiteurs arrivent', 'En même temps, sur une seule adresse.', null, 'client'),
    s('Le serveur A reçoit tout', 'Il ne peut traiter que ≈ 800 demandes à la fois.', null, 'serveur'),
    s('Les demandes s’empilent', 'Les temps de réponse grimpent, des demandes expirent.', null, 'serveur'),
    s('Des visiteurs voient une erreur', 'Quand la charge dépasse 100 % de la capacité, des erreurs apparaissent.', null, 'client')
  ];

  NQ.scenarios.push({
    id: 4, chapter: 15, title: 'Serveur saturé',
    goal: 'Comprendre la saturation et choisir la bonne famille de réponse : répartir la charge.',
    scene: S4_BASE, trace: S4_TRACE,
    questions: [
      {
        kind: 'single',
        situation: 'NEXUS DEMO tourne sur **un seul serveur**. Il peut traiter environ **800 demandes** à la fois, mais **1 500 visiteurs** arrivent en même temps. Les pages mettent des secondes à s’afficher, et certaines échouent.',
        ask: 'Quelle décision règle le mieux la saturation ?',
        principle: 'La saturation est un problème de capacité : plus de demandes que de ressources. Le bon réflexe est de partager la charge plutôt que d’en demander toujours plus à une seule machine.',
        others: 'Le DNS ne fournit aucune capacité : il indique seulement où aller. Augmenter les ressources aide mais reste limité et laisse un point unique de panne. Le cache soulage le serveur pour les contenus répétés, mais ne remplace pas la capacité pour ce qui est calculé à chaque visite.',
        choices: [
          { t: 'Ajouter un second serveur et répartir les demandes entre les deux', ok: true,
            why: 'Oui. Deux serveurs traitent ≈ 1 600 demandes, et un répartiteur de charge envoie chaque demande à l’un ou à l’autre. On peut en ajouter d’autres si le trafic grandit.',
            change: 'Un répartiteur de charge (load balancer) apparaît devant les serveurs. Le schéma passe de « un serveur » à « un point d’entrée, plusieurs serveurs ».',
            cons: 'La charge est partagée : chaque serveur reçoit environ 750 demandes. Les erreurs disparaissent, et le site peut encore grandir.',
            outcome: { scene: [
              b('Visiteurs', 'group', [n('v', '1 500 visiteurs')]),
              b('Point d’entrée', 'group', [n('lb', 'Répartiteur', 'load balancer', 'new')]),
              b('NEXUS DEMO', 'group', [n('A', 'Serveur A', '≈ 750 demandes'), n('B', 'Serveur B', '≈ 750 demandes', 'new')])
            ] } },
          { t: 'Augmenter les ressources du serveur (plus de mémoire, plus de puissance)', ok: 'part',
            why: 'Ça aide, mais on touche vite une limite : une machine ne grossit pas à l’infini, coûte de plus en plus cher, et reste un point unique de panne.',
            change: 'Le schéma ne change pas : toujours une seule machine, juste plus grosse.' },
          { t: 'Mettre un cache devant les pages', ok: 'part',
            why: 'Un cache évite de recalculer des contenus identiques, et c’est utile. Mais ce qui est personnalisé à chaque visite doit toujours être calculé : le cache ne remplace pas la capacité.',
            change: 'Une mémoire apparaît devant le serveur, mais la capacité de calcul reste de 800.' },
          { t: 'Déplacer le DNS vers un autre fournisseur', ok: false,
            why: 'Le DNS ne transporte pas la page et ne calcule rien. Changer d’annuaire ne donne aucune capacité de plus au serveur.',
            change: 'Rien ne change : le serveur reçoit toujours 1 500 demandes.' }
        ]
      }
    ]
  });
})();
