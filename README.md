# NEXUS TRACE

*Voir ce qui se passe réellement derrière une connexion.*

Dispositif interactif du livre **DIGITAL MINDS 04 · NEXUS**. Un parcours de huit décisions : tu vois une infrastructure et un problème, tu choisis, puis l’outil explique pourquoi et montre ce qui change. Du DNS au déploiement.

- Site **statique** : HTML, CSS et JavaScript, sans framework, sans build, sans dépendance.
- **Aucun compte, aucun cookie, aucun traceur, aucune requête réseau** : tout est simulé dans le navigateur. Seule la progression est gardée en local (`localStorage`).
- Accessible : clavier, lecteurs d’écran, thème clair et sombre, `prefers-reduced-motion` respecté, états jamais signalés par la couleur seule.

## Les huit scénarios

| # | Scénario | Chapitre du livre | Lien direct |
|---|---|---|---|
| 1 | Ouvrir une page simple | 7 | `#scenario-1` |
| 2 | Trouver un domaine avec DNS | 5 | `#scenario-2` |
| 3 | Plusieurs routeurs | 6 | `#scenario-3` |
| 4 | Serveur unique | 15 | `#scenario-4` |
| 5 | Plusieurs serveurs | 16 | `#scenario-5` |
| 6 | Utilisateurs éloignés | 17 | `#scenario-6` |
| 7 | Une machine tombe | 19 | `#scenario-7` |
| 8 | Déploiement d’une nouvelle version | 22 | `#scenario-8` |

Chaque scénario suit **Situation → Trace visuelle → Décision → Réponse → Explication → Conséquence → Scénario suivant**, dans la boucle **Observe → Trace → Comprends → Modifie → Teste → Explique**. Le scénario suivant se déverrouille quand le précédent est maîtrisé ; le **mode libre** s’ouvre après les huit.

## Mettre en ligne (GitHub gratuit + Vercel)

### 1. Envoyer le code sur GitHub

```bash
cd nexus-trace
git init
git add .
git commit -m "NEXUS TRACE : première version"
git branch -M main
git remote add origin https://github.com/<ton-compte>/nexus-trace.git
git push -u origin main
```

Crée d’abord un dépôt vide `nexus-trace` sur GitHub (gratuit, public ou privé).

### 2. Déployer avec Vercel

1. Sur Vercel, choisis **Add New… → Project**, puis **Import** le dépôt `nexus-trace`.
2. Réglages : **Framework Preset : Other**. Laisse **Build Command** et **Output Directory** vides (le site est à la racine). Ne change rien d’autre.
3. Clique sur **Deploy**.

Chaque `git push` sur `main` redéploie automatiquement. Vercel fournit une adresse en `.vercel.app` ; tu peux ensuite ajouter un domaine personnalisé dans **Settings → Domains**.

### Mise à jour d’un projet déjà déployé

L’adresse ne change pas : remplace les fichiers dans le dépôt existant (`index.html`, dossier `assets/quiz/`, `simulateur.html`, `package.json`, `tests/`), puis `git add . && git commit -m "NEXUS TRACE : parcours de décisions" && git push`. Vercel redéploie sur le même projet et la même URL.

### 3. Mettre le lien dans le livre

Remplace chaque emplacement `[lien NEXUS TRACE à insérer après publication]` par l’adresse publique, avec le lien direct du scénario concerné :

```
<adresse-du-dispositif>#scenario-4
```

Les liens directs fonctionnent même si le lecteur arrive depuis un QR code ou un lien court. Fais la vérification en ouvrant chaque lien une fois en ligne.

## Tester en local

```bash
npm test                    # données du parcours + ancien simulateur
npx serve .                 # ou : python3 -m http.server 3000
```

Ouvrir `index.html` directement dans le navigateur fonctionne aussi.

## Organisation du code

```
index.html                  page d’entrée du parcours (c’est elle que Vercel sert)
assets/quiz/core.js         structures communes
assets/quiz/scenarios-a.js  scénarios 1 à 4 (situation, choix, explications)
assets/quiz/scenarios-b.js  scénarios 5 à 8
assets/quiz/quiz.js         interface : progression, verrous, vues Architecture et Trace
assets/quiz/quiz.css        styles (zones sombres immersives, zones claires, #246BFD)
simulateur.html + assets/js, assets/css   ancien simulateur, conservé à l’écart (accessible sur /simulateur, non lié)
tests/quiz.test.js          cohérence des données du parcours
tests/sim.test.js           tests de l’ancien simulateur
vercel.json                 en-têtes de sécurité (CSP stricte) et URL propres
```

Pour modifier un scénario, tout se passe dans son objet (`scene`, `trace`, `questions`) ; l’interface n’a pas à changer.

## Sécurité et vie privée

La politique de sécurité du contenu (`vercel.json`) interdit tout script ou ressource venant d’ailleurs et toute connexion sortante (`connect-src 'none'`). Les polices sont celles du système : aucune requête vers un service tiers.
