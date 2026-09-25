# Journal

> Format : date — décision ou action — pourquoi — fichiers touchés.
> Entrées les plus récentes en haut.

## 2026-09-25

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
