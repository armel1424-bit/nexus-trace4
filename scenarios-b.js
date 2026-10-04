/* NEXUS TRACE — scénarios 5 à 8 */
(function () {
  var NQ = (typeof window !== 'undefined' ? window : globalThis).NQ;
  var n = NQ.n, b = NQ.b, s = NQ.s;

  /* ================= 5. PLUSIEURS SERVEURS (chapitre 16) ================= */
  var S5_SCENE = [
    b('Visiteurs', 'group', [n('v', 'Visiteurs')]),
    b('Point d’entrée', 'group', [n('lb', 'Répartiteur', 'load balancer')]),
    b('Serveurs NEXUS DEMO', 'group', [n('A', 'Serveur A'), n('B', 'Serveur B'), n('C', 'Serveur C')]),
    b('Données', 'group', [n('db', 'Base de données')])
  ];
  var S5_SICK = [
    b('Visiteurs', 'group', [n('v', 'Visiteurs')]),
    b('Point d’entrée', 'group', [n('lb', 'Répartiteur', 'envoie encore au serveur B', 'warn')]),
    b('Serveurs NEXUS DEMO', 'group', [n('A', 'Serveur A'), n('B', 'Serveur B', 'ne répond plus', 'down'), n('C', 'Serveur C')]),
    b('Données', 'group', [n('db', 'Base de données')])
  ];
  var S5_TRACE = [
    s('Une demande arrive', 'Le visiteur contacte une seule adresse : celle du répartiteur.', null, 'client'),
    s('Le répartiteur choisit un serveur', 'Selon une règle : tour de rôle, ou le moins chargé.', null, 'serveur'),
    s('Le serveur répond', 'Le visiteur ne sait pas lequel des trois a travaillé.', null, 'serveur')
  ];

  NQ.scenarios.push({
    id: 5, chapter: 16, title: 'Plusieurs serveurs',
    goal: 'Comprendre la répartition de charge et le contrôle de santé.',
    scene: S5_SCENE, trace: S5_TRACE,
    questions: [
      {
        kind: 'single',
        situation: 'NEXUS DEMO a maintenant **trois serveurs** derrière un répartiteur. Des centaines de demandes arrivent chaque minute.',
        ask: 'Comment le répartiteur doit-il distribuer les demandes ?',
        principle: 'Un répartiteur de charge donne une seule adresse aux visiteurs et partage le travail entre plusieurs serveurs, selon une règle.',
        others: 'Tout envoyer au premier serveur recrée la saturation. Laisser le visiteur choisir est impraticable : il ne connaît ni les serveurs ni leur état.',
        choices: [
          { t: 'Tout envoyer au serveur A tant qu’il répond', ok: false,
            why: 'Le serveur A resterait saturé alors que B et C ne feraient rien : on aurait payé trois serveurs pour n’en utiliser qu’un.',
            change: 'Rien ne change : on retrouve le problème du serveur unique.' },
          { t: 'Répartir à tour de rôle, ou vers le serveur le moins chargé', ok: true,
            why: 'Oui. Le tour de rôle (A, B, C, A, B, C…) est simple et suffit quand les demandes se ressemblent. « Vers le moins chargé » est plus fin quand certaines demandes sont longues.',
            change: 'Le répartiteur applique une règle de distribution : chaque serveur reçoit environ un tiers du trafic.',
            cons: 'Chaque serveur traite environ un tiers des demandes. Aucun ne sature.',
            outcome: { scene: [
              b('Visiteurs', 'group', [n('v', 'Visiteurs')]),
              b('Point d’entrée', 'group', [n('lb', 'Répartiteur', 'tour de rôle', 'new')]),
              b('Serveurs NEXUS DEMO', 'group', [n('A', 'Serveur A', '≈ 1/3 des demandes', 'new'), n('B', 'Serveur B', '≈ 1/3 des demandes', 'new'), n('C', 'Serveur C', '≈ 1/3 des demandes', 'new')]),
              b('Données', 'group', [n('db', 'Base de données')])
            ] } },
          { t: 'Laisser chaque visiteur choisir son serveur', ok: false,
            why: 'Le visiteur ne connaît ni les serveurs ni leur charge. Un point d’entrée unique est justement ce qui simplifie sa vie.',
            change: 'Rien ne change.' }
        ]
      },
      {
        kind: 'single',
        situation: 'Le serveur **B tombe en panne**. Le répartiteur lui envoie encore un tiers des demandes : **un visiteur sur trois** voit une erreur.',
        ask: 'Comment éviter d’envoyer des demandes à un serveur malade ?',
        principle: 'Le contrôle de santé : le répartiteur interroge régulièrement chaque serveur et retire de la distribution celui qui ne répond plus.',
        others: 'Attendre les plaintes laisse des visiteurs en erreur pendant longtemps. Éteindre des serveurs réduit la capacité sans régler le problème. Arrêter le répartiteur coupe le site entier.',
        choices: [
          { t: 'Un contrôle de santé régulier retire automatiquement le serveur qui ne répond pas', ok: true,
            why: 'Oui. Le répartiteur teste chaque serveur à intervalle court. Dès que B échoue, il cesse de lui envoyer des demandes : les visiteurs ne voient plus l’erreur.',
            change: 'Le serveur B sort de la liste active. A et C se partagent le trafic, et B est réintégré quand il répond de nouveau.',
            cons: 'A et C reçoivent chacun la moitié du trafic. Les erreurs disparaissent, au prix d’une capacité réduite d’un tiers.',
            outcome: { scene: [
              b('Visiteurs', 'group', [n('v', 'Visiteurs')]),
              b('Point d’entrée', 'group', [n('lb', 'Répartiteur', 'contrôle de santé', 'new')]),
              b('Serveurs NEXUS DEMO', 'group', [n('A', 'Serveur A', '≈ 1/2 des demandes'), n('B', 'Serveur B', 'retiré de la liste', 'down'), n('C', 'Serveur C', '≈ 1/2 des demandes')]),
              b('Données', 'group', [n('db', 'Base de données')])
            ] } },
          { t: 'Attendre que des visiteurs se plaignent', ok: false,
            why: 'Pendant ce temps, un visiteur sur trois reçoit une erreur. Une défaillance doit être détectée par le système, pas par les clients.',
            change: 'Rien ne change : B continue de recevoir des demandes.' },
          { t: 'Éteindre un serveur sur deux par précaution', ok: false,
            why: 'On réduirait la capacité sans cibler le serveur malade : le trafic dépasserait vite ce que les serveurs restants peuvent traiter.',
            change: 'Moins de serveurs, donc moins de capacité.' },
          { t: 'Arrêter le répartiteur le temps de réparer', ok: false,
            why: 'Le répartiteur est la porte d’entrée : l’arrêter coupe tout le site, y compris les serveurs sains.',
            change: 'Tout le site devient indisponible.' }
        ]
      },
      {
        kind: 'single',
        situation: 'Un visiteur recharge la page de NEXUS DEMO trois fois de suite et voit trois compteurs de visites différents : **4 217, 983 puis 2 560**. Chaque serveur garde son propre compteur en mémoire.',
        ask: 'Quelle correction est la bonne ?',
        principle: 'Quand plusieurs serveurs répondent pour le même site, l’état qui doit être commun (comme un compteur) doit vivre en un endroit partagé.',
        others: 'Copier les compteurs à la main les désynchroniserait à nouveau. Revenir à un seul serveur ferait revenir la saturation. Noter qu’un état partagé crée un nouveau point unique de panne : la base de données.',
        choices: [
          { t: 'Garder le compteur dans une base de données partagée par les trois serveurs', ok: true,
            why: 'Oui. Les trois serveurs lisent et écrivent le même compteur : peu importe lequel répond, la valeur est la même. Attention : cette base devient un point unique de panne.',
            change: 'Le compteur quitte les serveurs et rejoint la base de données commune. Les trois serveurs deviennent interchangeables.',
            cons: 'Le compteur affiche la même valeur quel que soit le serveur. Mais si la base tombe, tout tombe : on y reviendra au scénario 7.',
            outcome: { scene: [
              b('Serveurs NEXUS DEMO', 'group', [n('A', 'Serveur A', 'lit le compteur commun'), n('B', 'Serveur B', 'lit le compteur commun'), n('C', 'Serveur C', 'lit le compteur commun')]),
              b('Données partagées', 'group', [n('db', 'Base de données', 'un seul compteur : 4 217', 'new')])
            ] } },
          { t: 'Recopier à la main les compteurs d’un serveur à l’autre', ok: false,
            why: 'Les compteurs divergeraient de nouveau dès la prochaine visite.',
            change: 'Rien ne change durablement.' },
          { t: 'Revenir à un seul serveur', ok: false,
            why: 'Le compteur serait cohérent, mais la saturation reviendrait : on a retrouvé le problème d’origine.',
            change: 'On perd la capacité et la tolérance aux pannes.' }
        ]
      }
    ]
  });

  /* ================= 6. CACHE / CDN (chapitre 17) ================= */
  var S6_SCENE = [
    b('Visiteurs éloignés', 'group', [n('v1', 'Cotonou'), n('v2', 'Montréal'), n('v3', 'Tokyo')]),
    b('Très loin', 'group', [n('srv', 'Serveur NEXUS DEMO', 'basé à Paris')])
  ];
  var S6_TRACE = [
    s('Un visiteur lointain demande le logo', 'Chaque image fait le voyage jusqu’à Paris.', null, 'client'),
    s('Le voyage coûte du temps', 'Plus la distance est grande, plus la latence augmente.', null, 'reseau'),
    s('Le serveur renvoie le même fichier', 'Pour chaque visiteur, des milliers de fois.', null, 'serveur')
  ];

  NQ.scenarios.push({
    id: 6, chapter: 17, title: 'Cache et CDN',
    goal: 'Rapprocher les contenus identiques des visiteurs, sans mettre en cache ce qui est personnel.',
    scene: S6_SCENE, trace: S6_TRACE,
    questions: [
      {
        kind: 'single',
        situation: 'Les visiteurs de NEXUS DEMO sont dispersés : **Cotonou, Montréal, Tokyo**. Le serveur est à Paris. Le logo, la vidéo d’accueil et les images font chaque fois le long voyage.',
        ask: 'Quelle couche rapprocherait les contenus identiques des visiteurs ?',
        principle: 'Un CDN garde des copies de contenus déjà disponibles dans des points de présence proches des visiteurs. Il rapproche ; il ne calcule pas.',
        others: 'Un serveur plus gros ne raccourcit pas la distance. Plus de bases de données n’aident pas à servir un logo. Un DNS plus rapide accélère la question « où ? » mais pas le transport du contenu.',
        choices: [
          { t: 'Un CDN : des copies placées près des visiteurs', ok: true,
            why: 'Oui. Le CDN garde les contenus identiques (logo, vidéo, styles) dans des points de présence proches. Le visiteur de Cotonou ne va plus chercher le logo à Paris.',
            change: 'Des relais de cache apparaissent près des visiteurs. Le serveur de Paris n’est sollicité que la première fois, ou pour ce qui ne peut pas être copié.',
            cons: 'Le logo se charge depuis un point de présence proche : moins de distance, donc moins de latence. Le serveur de Paris reçoit beaucoup moins de demandes.',
            outcome: { scene: [
              b('Visiteurs éloignés', 'group', [n('v1', 'Cotonou'), n('v2', 'Montréal'), n('v3', 'Tokyo')]),
              b('Points de présence CDN', 'group', [n('e1', 'Relais proche', 'copies', 'new'), n('e2', 'Relais proche', 'copies', 'new'), n('e3', 'Relais proche', 'copies', 'new')]),
              b('Origine', 'group', [n('srv', 'Serveur NEXUS DEMO', 'Paris : sollicité moins souvent')])
            ] } },
          { t: 'Un serveur plus gros à Paris', ok: false,
            why: 'Un serveur plus puissant calcule plus vite, mais ne raccourcit pas la distance entre Paris et Tokyo.',
            change: 'Rien ne change côté distance.' },
          { t: 'Plusieurs bases de données', ok: false,
            why: 'Les bases de données stockent des données de l’application. Elles ne servent pas à rapprocher un logo ou une vidéo.',
            change: 'Rien ne change.' },
          { t: 'Un DNS plus rapide', ok: false,
            why: 'Le DNS accélère la réponse à « quelle adresse ? », pas le transport de la vidéo ou de l’image.',
            change: 'Rien ne change.' }
        ]
      },
      {
        kind: 'multi',
        situation: 'Voici six contenus de NEXUS DEMO. Le CDN peut garder des copies, mais pas de tout.',
        ask: 'Coche tous les contenus qu’il est approprié de mettre en cache / CDN.',
        principle: 'On met en cache ce qui est identique pour tous et change peu. Jamais un contenu personnel ou critique.',
        others: 'Le CDN rapproche un contenu déjà disponible ; il ne fait pas le calcul à la place du serveur. Un fil d’actualité personnalisé, un solde ou un mot de passe sont propres à une personne : les copier, c’est risquer de les montrer à quelqu’un d’autre.',
        choices: [
          { t: 'Le logo', ok: true, why: 'Identique pour tous, change très rarement : cas idéal.' },
          { t: 'Le fil d’actualité personnalisé d’un utilisateur', ok: false, why: 'Propre à chaque personne. Un cache pourrait le montrer à quelqu’un d’autre.' },
          { t: 'Une vidéo de présentation', ok: true, why: 'Lourde, identique pour tous : le CDN la rapproche très bien.' },
          { t: 'Le solde d’un compte', ok: false, why: 'Donnée personnelle et critique, et elle change : ne jamais la mettre en cache partagé.' },
          { t: 'La page d’accueil (mise à jour toutes les heures)', ok: true, why: 'Identique pour tous et changeante peu souvent : on peut la garder environ une heure.' },
          { t: 'Un mot de passe', ok: false, why: 'Secret personnel : jamais copié, jamais mis en cache.' }
        ],
        okCons: 'Les trois contenus communs partent au CDN. Les données personnelles restent calculées pour chaque utilisateur, sur le serveur.',
        badCons: 'Un contenu personnel en cache est un risque : un visiteur pourrait recevoir les données d’un autre. Retire-le de la sélection.',
        outcomeOk: { scene: [
          b('Au CDN (copies partagées)', 'group', [n('c1', 'Logo', 'copié', 'new'), n('c2', 'Vidéo', 'copiée', 'new'), n('c3', 'Page d’accueil', 'copie 1 h', 'new')]),
          b('Toujours sur le serveur', 'group', [n('p1', 'Fil perso', 'calculé'), n('p2', 'Solde', 'calculé'), n('p3', 'Mot de passe', 'jamais copié')])
        ] }
      }
    ]
  });

  /* ================= 7. PANNE (chapitre 19) ================= */
  var S7_SCENE = [
    b('Visiteurs', 'group', [n('v', 'Visiteurs')]),
    b('Point d’entrée', 'group', [n('lb', 'Répartiteur', 'un seul')]),
    b('Serveurs', 'group', [n('A', 'Serveur A'), n('B', 'Serveur B', 'tombé', 'down'), n('C', 'Serveur C')]),
    b('Données', 'group', [n('db', 'Base de données', 'une seule')])
  ];
  var S7_TRACE = [
    s('Le serveur B tombe', 'Le contrôle de santé le retire : A et C continuent. Aucune interruption visible.', null, 'serveur'),
    s('La base de données tombe', 'Les trois serveurs sont sains, mais aucun ne peut lire le compteur.', null, 'serveur'),
    s('Tout le site s’arrête', 'Une seule base : si elle tombe, rien ne fonctionne.', null, 'client')
  ];

  NQ.scenarios.push({
    id: 7, chapter: 19, title: 'Panne',
    goal: 'Identifier les points uniques de panne et comprendre que la redondance ne protège que ce qui est réellement doublé.',
    scene: S7_SCENE, trace: S7_TRACE,
    questions: [
      {
        kind: 'multi',
        situation: 'Le serveur B tombe : le site continue, car A et C prennent le relais. Mais ensuite la **base de données** tombe, et tout s’arrête.',
        ask: 'Coche tous les points uniques de panne de cette architecture.',
        principle: 'Un point unique de panne est un composant sans doublure : s’il tombe, le service tombe.',
        others: 'Les serveurs ne sont pas un point unique de panne : on en a trois. C’est le répartiteur et la base de données, présents en un seul exemplaire, qui le sont.',
        choices: [
          { t: 'Le répartiteur de charge', ok: true, why: 'Un seul exemplaire : s’il tombe, aucun visiteur n’atteint les serveurs.' },
          { t: 'Les trois serveurs', ok: false, why: 'Ils sont trois et interchangeables : la perte de l’un d’eux n’interrompt pas le site.' },
          { t: 'La base de données', ok: true, why: 'Un seul exemplaire : si elle tombe, les serveurs sains ne peuvent plus rien servir. C’est le cas que le scénario vient de montrer.' }
        ],
        okCons: 'Deux points uniques repérés : le répartiteur et la base. Les trois serveurs, eux, sont redondants.',
        badCons: 'Reprends : un point unique est un composant présent en un seul exemplaire.',
        outcomeOk: { scene: [
          b('Visiteurs', 'group', [n('v', 'Visiteurs')]),
          b('Point d’entrée', 'group', [n('lb', 'Répartiteur', 'point unique de panne', 'warn')]),
          b('Serveurs', 'group', [n('A', 'Serveur A', 'redondant'), n('B', 'Serveur B', 'redondant'), n('C', 'Serveur C', 'redondant')]),
          b('Données', 'group', [n('db', 'Base de données', 'point unique de panne', 'warn')])
        ] }
      },
      {
        kind: 'single',
        situation: 'Tu as les moyens de doubler **un seul** composant ce mois-ci. Tu veux éviter une interruption visible, et que la panne de la base ne détruise pas de données.',
        ask: 'Que doubles-tu en priorité ?',
        principle: 'La redondance ne protège que ce qui a réellement été doublé. On commence par le composant dont la perte est la plus grave et la plus difficile à réparer.',
        others: 'Un quatrième serveur double ce qui l’est déjà. Une sauvegarde nocturne permet de restaurer, mais pas d’éviter l’interruption. Le répartiteur doit aussi être doublé, mais il ne contient pas de données : sa perte est moins grave.',
        choices: [
          { t: 'Ajouter un quatrième serveur d’application', ok: false,
            why: 'Les serveurs sont déjà redondants : en ajouter un ne règle pas le vrai risque.',
            change: 'Rien ne change côté point unique.' },
          { t: 'Répliquer la base de données (une seconde copie prête à prendre le relais)', ok: true,
            why: 'Oui. La base contient l’état du site. Avec une réplique tenue à jour, si la première tombe, la seconde prend le relais, avec peu ou pas de perte de données.',
            change: 'Une réplique de la base apparaît : le point unique de panne devient redondant.',
            cons: 'Si la base principale tombe, la réplique prend le relais. Le site reste en ligne. Restent le répartiteur à doubler plus tard.',
            outcome: { scene: [
              b('Visiteurs', 'group', [n('v', 'Visiteurs')]),
              b('Point d’entrée', 'group', [n('lb', 'Répartiteur', 'toujours un seul', 'warn')]),
              b('Serveurs', 'group', [n('A', 'Serveur A'), n('B', 'Serveur B'), n('C', 'Serveur C')]),
              b('Données', 'group', [n('db', 'Base principale', 'écrit et copie'), n('rep', 'Réplique', 'prête au relais', 'new')])
            ] } },
          { t: 'Faire une sauvegarde de la base chaque nuit', ok: false,
            why: 'Une sauvegarde permet de restaurer après coup, mais pendant la restauration le site est arrêté, et tout ce qui s’est passé depuis la dernière sauvegarde est perdu. Sauvegarde et redondance ne sont pas la même chose.',
            change: 'Le schéma ne change pas : toujours une seule base en service.' },
          { t: 'Doubler le répartiteur de charge', ok: 'part',
            why: 'Bonne idée à terme : le répartiteur est un point unique. Mais la base contient les données du site ; sa panne est plus grave et plus difficile à réparer, donc elle passe en premier.',
            change: 'Le répartiteur serait redondant, mais la base resterait le maillon faible.' }
        ]
      }
    ]
  });

  /* ================= 8. DÉPLOIEMENT (chapitre 22) ================= */
  var S8_SCENE = [
    b('Version en service', 'group', [n('v1', 'NEXUS DEMO v1', '100 % des visiteurs')]),
    b('À livrer', 'group', [n('v2', 'NEXUS DEMO v2', 'nouvelle version', 'new')])
  ];
  var S8_TRACE = [
    s('Une nouvelle version est prête', 'Elle corrige des bugs et ajoute des fonctions.', null, 'serveur'),
    s('Elle passe en production', 'Les vrais visiteurs vont l’utiliser.', null, 'client'),
    s('Un défaut caché apparaît', 'Les tests n’ont pas tout vu : la version v2 provoque des erreurs.', null, 'serveur')
  ];

  NQ.scenarios.push({
    id: 8, chapter: 22, title: 'Déploiement',
    goal: 'Livrer une nouvelle version sans la faire subir à tout le monde, et savoir revenir en arrière.',
    scene: S8_SCENE, trace: S8_TRACE,
    questions: [
      {
        kind: 'single',
        situation: 'La version **v2** de NEXUS DEMO est prête. Elle contient, sans que personne le sache, un défaut qui plante **1 requête sur 5**. Le site reçoit environ 1 000 requêtes par minute.',
        ask: 'Comment déploies-tu v2 ?',
        principle: 'Un déploiement progressif limite le nombre de visiteurs exposés à un défaut avant qu’on l’ait détecté.',
        others: 'Un déploiement brutal expose tout le monde d’un coup. Un test chez soi ne reproduit pas la réalité (volume, données, habitudes des visiteurs).',
        choices: [
          { t: 'Tout basculer d’un coup sur v2', ok: false,
            why: 'Les 1 000 requêtes par minute passent toutes par v2 : environ 200 échouent chaque minute, et tous les visiteurs sont touchés avant qu’on s’en aperçoive.',
            change: 'v1 est remplacée partout : plus aucune version saine en service.',
            cons: 'Environ 200 requêtes échouent à chaque minute, pour tous les visiteurs.',
            outcome: { scene: [
              b('Après bascule brutale', 'group', [n('v1', 'NEXUS DEMO v1', 'retirée', 'down'), n('v2', 'NEXUS DEMO v2', '100 % des visiteurs · 20 % d’erreurs', 'warn')])
            ] } },
          { t: 'Déploiement progressif : 10 % des visiteurs, puis 50 %, puis 100 %', ok: true,
            why: 'Oui. Au premier palier, seuls 10 % des visiteurs passent par v2. Le défaut apparaît sur peu de monde, et on peut s’arrêter avant d’aller plus loin.',
            change: 'Deux versions cohabitent : v1 sert 90 % des visiteurs, v2 en sert 10 %. On élargit seulement si les mesures restent bonnes.',
            cons: 'Environ 20 requêtes par minute échouent au lieu de 200 : le défaut est détecté tôt et limité à une petite partie des visiteurs.',
            outcome: { scene: [
              b('Premier palier', 'group', [n('v1', 'NEXUS DEMO v1', '90 % des visiteurs'), n('v2', 'NEXUS DEMO v2', '10 % · 20 % d’erreurs', 'warn')])
            ] } },
          { t: 'Tester chez toi, puis tout basculer', ok: false,
            why: 'Un test local ne reproduit ni la charge ni la variété des vrais usages. Il aide, mais il ne remplace pas une montée progressive.',
            change: 'Même situation qu’un déploiement brutal : tout le monde est exposé.' }
        ]
      },
      {
        kind: 'single',
        situation: 'Au premier palier, les erreurs montent à **20 %** chez les visiteurs qui passent par v2. Il faut décider **à l’avance** de ce qui déclenche un retour à v1.',
        ask: 'Quel principe de retour arrière choisis-tu ?',
        principle: 'Le retour arrière : on définit un seuil d’erreur à l’avance et on revient automatiquement à la version précédente s’il est dépassé. Le seuil est une décision de conception, pas un chiffre universel.',
        others: 'Corriger en direct sur la version en service ajoute du risque. Attendre les signalements des utilisateurs retarde la décision. Un seuil à 0 % déclencherait des retours en arrière pour la moindre erreur banale, alors qu’aucun seuil universel n’existe : il dépend du service.',
        choices: [
          { t: 'Fixer un seuil (par exemple plus de 2 % d’erreurs pendant 5 minutes) : au-delà, retour automatique à v1', ok: true,
            why: 'Oui. Avec 20 % d’erreurs, le seuil est dépassé presque tout de suite : on revient à v1, les visiteurs retrouvent un service sain. Le chiffre (2 %, 5 minutes) est un exemple : à toi de le choisir selon la criticité du service.',
            change: 'Un contrôle compare le taux d’erreur au seuil. S’il le dépasse, le trafic repart vers v1 sans intervention humaine.',
            cons: 'La version v2 est retirée en quelques minutes. L’incident est court, et limité aux 10 % de visiteurs du premier palier.',
            outcome: { scene: [
              b('Après retour arrière', 'group', [n('v1', 'NEXUS DEMO v1', '100 % des visiteurs · rétablie', 'new'), n('v2', 'NEXUS DEMO v2', 'retirée, à corriger', 'down')])
            ] } },
          { t: 'Corriger v2 en direct, sans revenir en arrière', ok: false,
            why: 'Modifier la version en service sous la pression multiplie les risques : on peut ajouter une erreur à l’erreur, pendant que les visiteurs continuent d’en subir.',
            change: 'Rien ne change : v2 reste en service avec son défaut.' },
          { t: 'Attendre que des utilisateurs signalent le problème', ok: false,
            why: 'Les signalements arrivent tard et en désordre. Une mesure automatique décide en quelques minutes.',
            change: 'Rien ne change.' },
          { t: 'Revenir en arrière dès la première erreur (seuil de 0 %)', ok: false,
            why: 'Toute application génère quelques erreurs banales (connexion perdue, etc.). Un seuil à 0 % déclencherait des retours en arrière sans raison. Le seuil se choisit, il n’est pas universel.',
            change: 'Les retours en arrière deviendraient quasi permanents.' }
        ]
      }
    ]
  });
})();
