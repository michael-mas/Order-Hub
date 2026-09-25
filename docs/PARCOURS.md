# Parcours — source de vérité unique

> **Statut : VALIDÉ par Michael le 2026-09-25.** Les marqueurs `⟨À CONFIRMER⟩`
> restants sont mineurs et ne bloquent pas la rédaction.
>
> Ce document est la seule source des faits de carrière. `src/content/profile.ts`
> en dérive ; la page, le CV PDF, les métadonnées et toute autre surface
> consomment `profile.ts`. Aucun fait de carrière n'est écrit ailleurs.
>
> Règles :
> - **Ce fichier est destiné à un dépôt public.** Il ne contient que des faits
>   publiables. Tout le reste (contexte privé, cible salariale) reste hors du dépôt.
> - Un fait n'entre ici que confirmé par Michael. Sa source est notée.
> - Un fait manquant s'écrit `⟨À CONFIRMER : question précise⟩`. On ne comble pas.
> - Aucune donnée client identifiante. Substituts : `MARCHAND_A`, `<order_id>`.
> - On stocke des **dates**, jamais des durées. Les durées se calculent à
>   l'affichage (« 3 ans ½ » et « 4 ans » coexistaient sur l'ancien site parce
>   qu'elles étaient écrites en dur à des moments différents).

---

## 1. État civil professionnel

### Lengow

| Fait | Valeur | Source | Statut |
|---|---|---|---|
| Entrée | **2022-09-06** | Michael | ✅ |
| Intitulé à l'entrée | **Software Support Developer** | Michael | ✅ |
| Changement d'intitulé | **2023-10-01** → **Software Developer** | Michael | ✅ |
| Intitulé aujourd'hui | Software Developer | Michael | ⟨À CONFIRMER : aucun autre changement depuis le 2023-10-01 ?⟩ |
| Type de contrat | **CDI** | Michael (profil LinkedIn transmis) | ✅ |
| En poste | **Oui** | Michael (profil LinkedIn transmis) | ✅ |
| Lieu | **Nantes** | Michael (profil LinkedIn transmis) | ✅ — sur site aujourd'hui (présentiel imposé ; auparavant full remote) |

Conséquences, à appliquer partout :

- Aucun intitulé « Lead ». Mot interdit.
- « Développeur full stack » n'est pas un intitulé. L'intitulé est *Software
  Developer*. « Full stack » ne peut décrire que le **périmètre**, une fois
  celui-ci confirmé (§ 2).
- Deux intitulés Lengow, deux lignes, sur toutes les surfaces (site, CV,
  LinkedIn) : *Software Support Developer* (2022-09 → 2023-09) puis *Software
  Developer* (2023-10 → aujourd'hui).

### Avant Lengow

| Début | Fin | Intitulé | Employeur / organisme | Contrat | Statut |
|---|---|---|---|---|---|
| ~2012 | | Bac pro commerce | | diplôme | ✅ |
| 2012-05 | 2012-05 | Gardien d'immeuble | La Nantaise Habitation | | ✅ |
| 2012-08 | 2012-08 | Gardien d'immeuble | La Nantaise Habitation | | ✅ |
| 2013-02 | 2013-02 | Serveur | SB Charly Bars | | ✅ |
| 2013-05 | 2016-11 | Employé polyvalent — barman, serveur, buraliste (bar-brasserie-tabac) | La Coquille | | ✅ |
| 2016-11 | 2019-03 | Missions courtes : restauration, manutention, garde d'enfants. Premier essai de code en 2017 (Python, OpenClassrooms), non abouti | divers | missions | ✅ |
| 2019-03 | 2020-03 | Aide à domicile (personnes âgées ou en situation de handicap) | ACS services | CDD | ✅ |
| 2020-08 | 2021-07 | Support technicien informatique (helpdesk) | Helpline | CDI | ✅ |
| 2021-12 | 2022-06 | Formation *Développeur web et web mobile* — bloc front-end validé, titre complet non obtenu | AFPA | formation | ✅ — formulation retenue : « bloc front-end validé » |

Mission d'été chez **Fidelia** (assurance auto) : **2019** selon Michael.
⟨À CONFIRMER : l'été 2019 chevauche le CDD ACS (2019-03 → 2020-03) ; l'ordre
raconté (aide à domicile, puis Fidelia, puis Helpline) place plutôt la mission
à l'été 2020, dans l'intervalle 2020-03 → 2020-08⟩

Autres intervalles, courts : 2020-03 → 2020-08, 2021-07 → 2021-12,
2022-06 → 2022-09. ⟨À CONFIRMER : contenu, s'il y en a un⟩

| Fait | Valeur |
|---|---|
| Diplôme | **Bac pro commerce** |
| Formation développeur | AFPA, 2021-12 → 2022-06, *Développeur web et web mobile* : **bloc front-end validé**, titre complet non obtenu |
| Apprentissage | 2017 : premier essai (Python, OpenClassrooms), abandonné. Apprentissage réel pendant la formation AFPA (2021-12 → 2022-06), en grande partie seul : OpenClassrooms, tutoriels. Projet réalisé : site e-commerce avec back-office (Symfony, React) pour une boucherie. Projet de formation, conçu pour un commerçant réel qui ne l'a finalement pas adopté ; jamais mis en production. ⟨À CONFIRMER : seul ou en groupe ? code encore disponible ?⟩ |
| Freelance | **Aucun.** |

Formulation proposée (à valider par Michael) :

> Reconversion. Appris en grande partie seul, avec une formation AFPA
> *Développeur web et web mobile* (bloc front-end validé).

Le vrai récit est une **reconversion** : métiers de service et d'aide, support
informatique, formation, support développeur, développeur. Chaque étape mène à
la suivante.

---

## 2. Périmètre technique réel

Déclaré par Michael le 2026-09-25. Aucun nom de client : les plateformes citées
(CMS, marketplaces, PIM) sont des produits tiers, pas des clients.

### Point d'entrée : plugins CMS et applications SaaS

- **Mise à niveau et correction des plugins** qui exportent et importent des
  commandes, et envoient les actions de commande, entre Lengow et les
  plateformes marchandes : **PrestaShop, Magento 1 et 2, WooCommerce
  (WordPress), Shopware 5 et 6, Shopify**.
- **Dépôt commun du front de la solution** : Symfony + React.
- **Applications** ajoutées ensuite : **Amazon** (export catalogue), **Thron** et
  **Akeneo** (catalogue).
- Tâches produit ponctuelles : suivi des validations des plugins et applications
  sur les places de marché des éditeurs.
- **Seul sur ce périmètre pendant environ un an**, puis transmission du savoir
  au développeur recruté ensuite.

### Élargissement : les autres services

- **API marketplaces** (Django / Python) : dialogue avec les places de marché.
- **Core** (Django / Python) : indexation des données et import catalogue.

### Environnement

Docker, PostgreSQL, Redis, RabbitMQ, Datadog, k9s (donc Kubernetes).

### Front

React ; Vue.js dans l'écosystème Shopware.

Niveau par technologie : voir § 3.

## 3. Compétences (tri en trois colonnes)

Auto-évaluation de Michael, 2026-09-25. ① = écrit en production, régulièrement ;
② = lit, comprend, intervient ponctuellement ; ③ = pas de pratique réelle.

| Techno | Col. | Ce que ça recouvre, selon Michael |
|---|---|---|
| PHP 7 → 8.4 | ① | Plugins CMS, front de la solution |
| Symfony 4 → 7 | ① | Dépôt commun du front de la solution |
| JavaScript | ① | |
| TypeScript | ① | |
| React | ① | Front de la solution |
| Datadog | ① | Tableaux de bord, création de dashboards de monitoring et d'alertes, facettes, exploration de logs |
| Docker | ① | Environnements locaux au quotidien ; a déjà écrit des conteneurs et de la configuration, sans pratique constante |
| SQL / PostgreSQL | ① (affiché) | Écrit des requêtes courantes ; lit et investigue les données de production. Requêtes complexes et fonctions avancées : pas naturelles, faute de pratique manuelle. **Affiché**, à la demande de Michael, avec une ligne d'usage limitée à ce qu'il pratique — pas « conception de schéma » ni « optimisation » |
| Python | lecture seule | Lit et comprend le code métier ; aucune PR, aucun projet |
| Django | lecture seule | Lit le code métier des services Django ; la configuration propre à Django lui est moins familière |
| Vue.js | ② | Montées de version et correctifs de la partie Shopware, projets personnels |
| Redis | ② | Manipulé surtout en contexte de test ; fonctionnement compris ; ne configure pas |
| RabbitMQ | ② | Idem Redis |
| Kubernetes / k9s | ② / ③ | Vérifier des environnements, lire les logs des pods, les relancer ; ne touche pas à la configuration |
| CI/CD | ③ | Comprend le fonctionnement (GitHub Actions de release par environnement), lu pour déboguer, jamais configuré |
| Tests automatisés | ① | PHPUnit, Vitest ; unitaires, intégration, bout en bout ; Playwright pour le bout en bout. Mis en place **après** une période d'urgence (« l'incendie »), comme rattrapage de dette technique ; à chaque PR depuis. Mise en place faite seul, selon Michael. ⟨À CONFIRMER : période ; sur quels projets ; « seul » = a écrit et installé les suites lui-même ?⟩ |

Règle de publication : seule la colonne ① entre dans la liste des compétences,
chacune avec sa preuve. La colonne ② peut apparaître **en contexte** dans un
récit (« le service dépend de Redis et RabbitMQ »), jamais comme compétence
revendiquée. La colonne ③ n'apparaît nulle part. « Lecture seule » : jamais
revendiqué ; peut apparaître en contexte seulement si un récit réel l'exige.

**Aucune formulation négative sur le site.** Ce qui n'est pas maîtrisé n'est pas
listé, c'est tout. Le bloc « ce que je ne connais pas encore » (04 § 4.4) reste
désactivé sauf décision explicite de Michael.

## 4. Réalisations

### A — Reprendre un périmètre plugins sans passation (candidat principal)

Faits déclarés par Michael le 2026-09-25 :

- **Contexte** : arrivée en 2022-09 comme *Software Support Developer*. Aucune
  formation ni passation : les dépôts et la charge de support, rien d'autre.
  L'équipe précédente sur ce périmètre n'était plus là ; la connaissance était
  perdue.
- **Ce qui cassait** : imports de commandes en échec, exports de certaines
  données catalogue, problèmes côté serveur marchand ; retards de
  compatibilité des plugins avec les nouvelles versions des CMS.
- **Ce qu'il a fait** : corrections de bugs sur tous les CMS ; rattrapage de la
  compatibilité ; mise en conformité et publication des plugins et
  applications sur les stores officiels des éditeurs, selon leurs normes ;
  apprentissage sur le tas de l'installation et du fonctionnement de chaque
  CMS et SaaS.
- **Ensuite** : une fois l'urgence passée, rattrapage de la dette technique et
  mise en place des tests (PHPUnit, Vitest, Playwright), désormais à chaque PR.
  Puis transmission au développeur recruté.
- **Volume** : 398 tickets traités par Michael, contre 156 pour le deuxième de
  l'équipe et 278 pour le premier des autres équipes.
  Source : Jira. Tickets **résolus** par Michael, support et développement,
  dont au moins **trois quarts impliquant du développement**. Période : depuis
  la création de l'équipe actuelle, environ **deux ans** — donc **après** la
  période d'urgence de 2022-2023. Comparaisons mesurées sur la même période et
  le même filtre. **Non publié** (règle des chiffres ci-dessous).
  Publication recommandée : le chiffre propre de Michael avec son périmètre ;
  la comparaison avec les collègues réservée à l'entretien.

Règles de rédaction pour ce cas :

- Formulation publique : « repris un périmètre sans passation ». Rien sur les
  départs de l'équipe précédente : c'est l'histoire interne de l'employeur
  actuel, pas celle de Michael.
- **Décision de priorisation** : d'abord les problèmes qui touchaient les
  marchands (risque de départ client), ensuite le rattrapage de compatibilité.
  **Exception** : l'application Shopify, passée en tête après un avertissement
  de retrait de l'app store pour non-conformité.
  Non-conformité : **API dépréciée** et **taux d'erreur élevé sur les
  webhooks**. Délai imposé : **1 mois**. Réalisé en **2 semaines**, sans
  connaissance préalable de Shopify ni de son écosystème d'applications.
  Issue : **application remise en conformité et maintenue** ; Michael a
  contacté le support Shopify pour accélérer la revue.

- **Erreurs d'intégration — causes racines** (plugins, webhooks) :
  incompatibilités de version PHP ; timeouts selon la configuration du serveur
  marchand, la taille du catalogue ou le flux d'import de commandes.
  **Diagnostic** : logs des plugins, reproduction locale, puis Datadog. Les
  dashboards partenaires des éditeurs ne suffisaient pas (rétention courte,
  guère plus qu'un code d'erreur). **Correctif** : comportement adaptatif,
  mise aux normes, rétrocompatibilité sur une plage de versions, et
  dépréciation progressive des versions que les éditeurs eux-mêmes ne
  supportaient plus. **Résultat** : plus aucune erreur liée à ces causes
  racines, avec surveillance des nouvelles.
- Ne pas mettre en avant les heures supplémentaires : c'est un coût, pas une
  méthode.

### B — Centraliser la récupération des commandes (candidat)

Déclaré par Michael le 2026-09-25 :

- Nouveau projet qui reprend toute la logique de l'ancien « downloader » :
  une vraie rétention des erreurs pour le périmètre, de nouveaux connecteurs,
  et la **migration de la partie commandes** depuis le projet legacy.
- **Parallélisation** des appels, et **adaptation au forfait du marchand** :
  le nombre d'appels suit la capacité de son quota d'API (seau de jetons).
- **Migration d'un plugin PrestaShop lourd vers une intégration headless**
  centralisée dans ce projet : plus de contrôle sur le code et les logs, et
  plus de code personnalisé à maintenir sur les serveurs des marchands.
- Pages de configuration côté front, selon les maquettes produit et UX.

- **Stack** : PHP / Symfony.
- **Conception** : décision d'équipe de repartir sur une architecture propre
  (« clean architecture »).
- **Part de Michael** (déclarée) : il a écrit la parallélisation, la gestion
  des quotas par forfait, la migration des commandes, les connecteurs et le
  front de configuration.

- **Fenêtres d'import des commandes** : avant, une tâche toutes les 30 minutes
  qui importait 3 jours de commandes. Après : une tâche toutes les 5 minutes
  sur 15 minutes de commandes, plus une tâche quotidienne sur 3 jours en
  filet de sécurité. **Commandes importées en retard ou non mises à jour : ~12 % → ~0,1 %.**
  Mesure : Datadog et requête SQL. ⟨À CONFIRMER : période de mesure⟩
  **Causes (déclarées)** : (1) le volume d'une fenêtre de 3 jours faisait
  parfois tomber le serveur en timeout ; (2) une logique de verrou antérieure à
  l'arrivée de Michael bloquait les imports quand ils s'enchaînaient, créant
  des décalages et des fenêtres sans aucun import.
  Précisions : le verrou ne restait pas bloqué ; les imports **se
  chevauchaient**. Une commande « manquée » = **importée en retard**, ou plus
  rarement **pas mise à jour** — pas perdue. Formulation publique : « commandes
  importées en retard ou non mises à jour », jamais « commandes perdues ».
- **Parallélisation** : côté **catalogue** (pas commandes) — **~20 % de gain**
  sur le temps de téléchargement. ⟨À CONFIRMER : comment c'est mesuré⟩
- **Migration** : Shopify — migration du parc de marchands commencée, environ
  la moitié faite (chiffres exacts inconnus). Plugins : développement terminé,
  **en phase de tests d'intégration** — pas encore en production. À écrire
  comme « en cours ».
- **Diagnostic** : avec les logs conservés, un ticket entamé le matin est traité
  dans la journée.
- Erreurs restantes : nouveaux cas, et changements non annoncés d'une autre
  équipe dont le périmètre dépend ; beaucoup moins qu'avant.

- **Décision** : se rapprocher au maximum d'un fonctionnement événementiel
  (event-driven). Les API des marketplaces ne fournissent pas ce qu'il faut
  pour être notifié : l'événementiel pur (webhooks) est donc écarté par
  contrainte. D'où un sondage à fenêtre courte et fréquente (5 min / 15 min),
  qui s'en approche, plus un rattrapage quotidien sur 3 jours pour la
  complétude.

- **Ce qu'il ferait autrement** : prendre plus de temps au départ pour coller
  au plus près de la clean architecture visée ; l'écart se résorbe depuis.

### Autres faits déclarés (matière d'appoint)

- **Rôle de référent sur le périmètre** : formation des collègues à
  l'utilisation des plugins et applications ; rédaction des instructions ;
  validation des décisions techniques ; initiatives.
  ⟨À CONFIRMER : qui était formé (support, commerciaux, marchands ?) ; ce que
  recouvrent « instructions » et « validation des décisions »⟩

- Remontée de problèmes dans le code ou la logique d'autres équipes dont le
  périmètre dépend, pour accélérer leur résolution.
- **Scripts de crise** : par exemple, quand l'infrastructure tombe et que les
  marchands ne reçoivent plus de commandes, un script qui rappelle les
  endpoints pour rattraper le retard. ⟨À CONFIRMER : candidat au récit
  d'incident — date, durée, volume rattrapé⟩
- Documentation technique réécrite ou créée, pour que la perte de connaissance
  ne se reproduise pas.
- Propositions de maquettes présentées en local.

### Règle sur les dates des réalisations (décision 2026-09-25)

Les dates précises des projets (cas A et B, épisode Shopify, période seul sur
le périmètre, création de l'équipe) **ne sont pas publiées** : Michael les
réserve à l'entretien. Les récits se situent par rapport à la chronologie
publique (« à mon arrivée », « depuis ») sans date inventée.

### Règle de distance avec l'employeur (décision 2026-09-25)

Michael tient à rester discret sur son employeur. Les études de cas Lengow
n'ont **pas de bloc « Preuve »**, et aucune surface ne parle du code de
l'employeur (ni « code propriétaire », ni « détail en entretien »).

### Règle de neutralité des études de cas (décision 2026-09-25)

Michael veut rester le plus neutre possible et ne jamais donner l'impression de
se plaindre. Dans les études de cas : pas de nom d'employeur (« une plateforme
SaaS e-commerce »), pas de « sans passation », pas de description de l'état du
produit, pas d'épisode qui expose l'entreprise (l'avertissement de retrait
devient « une mise en conformité exigée par l'éditeur d'une plateforme »).
Récit au présent, centré sur ce que Michael fait et décide. Lengow reste nommé
dans le parcours, où c'est un fait public.

### Règle de présentation des chiffres (décision 2026-09-25)

Michael ne veut pas d'un site qui « affiche des stats ». Règle retenue :

- **Aucune tuile de chiffres, aucun compteur, aucun tableau de KPI.**
- **Aucun pourcentage** (décision du 2026-09-25, après le cas B) : le résultat
  se dit en mots — « ont quasiment disparu » — et le chiffre se garde pour
  l'oral.
- Un chiffre n'apparaît **que dans une phrase de récit**, là où il explique une
  décision — au plus un par étude de cas.
- Les chiffres internes de l'équipe (nombre de tickets, comparaisons avec des
  collègues) **ne sont pas publiés** : ils servent en entretien.
- Tous les chiffres restent consignés ici : Michael doit pouvoir les défendre à
  l'oral, publiés ou non.

## 5. Récit de débogage

**Les imports de commandes qui se chevauchaient** — voir cas B : une fenêtre
de 3 jours toutes les 30 minutes faisait tomber des serveurs en timeout, les
imports se chevauchaient et bloquaient la file, d'où des retards. Diagnostic
par Datadog et SQL ; correction par deux cadences. Complété par les causes
racines des erreurs d'intégration du cas A (versions PHP, timeouts selon le
serveur marchand).

## 6. Contacts vérifiés

| Canal | Valeur | Statut |
|---|---|---|
| E-mail affiché | `masmichael280699@gmail.com` (choix de Michael, « pour l'instant ») | ⟨À CONFIRMER : test d'envoi réel de bout en bout, via le formulaire du site une fois en place⟩ |
| LinkedIn | https://www.linkedin.com/in/michaelmasdev | ✅ fourni par Michael — ⟨À CONFIRMER : séparer les deux intitulés Lengow sur le profil avant mise en ligne⟩ |
| GitHub | https://github.com/michael-mas | ✅ fourni par Michael |

Adresses de l'ancien site **non reprises** : `michael@mas.dev`,
`contact@michaelmas.dev`, `michaelmas77@gmail.com`. Pas de Calendly (cible :
poste salarié).

## 7. Cible de recherche

Validé par Michael le 2026-09-25 :

- **Positionnement du site** : développeur full stack confirmé — **PHP/Symfony
  et React/TypeScript** —, spécialiste des intégrations e-commerce.
- React : travail sur le front React de la solution, qui pilote la
  configuration des plugins et applications ; aide ponctuelle à d'autres
  équipes front.
- **Candidatures** : large (« tout poste où le développement est
  primordial ») ; le site, lui, porte un seul message.
- Priorités conseillées : éditeurs SaaS B2B de l'écosystème e-commerce,
  entreprises produit en PHP/Symfony. Pas de poste de lead pour l'instant.
- Le site n'emploie jamais « senior » ni « lead » : il donne les faits.

- **Géographie** : Nantes sur site, hybride ou full remote.
- **Statut** : **en recherche active.**

- **Langues du site** : **français et anglais.** Niveaux déclarés : français
  courant ; anglais bon à l'oral, très bonne compréhension écrite et orale.
  Vietnamien et espagnol souhaités mais **non parlés** : aucune version dans ces
  langues (un site dans une langue promet qu'on peut y travailler).
  L'architecture reste ouverte à d'autres langues.

- **Critères** : ouvert à tout type de mission, à condition qu'elle soit
  exigeante techniquement. Conséquence éditoriale : le site met en avant les
  problèmes résolus (cas A et B), pas le volume de support.

- **Mobilité** : déménagement envisageable pour une opportunité importante.

---

## Journal des réponses

- **2026-09-25** — Lengow : entrée le 2022-09-06 (*Software Support Developer*),
  *Software Developer* depuis le 2023-10-01, CDI, Nantes, en poste.
- **2026-09-25** — Avant Lengow : chronologie datée depuis le profil transmis
  par Michael (2012 → 2022). Pas de freelance. AFPA : bloc front-end validé.
  Restent : l'année du bac, Fidelia.
- **2026-09-25** — 2016-11 → 2019-03 : missions courtes (restauration,
  manutention, garde d'enfants). Premiers essais de code pendant cette période,
  à préciser.
- **2026-09-25** — Code : essai Python en 2017 (OpenClassrooms), non abouti.
  Apprentissage réel pendant l'AFPA, largement seul. Projet : site e-commerce
  avec back-office Symfony + React pour une boucherie.
- **2026-09-25** — Le site boucherie est un projet de formation, jamais mis en
  production (le commerçant ne l'a pas adopté). La stratégie « aucun projet
  produit livré » reste exacte.
- **2026-09-25** — Périmètre Lengow : plugins CMS (PrestaShop, Magento 1/2,
  WooCommerce, Shopware 5/6, Shopify), front Symfony + React, applications
  Amazon / Thron / Akeneo, puis API marketplaces et Core en Django. Docker,
  PostgreSQL, Redis, RabbitMQ, Datadog, Kubernetes. Seul ~1 an sur le
  périmètre plugins, puis transmission.
- **2026-09-25** — Tri des compétences (voir § 3). Deux points ouverts :
  contradiction Python ② / Django ~①, et tests automatisés non renseignés.
- **2026-09-25** — PHP jusqu'à 8.4. Python et Django : lecture seule, aucune
  PR (la réponse « ① » précédente était une erreur de saisie).
- **2026-09-25** — SQL gardé visible (choix de Michael), formulé sur l'usage
  réel. Tests : PHPUnit, Vitest, trois niveaux, à chaque PR désormais.
- **2026-09-25** — Tests mis en place seul, avec Playwright pour le bout en
  bout, après une période d'urgence ; rattrapage de dette technique. SQL :
  requêtes courantes écrites, requêtes complexes peu pratiquées.
- **2026-09-25** — Réalisation A : reprise du périmètre plugins sans passation,
  bugs d'import de commandes et d'export catalogue, rattrapage de
  compatibilité, publication sur les stores des éditeurs. 398 tickets contre
  156 et 278 (source à préciser).
- **2026-09-25** — Les 398 tickets : Jira, résolus, ~¾ avec développement, sur
  ~2 ans depuis la création de l'équipe actuelle ; comparaisons sur le même
  filtre.
- **2026-09-25** — Priorisation pendant l'urgence : marchands d'abord, puis
  compatibilité ; exception Shopify (avertissement de retrait pour
  non-conformité).
- **2026-09-25** — Shopify : API dépréciée + taux d'erreur élevé sur les
  webhooks ; 1 mois accordé, fait en 2 semaines sans connaître Shopify ; app
  maintenue, support Shopify sollicité pour accélérer.
- **2026-09-25** — Causes racines des erreurs d'intégration (PHP, timeouts
  selon serveur / catalogue / flux) et méthode (logs, reproduction, Datadog).
  Réalisation B candidate : centralisation de la récupération des commandes
  (parallélisation, quotas par forfait, PrestaShop headless). Scripts de crise,
  documentation.
- **2026-09-25** — Cas B : PHP / Symfony, architecture décidée en équipe ;
  Michael a écrit parallélisation, quotas, migration des commandes,
  connecteurs, front de configuration.
- **2026-09-25** — Cas B, résultats : commandes manquées ~12 % → ~0,1 %
  (fenêtres 5 min / 15 min + filet quotidien sur 3 jours, contre 30 min / 3 jours
  avant) ; parallélisation catalogue ~20 % plus rapide ; migration Shopify à
  mi-parcours ; plugins en tests d'intégration ; diagnostic dans la journée.
- **2026-09-25** — Règle : pas de stats affichées ; au plus un chiffre par cas,
  dans le texte ; tickets et comparaisons réservés à l'entretien.
- **2026-09-25** — Cas B complet (hors dates) : décision « au plus près de
  l'événementiel » faute d'API de notification côté marketplaces ; commandes en
  retard ou non mises à jour, pas perdues ; imports qui se chevauchaient ; à
  refaire : plus de temps pour la clean architecture au départ.
- **2026-09-25** — Positionnement validé : full stack confirmé PHP/Symfony +
  React/TypeScript, spécialiste des intégrations e-commerce ; candidatures
  larges.
- **2026-09-25** — E-mail affiché : masmichael280699@gmail.com. Anciennes
  adresses abandonnées.
- **2026-09-25** — LinkedIn : linkedin.com/in/michaelmasdev ; GitHub :
  github.com/michael-mas.
- **2026-09-25** — Nantes, hybride ou remote ; recherche active.
- **2026-09-25** — Langues : FR + EN. Vietnamien et espagnol écartés (non
  parlés).
- **2026-09-25** — Ouvert à tout, pourvu que ce soit exigeant. Le site met en
  avant les problèmes résolus plutôt que le volume de support.
- **2026-09-25** — Bac ~2012 ; Fidelia 2019 (à recouper avec ACS) ; présentiel
  aujourd'hui ; mobilité possible pour une grosse opportunité. Dates des
  projets : non publiées, réservées à l'entretien.
- **2026-09-25** — **PARCOURS validé par Michael.** Complément : rôle de
  référent (formation des collègues, instructions, validation des décisions,
  initiatives).
