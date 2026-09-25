# Journal

> Format : date — décision ou action — pourquoi — fichiers touchés.
> Entrées les plus récentes en haut.

## 2026-09-25

- **Retour de Michael sur le cas A** : pas de bloc « Preuve » — il veut rester
  discret sur son employeur. Bloc retiré des cas Lengow (conservé pour
  System://Alive), mentions « code propriétaire / détail en entretien »
  retirées des compétences. Règle ajoutée à `PARCOURS.md` et `CLAUDE.md`,
  gardée par un test.
- **Phase 5.4 — étude de cas A rédigée** (reprise du périmètre plugins sans
  passation), depuis `PARCOURS.md` uniquement, en données typées dans
  `profile.ts` (`cases`). Gabarit fixe : contexte, problème, contrainte,
  4 décisions avec l'option écartée, résultat, preuve. Un seul chiffre (un
  mois accordé, deux semaines) ; pas de date, pas de nom de client, rien sur
  l'histoire interne de l'employeur, pas d'heures supplémentaires.
  « Ce que je ferais autrement » : non fourni → marqueur visible.
  Tests ajoutés : pas d'identifiant client, au plus une comparaison chiffrée
  par cas (compteur lui-même testé), espace insécable avant `: ; ? !`.
  **En attente de validation par Michael.**
- **Phase 5.3 — scénographie branchée sur le scroll.** Deux nuages de points
  procéduraux (flux à gauche, treillis à droite), placés par `HERO_LAYOUT`,
  animés au vertex shader (0 octet envoyé au GPU par frame, 2 passes cœur +
  halo, pas de post-processing). Présence pilotée par un storyboard continu
  (hero au repos → deux moitiés → flux sur les cas e-commerce → structure sur
  System://Alive → pic au seuil de l'expérience → calme au contact), seuils
  dérivés des sections mesurées. Montée après idle, chunk Three importé à la
  demande.
  **Défaut vu sur capture et corrigé** : la scène passait sous les colonnes de
  texte. Sujet décalé à droite en paysage, vers le bas en portrait avec
  opacité réduite ; nouvelle assertion spatiale `findTextBandIntrusions`.
  **Écart assumé au brief** : générateurs écrits neufs plutôt que portés de
  `particleShapes.ts` — ses formes (bateau, humanoïde…) sont le vocabulaire
  de `/codemylife` ; on reprend son contrat (fonctions pures, graine
  explicite), pas ses sujets.
  **Mesures locales, non bridées** : LCP 68-240 ms (élément `h1` ou `p`,
  jamais le canvas), CLS 0, 0 erreur, 1 long task (~80 ms, initialisation de
  la scène, après le LCP). JS initial **170 kB gz — au-dessus du plafond de
  160 kB** de 03-ARCHITECTURE : dette ouverte. Chunk Three 218 kB gz, chargé
  à la demande. E2E : scène montée, canvas jamais LCP, `?3d=off` et
  `prefers-reduced-motion` sans canvas.
  **Reste à faire** : poster statique pour le palier `off` (optionnel, la page
  est complète sans), budget `size-limit` en CI.
- **Phase 5.2 — ossature et design system.** Tokens de couleur en TypeScript
  (source unique, CSS généré, 22 tests de contraste WCAG AA sur les deux
  thèmes) ; Inter + JetBrains Mono auto-hébergées (48 + 40 kB, OFL) ; thème
  système + bascule mémorisée sans flash ; 8 sections + hero rendus serveur,
  faits tirés de `profile.ts` (compétences colonne ①, parcours, contacts) ;
  textes non rédigés en marqueurs visibles `⟨À RÉDIGER⟩`. Relevé local non
  bridé : LCP 72-260 ms, CLS 0, 0 erreur, 0 débordement sur les 5 viewports.
  E2E : ordre des sections, marqueurs visibles, e-mail en clair, bascule de
  thème persistée, pas de débordement à 360 px, focus visible au clavier.
  Choix pris sans question : sections en français seulement pour l'instant
  (l'anglais viendra avec le contenu rédigé) ; titres des cas provisoires.
- **Phase 3 — suite de l'outillage.** `src/scene/device` (sonde de capacités,
  paliers `off`/`low`/`medium`/`high` avec budgets DPR, pixels, FPS, particules ;
  gouverneur sur médiane de 120 frames, rétrograde, ne remonte jamais) ;
  `src/scene/scroll` (progression document et sections, abonnés notifiés au seul
  changement de section) ; `src/scene/interaction` (picking sur cibles
  explicites, un rayon au plus par frame, journal optionnel) ;
  `src/scene/engine/loop.ts` (RAF unique, dt borné, cap FPS, pause onglet caché
  et hors écran, reprise sans saut). 59 tests unitaires.
  **Décisions** : WebGL2 seul (dossier chiffré `docs/WEBGPU.md`) ; pas de
  physique (scénographie déterministe).
- **Phase 3 — outillage 3D, avant tout objet.** Layouts déclarés en données
  (zod) ; assertions spatiales pures (collisions nommées par paire, cadrage à 6
  ratios de 360×800 à 2560×1080, sol, bornes d'échelle) testées sans GPU, avec
  des tests qui prouvent que chaque vérification détecte bien son défaut.
  Caméra de production ajustée sur le FOV le plus étroit (le portrait est
  limité horizontalement). `deg()`, PRNG à graine. Lint : rotations brutes,
  `lerp` sans `dampFactor` et `Math.random` en scène interdits.
  `/dev/scene` (404 en production, testé) + surimpression d'inspection.
  `npm run capture:scene` (5 caméras fixes) et `npm run capture` (5 viewports
  × 8 paliers, LCP/CLS/long tasks/erreurs) ; sorties dans `captures/`, ignoré
  par git. Premier relevé local, non bridé, page provisoire : LCP 48-96 ms,
  CLS 0, 0 long task, 0 erreur, aucun débordement horizontal.
  Layout `hero` provisoire : `flow`, `structure`, `floor`, `backdrop` —
  volumes de placement, la scénographie réelle viendra ensuite.
- **Manuel d'exploitation `CLAUDE.md`** créé à la racine. Michael a choisi de
  garder ce nom (exception explicite à la règle « aucune mention d'outil »),
  pour que les sessions suivantes démarrent seules.
- **Phase 3 — socle du dépôt.** Next.js 16.3, React 19.3, TypeScript 5.9
  strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), Tailwind 4,
  ESLint (config Next, zéro avertissement toléré), Prettier, Vitest, Playwright
  1.56 (aligné sur le Chromium préinstallé). `npm run verify` = typecheck + lint
  + format + tests. CI GitHub Actions : verify + build, puis e2e.
  Premiers modules : `src/lib/motion/damp.ts` (lissage exponentiel borné, qui
  remplace tout lerp écrit à la main) et `src/content/profile.ts` (faits
  validés, schéma zod, durées calculées). La page consomme `profile.ts`.
  TypeScript 7 écarté : typescript-eslint ne le supporte pas encore (< 6.1).
- **Phase 1 — `docs/PARCOURS.md` validé par Michael.** Couvre : chronologie
  2012 → aujourd'hui, périmètre Lengow, tri des compétences, cas A (reprise du
  périmètre plugins sans passation) et B (centralisation de l'import des
  commandes), récit de débogage, contacts, positionnement (full stack confirmé
  PHP/Symfony + React/TypeScript, intégrations e-commerce), langues FR + EN.
  Règles fixées par Michael : pas de tuiles de chiffres (au plus un chiffre par
  cas, dans le texte), pas de dates de projet publiées, rien de négatif, rien
  sur la formation au-delà du fait. Les marqueurs restants sont mineurs.
  Prochaine étape : outillage du dépôt (phase 3), puis `src/content/profile.ts`.
- **Phase 1 — chronologie complète datée** (2012 → aujourd'hui) à partir du
  profil transmis par Michael : CDI, Nantes, en poste ; AFPA 2021-12 → 2022-06,
  bloc front-end validé ; aucune activité freelance. Trou principal :
  2016-11 → 2019-03. Règle posée : `PARCOURS.md` ne contient que des faits
  publiables, puisque le dépôt a vocation à être public. → `docs/PARCOURS.md`.
- **Phase 1 — interrogatoire ouvert.** Première réponse : entrée chez Lengow le
  2022-09-06 (*Software Support Developer*), *Software Developer* depuis le
  2023-10-01. Conséquence : « full stack » n'est pas un intitulé, seulement un
  périmètre à confirmer. → `docs/PARCOURS.md`.
- **Phase 0 — lecture des six documents d'analyse du dépôt source.** Ils ne sont
  pas sur `main` : uniquement sur `feat/sprint2-quickwins` @ `d0c8a91`.
  Arbitrages pris par rapport à ces documents :
  - *WebGPU* : `03-ARCHITECTURE-3D.md` l'exclut (D1). Le brief de Michael demande
    WebGL2 par défaut et WebGPU en option mesurée. Le brief prime. Les mesures de
    03 (three.webgpu 344 kB gz contre 258 kB ; Terser `keep_classnames` sur tout
    le bundle) forment le dossier de coût à présenter avant toute adoption.
  - *Objet 3D* : `02-DIRECTION-ARTISTIQUE.md` § 5.0 propose le buste neuronal ;
    03 et 04 le remplacent par du procédural (0 octet de géométrie). 03/04
    retenus.
  - *Chiffres du cas System://Alive* (04 § 3.2) : à revérifier dans l'historique
    git et les builds avant publication.
  - *Scaffold local `~/workspace/portfolio`* (STRATÉGIE § 6.3) : jamais poussé,
    inaccessible. Le dépôt repart de zéro (et ce scaffold utilisait Lenis,
    exclu par le brief).
- **Dépôt** : identité git réglée sur Michael. Travail sur `feat/bootstrap`,
  poussé avec l'accord de Michael ; `main` reste propre.
