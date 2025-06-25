# Breezy - Architecture Microservices

Une plateforme sociale moderne construite avec une architecture microservices.

## Architecture

Notre application est divisee en 5 microservices **INDEPENDANTS** :

### Auth Service (Port 3001)
* Authentification et autorisation
* Gestion des tokens JWT
* **Validation centralisée des tokens** (endpoint /auth/validate-token)
* Reset de mot de passe
* Verification d'email
* **Base de données:** MongoDB Auth (indépendante)

### User Service (Port 3002)
* Gestion des profils utilisateurs
* Systeme de suivi (follow/unfollow)
* Validation des comptes
* **Base de données:** MongoDB Users (indépendante)
* **Authentification:** Appels HTTP vers Auth Service pour validation tokens

### Post Service (Port 3003)
* Creation et gestion des posts
* Systeme de commentaires
* Systeme de likes
* Gestion des tags
* **Base de données:** MongoDB Posts (indépendante)
* **Authentification:** Appels HTTP vers Auth Service pour validation tokens

### Notification Service (Port 3004)
* Notifications en temps reel
* Messages prives
* Alertes systeme
* **Base de données:** MongoDB Notifications (indépendante)
* **Authentification:** Appels HTTP vers Auth Service pour validation tokens
* **Communication:** WebSocket + HTTP vers autres services

### API Gateway (Port 3000)
* Point d'entree unique
* Routage des requetes
* Authentification centralisee via Auth Service
* Rate limiting
* Documentation Swagger unifiee

## Principes Microservices Respectés

### ✅ Indépendance Complète
- Chaque service a sa propre base de données
- Chaque service peut être déployé indépendamment
- **Aucun code partagé** (suppression du dossier shared)
- **Authentification distribuée** via appels HTTP

### ✅ Communication Inter-Services
- Communication via HTTP/REST uniquement
- Authentification centralisée dans auth-service
- Validation des tokens via endpoint dédié
- Pas de dépendances directes entre services

### ✅ Sécurité Distribuée
- Tokens JWT signés et vérifiés par auth-service
- Validation utilisateur centralisée
- Cache local optionnel pour performances
- Gestion d'erreurs résiliente

## Architecture de Communication

```
Frontend (React/Vue/Angular)
    ↓
API Gateway (Port 3000)
    ↓
┌─────────────────────────────────────────────────────┐
│  Auth Service     User Service     Post Service     │
│  (Port 3001)      (Port 3002)      (Port 3003)     │
│       ↓               ↓               ↓            │
│  MongoDB Auth    MongoDB Users   MongoDB Posts     │
│       ↑               ↑               ↑            │
│       └───────────────┼───────────────┘            │
│                 Token Validation                   │
└─────────────────────────────────────────────────────┘
    ↓
Notification Service (Port 3004)
    ↓
MongoDB Notifications + WebSocket
    ↑
Token Validation via Auth Service
```

## Flux d'Authentification

1. **Login:** Frontend → API Gateway → Auth Service
2. **Token Generation:** Auth Service génère JWT
3. **API Calls:** Frontend → API Gateway → Service avec token
4. **Token Validation:** Service → Auth Service (/auth/validate-token)
5. **Response:** Auth Service retourne user info ou erreur

## Demarrage Rapide
Pour demarrer l'application, utilisez Docker Compose :

```bash
# Supprimer l'ancien dossier shared
rm -rf microservices/shared

docker-compose up --build
```

## Tests
Pour executer les tests, utilisez la commande suivante :
```bash
# Tests d'un service spécifique
docker exec breezy-auth-service npm test
docker exec breezy-user-service npm test

# Tests de tous les services
npm run test
```

## Monitoring
- Health checks: `GET /health` sur chaque service
- Status global: `GET http://api.breezy.website/
- Documentation: `http://api.breezy.website/docs`
