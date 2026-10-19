# Movie Library - TP3 Projet Interface

Application Vue.js pour chercher des films avec l'API TMDB, les ajouter à une bibliothèque personnelle (rangée sur des étagères de DVD), gérer ses favoris et suivre ce qu'on a vu.

**Figma (persona, wireframes, prototype) :** https://www.figma.com/design/LFcrY5xVptKjuiHoc3eXnN/TP3--Project-Design

## Technologies

- Vue 3 + Vite + TypeScript
- Vue Router : `/`, `/library`, `/favorites`, `/movie/:id`
- Vuex : state, getters, mutations, actions ([src/store/index.ts](src/store/index.ts))
- localStorage : la bibliothèque est sauvegardée à chaque modification et rechargée au démarrage
- Tailwind CSS

## API utilisée

[TMDB (The Movie Database)](https://developer.themoviedb.org/docs), API v3 ([src/api/tmdb.ts](src/api/tmdb.ts)) :

| Endpoint | Utilisation |
|---|---|
| `/trending/movie/week` | films à la une sur l'écran d'accueil |
| `/search/movie` | recherche (titre, année, affiche), paginée |
| `/movie/{id}/credits` | réalisateur de chaque résultat |
| `/movie/{id}?append_to_response=credits` | page détail (synopsis, durée, genres, casting) |
| `/movie/{id}/recommendations` | « You might also like » |

## Installation

Prérequis : [Node.js](https://nodejs.org/) 22.18+ ou 24.12+.

1. Installer les dépendances :
   ```sh
   npm install
   ```
2. Obtenir une clé API TMDB gratuite : créer un compte sur [themoviedb.org](https://www.themoviedb.org/), puis *Settings → API*. Prendre la **API Key (v3)** (comme Application URL, `http://localhost:5173` suffit).
3. Copier `.env.example` en `.env` et y mettre la clé :
   ```
   TMDB_KEY=votre_cle
   ```
   `.env` est ignoré par Git : ne jamais mettre la clé dans `.env.example`. La clé n'est jamais envoyée au navigateur : le front appelle `/tmdb/...` et c'est le serveur (Vite en dev, nginx dans Docker) qui relaie vers TMDB en ajoutant la clé.
4. Lancer le serveur de développement, puis ouvrir http://localhost:5173 :
   ```sh
   npm run dev
   ```

> Sous Windows, si PowerShell affiche « l'exécution de scripts est désactivée », lancer une fois
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`, ou utiliser `npm.cmd run dev`.

### Autres commandes

```sh
npm run test:unit   # tests Vitest
npm run build       # vérification des types + build de production
npm run lint        # oxlint + eslint
```

## Déploiement avec Docker

Une image prête à l'emploi est publiée sur le GitHub Container Registry. Avec [Docker](https://docs.docker.com/get-docker/) installé, une seule commande suffit :

```sh
docker run -d -p 8080:80 -e TMDB_KEY=votre_cle ghcr.io/vectra777/tp3-projet-interface:latest
```

Puis ouvrir http://localhost:8080. La clé TMDB est donnée au lancement du conteneur : l'image n'en contient aucune, et elle reste côté serveur (nginx l'ajoute aux requêtes vers TMDB).

Pour construire l'image soi-même :

```sh
docker build -t movie-library .
docker run -d -p 8080:80 -e TMDB_KEY=votre_cle movie-library
```

## Intégration continue

Le workflow [.github/workflows/ci.yml](.github/workflows/ci.yml) tourne à chaque push et pull request :

1. **checks** : lint (oxlint + eslint), tests Vitest, vérification des types et build
2. **docker** (push sur `main` ou tag `v*` uniquement, si les checks passent) : construit l'image et la publie sur `ghcr.io/vectra777/tp3-projet-interface` avec les tags `latest`, `sha-<commit>` et la version pour un tag `v1.2.3`

## Fonctionnalités

**Principales**
- Recherche de films : titre, réalisateur, année, affiche, avec ajout direct à la bibliothèque
- Bibliothèque `/library` : voir, supprimer, marquer vu / pas vu, ajouter aux favoris
- Favoris `/favorites` (getter Vuex `favorites`)
- Persistance avec localStorage

**Comptes utilisateurs**
- Page `/login` : création de compte et connexion. Toutes les autres pages demandent d'être connecté (garde Vue Router).
- Chaque utilisateur a sa propre bibliothèque et ses propres favoris (`library:<nom>` dans localStorage). La session reste ouverte après un rafraîchissement.
- Les comptes sont **locaux au navigateur**, sans serveur. Le mot de passe est haché en SHA-256, ce qui évite de le stocker en clair mais ne remplace pas une vraie authentification côté serveur.

**Avancées (Part 6)**
1. **Page détail** `/movie/:id` : synopsis, durée, genres, casting, recommandations
2. **Note personnelle** de 1 à 5 étoiles, affichée sur l'étagère et dans les favoris
3. **Avis personnel** (texte) sauvegardé dans localStorage
4. **Statistiques** : total, vus, restants, favoris, note moyenne
5. **Meilleure expérience API** : indicateur de chargement, message d'erreur, état « No results found », bouton « Load more », pas de doublons dans la bibliothèque
6. **Filtres et tri** dans la bibliothèque (getter Vuex `view`) : recherche par titre ou réalisateur, filtre favoris / vus / à voir, tri par titre, année ou date d'ajout
7. **UI/UX** : confirmation avant suppression, états vides de la bibliothèque et des favoris, glisser-déposer pour réorganiser les étagères, animations et sons
