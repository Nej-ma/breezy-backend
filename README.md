# Breezy - Architecture Microservices

Une plateforme sociale moderne construite avec une architecture microservices.

## Architecture

Notre application est divisee en 5 microservices independants :

### Auth Service (Port 3001)
* Authentification et autorisation
* Gestion des tokens JWT
* Reset de mot de passe
* Verification d'email

### User Service (Port 3002)
* Gestion des profils utilisateurs
* Systeme de suivi (follow/unfollow)
* Validation des comptes

### Post Service (Port 3003)
* Creation et gestion des posts
* Systeme de commentaires
* Systeme de likes
* Gestion des tags

### Notification Service (Port 3004)
* Notifications en temps reel
* Messages prives
* Alertes systeme

### API Gateway (Port 3000)
* Point d'entree unique
* Routage des requetes
* Authentification centralisee
* Rate limiting

## Demarrage Rapide
Pour demarrer l'application, utilisez Docker Compose :

```bash
docker-compose up --build
```
## Tests
Pour executer les tests, utilisez la commande suivante :
```bash
docker exec [container_name] npm test
```
