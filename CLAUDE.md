# Manuel d'exploitation — portfolio de Michael Mas

À lire en entier au début de chaque session. Il prime sur les habitudes.
Documentation et échanges en **français** ; code, commentaires et noms en
**anglais**.

## 1. Ce qu'est ce dépôt

Le portfolio d'un **développeur full stack confirmé — PHP/Symfony et
React/TypeScript — spécialiste des intégrations e-commerce**. La 3D y est une
**scénographie** pilotée par le scroll, jamais une navigation.

**Test à appliquer à toute proposition : couper le canvas.** Si la page cesse
d'être un bon portfolio, la proposition est mauvaise.

L'expérience 3D historique (dépôt `michael-mas/personnal-portfolio`) reste
déployée à part et sera liée comme projet phare. On ne la migre pas.

## 2. Règles absolues

1. **Contenu** : tout fait de carrière vient de `docs/PARCOURS.md` (validé par
   Michael) → `src/content/profile.ts`. Nulle part ailleurs. Aucun fait repris
   de l'ancien dépôt (son parcours est faux). Un fait manquant s'écrit
   `⟨À CONFIRMER : question⟩`, visible à l'écran ; on ne comble jamais.
2. **Règles de publication fixées par Michael** : pas de tuiles de chiffres (au
   plus un chiffre par étude de cas, dans une phrase) ; pas de dates de projet ;
   rien de négatif sur lui ; rien sur l'AFPA au-delà de « bloc front-end
   validé » ; aucun intitulé jamais occupé (« lead », « senior ») ; pas de
   « freelance ». Un test (`profile.test.ts`) garde une partie de ces règles.
3. **Aucune donnée client identifiante** : on décrit le cas, pas le client
   (`MARCHAND_A`, `<order_id>`). Rien sur l'histoire interne de l'employeur.
4. **Aucune mention d'outil assistant** dans les commits, PR, branches, docs,
   commentaires ou contenus publiés (seule exception décidée par Michael : le
   nom de ce fichier). Pas de ligne de co-auteur. Identité git : Michael Mas
   (`97169033+michael-mas@users.noreply.github.com`).
5. **Rien ne part sans `npm run verify` vert.** Pas de contournement.
6. **Vérifier dans le navigateur avant de déclarer un visuel terminé.**
7. **Une question à la fois** à Michael, et seulement si sa réponse change ce
   qu'on fait. Le reste : trancher et le noter dans `docs/JOURNAL.md`.

## 3. Commandes

| Commande         | Rôle                                                          |
| ---------------- | ------------------------------------------------------------- |
| `npm run dev`    | Serveur de développement                                      |
| `npm run verify` | typecheck + lint (0 avertissement) + format + tests unitaires |
| `npm run e2e`    | Playwright sur le build de production (port 3100)             |
| `npm run build`  | Build de production                                           |

Node 22 (`.nvmrc`). Playwright est épinglé en 1.56.1 pour correspondre au
Chromium préinstallé de l'environnement distant (`/opt/pw-browsers`) : ne pas
lancer `playwright install` en local distant, ne pas monter la version sans
vérifier ce point.

## 4. Git

- `main` propre ; travail sur `feat/*` ; commits conventionnels (`feat:`,
  `fix:`, `docs:`, `build:`, `test:`, `refactor:`, `perf:`, `style:`).
- La CI (`.github/workflows/ci.yml`) tourne sur `main`, `feat/**` et les PR :
  verify + build, puis e2e.

## 5. Architecture (état actuel)

```
docs/PARCOURS.md        source de vérité des faits (validée)
docs/JOURNAL.md         journal daté des décisions — le tenir à jour
src/content/profile.ts  faits dérivés de PARCOURS, schéma zod, durées calculées
src/lib/motion/damp.ts  lissage exponentiel borné
src/app/                App Router ; contenu rendu serveur
e2e/                    tests Playwright
```

Documents d'analyse de référence : dépôt source, branche
`feat/sprint2-quickwins`, `docs/STRATEGIE-REPOSITIONNEMENT.md` et
`docs/new-portfolio/00` à `04`. Arbitrages pris par rapport à eux : voir
`docs/JOURNAL.md`.

## 6. Contraintes techniques non négociables

- Le canvas **n'est jamais l'élément LCP** ; le texte est rendu serveur et
  lisible avant toute création de contexte WebGL.
- La page est **complète sans 3D et sans JavaScript** (palier `off` = cas normal).
- **Aucun scroll-jacking**, pas de Lenis, pas de `preventDefault` sur le scroll.
  On lisse la valeur côté consommateur, jamais le scroll.
- **Une seule expérience responsive** de 360 à 2560 px.
- Le canvas se met en **pause** hors viewport et onglet caché.
- **WebGL2 par défaut.** WebGPU seulement en opt-in mesuré, après présentation
  à Michael du coût de bundle. Jamais de chemin à moitié porté servi.
- Budget : build total ≤ 10 Mo ; géométrie procédurale (0 octet) ; aucun
  fichier > ~400 lignes sans justification écrite.

## 7. Pièges connus — ne pas les redécouvrir

- **Lerp écrit à la main interdit.** `lerp(a, b, dt * k)` extrapole dès que
  `dt * k > 1` (bug historique `CatmullRomCurve3.getPoint`). Utiliser
  `damp()` / `dampFactor()` de `src/lib/motion/damp.ts`.
- **Le scroll ne passe pas par React** : store mutable lu par la boucle de
  rendu ; les composants ne s'abonnent qu'aux changements de section.
- **Raycast sur une liste explicite**, au plus une fois par frame.
- **Tout procédural passe par un PRNG à graine explicite.**
- **Rotations en radians**, via un helper `deg()` unique.
- TypeScript 7 : incompatible avec typescript-eslint (< 6.1) à ce jour.
- Ancien dépôt : `ParticleField` recalculait 60 000 particules sur le CPU à
  chaque frame ; le mobile ouvrait trois contextes WebGL ; la fonte Bulzing
  est sous licence non commerciale. Rien de cela ne revient.

## 8. Où on en est

Voir la dernière entrée de `docs/JOURNAL.md`. Ordre de construction : outillage
(captures déterministes, tests d'assertion spatiale) → ossature + design
system → scénographie → contenu réel → accessibilité, SEO, CV PDF → liens
vers l'expérience 3D et `/codemylife`.
